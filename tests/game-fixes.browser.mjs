import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fallbackContent } from '../src/lib/content.js';
import { triviaResult } from '../src/lib/session.js';

const browser = await chromium.launch({ headless: true, executablePath: process.env.PAYOPOLY_CHROMIUM ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const origin = process.env.PAYOPOLY_TEST_URL ?? 'http://127.0.0.1:5173';
const mock = await readFile(new URL('./firebase-browser-mock.js', import.meta.url), 'utf8');
await context.route(/\/node_modules\/\.vite\/deps\/firebase_database\.js/, r => r.fulfill({ contentType: 'text/javascript', body: mock }));
await context.route('**/src/lib/identityStorage.js', r => r.fulfill({ contentType: 'text/javascript', body: 'export const identityStorage = sessionStorage;' }));
const requests = [];
await context.route('**/api/**', r => {
  const request = r.request();
  requests.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() });
  return r.fulfill({ json: new URL(request.url()).pathname === '/api/rhymes'
    ? { seed: 'Beat', valid: ['FEET', 'MEET', 'GREET', 'SWEET', 'STREET', 'SEAT', 'TREAT', 'NEAT', 'EAT', 'HEAT', 'SHEET', 'WHEAT', 'CHEAT', 'REPEAT', 'COMPLETE', 'DELETE', 'DEFEAT'] }
    : fallbackContent(new URL(request.url()).pathname, 'en') });
});
const ids = ['host', 'guest', 'spectator'];
const errors = [];
const pages = await Promise.all(ids.map(async id => {
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(id => { sessionStorage.setItem('payopoly_FIX123', id); localStorage.setItem('payopoly_language', 'en'); }, id);
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  return page;
}));
const [host, guest, spectator] = pages;
let serial = 0;
async function state() { return host.evaluate(() => JSON.parse(localStorage.getItem('payopoly-test-db')).games.FIX123); }
async function until(predicate) {
  for (let i = 0; i < 80; i++) {
    if (await predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${JSON.stringify((await state()).currentMinigame)}`);
}
async function phase(value) { await until(async () => (await state()).currentMinigame?.phase === value); }
async function patch(updates) {
  await host.evaluate(updates => navigator.locks.request('payopoly-test-db', () => {
    const db = JSON.parse(localStorage.getItem('payopoly-test-db'));
    if (updates.phase) updates.phaseStartedAt = Date.now();
    Object.assign(db.games.FIX123.currentMinigame, updates);
    localStorage.setItem('payopoly-test-db', JSON.stringify(db)); window.__testEmit?.();
  }), updates);
}
async function seed(name, type, phase, extra = {}) {
  const id = `fixes:${++serial}`;
  const room = {
    status: 'play', hostId: 'host', settings: { rounds: 3, language: 'en', preset: 'classic', scoring: 'dice' },
    players: Object.fromEntries(ids.map(id => [id, { name: id, points: 0, categories: id === 'host' ? ['Nature', 'Music'] : ['Animals'] }])),
    presence: Object.fromEntries(ids.map(id => [id, { test: { online: true, lastSeen: Date.now() } }])),
    playerOrder: ids, totalTurns: 9, turnsPlayed: 0,
    currentTurn: { id, playerId: 'host', phase: 'playing', minigameType: type, minigame: name, startedAt: Date.now() },
    currentMinigame: { id, name, type, tPlayerId: 'host', pPlayerId: type === 'duel' ? 'guest' : null, phase,
      phaseStartedAt: Date.now(), countdownStartedAt: Date.now(), diceValue: 4, difficulty: 4, pointsValue: 4, ...extra },
  };
  await host.evaluate(room => navigator.locks.request('payopoly-test-db', () => {
    localStorage.setItem('payopoly-test-db', JSON.stringify({ games: { FIX123: room } })); window.__testEmit?.();
  }), room);
  await Promise.all(pages.map(p => p.goto(`${origin}/game/FIX123/minigame`, { waitUntil: 'domcontentloaded' })));
}
async function visibleAll(value) { await Promise.all(pages.map(p => p.getByText(value, { exact: true }).first().waitFor())); }
async function hidden(page, value) { assert.equal(await page.getByText(value, { exact: true }).count(), 0, value); }
async function bottom(page) { return page.locator('.guess-feed').evaluate(el => el.scrollHeight - el.clientHeight - el.scrollTop < 3); }
async function mobile() { for (const page of pages) assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); }
const taboo = { category: 'Nature', tabooWord: 'UMBRELLA', forbiddenWords: ['RAIN', 'WET', 'HANDLE', 'OPEN', 'WEATHER'] };
try {
  await seed('Mot Interdit', 'all', 'word_reveal', taboo);
  for (const p of [guest, spectator]) for (const word of ['UMBRELLA', 'RAIN']) await hidden(p, word);
  await host.getByRole('button', { name: "Let's go!", exact: true }).click();
  await phase('playing');
  for (const p of [guest, spectator]) for (const word of ['UMBRELLA', 'RAIN']) await hidden(p, word);
  const guesses = Object.fromEntries(Array.from({ length: 45 }, (_, i) => [`g${i}`, { playerId: 'guest', text: `Wrong guess number ${i}`, at: i }]));
  await patch({ guesses });
  await until(async () => await guest.locator('.guess-line').count() === 45 && await bottom(guest));
  await guest.locator('.guess-feed').hover(); await guest.mouse.wheel(0, -300);
  await until(async () => !await bottom(guest));
  const scrolled = await guest.locator('.guess-feed').evaluate(el => el.scrollTop);
  guesses.g45 = { playerId: 'spectator', text: 'Another wrong guess', at: 45 };
  await patch({ guesses });
  await guest.getByText('Another wrong guess', { exact: true }).waitFor({ state: 'attached' });
  assert.ok(Math.abs(await guest.locator('.guess-feed').evaluate(el => el.scrollTop) - scrolled) < 2);
  assert.ok(await bottom(host));
  await guest.locator('.guess-feed').hover(); await guest.mouse.wheel(0, 5000);
  await until(async () => await bottom(guest));
  guesses.g46 = { playerId: 'spectator', text: 'Newest guess', at: 46 };
  await patch({ guesses });
  await until(async () => await guest.locator('.guess-line').count() === 47 && await bottom(guest));
  await guest.getByPlaceholder('Your answer...').fill('umbrella');
  await guest.getByRole('button', { name: 'Send', exact: true }).click();
  await phase('voting'); await visibleAll('RAIN'); await visibleAll('UMBRELLA');
  assert.ok(await host.getByRole('button', { name: '✅ Yes', exact: true }).isDisabled());
  await guest.getByRole('button', { name: '✅ Yes', exact: true }).click();
  assert.equal(await spectator.locator('.voted').count(), 0);
  await guest.reload(); await guest.getByText('✓ Vote recorded', { exact: true }).waitFor();
  await spectator.getByRole('button', { name: '✅ Yes', exact: true }).click();
  await phase('complete'); await mobile();
  await host.getByRole('button', { name: 'Continue', exact: true }).click();
  await until(async () => (await state()).history?.length === 1);
  assert.equal((await state()).players.host.points, 4); assert.equal((await state()).players.guest.points, 4);
  console.log('PASS taboo: private words, chat follows/pauses/resumes, listener vote, reload and approved payouts');

  await seed('Mot Interdit', 'all', 'voting', { ...taboo, foundBy: 'guest' });
  await guest.getByRole('button', { name: '✅ Yes', exact: true }).click();
  await spectator.getByRole('button', { name: '❌ No', exact: true }).click();
  await phase('complete'); await visibleAll('Round rejected: no points.');
  await host.getByRole('button', { name: 'Continue', exact: true }).click();
  await until(async () => (await state()).history?.length === 1);
  assert.deepEqual((await state()).history[0].awards, {});
  await seed('Mot Interdit', 'all', 'voting', { ...taboo, foundBy: 'guest', voteDeadline: Date.now() + 300 });
  await phase('complete'); await visibleAll('Round rejected: no points.');
  await seed('Mot Interdit', 'all', 'playing', { ...taboo, countdownStartedAt: Date.now() - 91000 });
  await phase('complete'); await visibleAll('RAIN');
  assert.equal(await guest.locator('.vote-panel').count(), 0);
  console.log('PASS taboo: ties and no votes award zero; unsuccessful rounds reveal without voting');

  await seed('Pictionary', 'all', 'playing', { pictionaryWord: 'GUITAR', category: 'Music' });
  assert.equal(await guest.getByRole('button', { name: 'Finish drawing and vote' }).count(), 0);
  await host.getByRole('button', { name: 'Finish drawing and vote' }).click();
  await phase('voting'); await visibleAll('GUITAR');
  console.log('PASS Pictionary: only the drawer can finish early and move to the existing vote');

  await seed('Bluff', 'all', 'writing', { promptText: 'The real word is ___', trueAnswer: 'Éléphant', submissions: { host: 'a Tiger', guest: 'A TIGER', spectator: 'a lion' } });
  await phase('picking');
  const options = (await state()).currentMinigame.options;
  assert.deepEqual(options.map(o => o.text).sort(), ['A LION', 'A TIGER', 'ÉLÉPHANT']);
  await visibleAll('ÉLÉPHANT');
  await seed('Croquis Croisés', 'all', 'titling', { revealOrder: ['host'], revealIndex: 0, drawWords: { host: 'Guitare' }, submissions: { r0: { guest: 'un Violon', spectator: 'un Piano' } } });
  await phase('picking');
  assert.deepEqual((await state()).currentMinigame.options.r0.map(o => o.text).sort(), ['GUITARE', 'UN PIANO', 'UN VIOLON']);
  await visibleAll('GUITARE');
  console.log('PASS uppercase: generated and player answers match in Bluff and Cross Sketches, including accents and duplicates');

  const triviaQuestions = [0, 1, 2].map(i => ({ q: `Question ${i + 1}`, options: ['A', 'B', 'C', 'D'], answer: i }));
  const answers = values => values.map((answerIndex, questionIndex) => ({ questionIndex, answerIndex, timestamp: Date.now() }));
  const trivia = { tPlayerId: 'host', pPlayerId: 'guest', triviaQuestions, triviaAnswers: { host: answers([1, 1, -1]), guest: answers([0, 1, 2]), spectator: answers([1, 0, 0]) }, countdownStartedAt: Date.now() };
  for (const type of ['all', 'duel']) {
    await seed('Trivia', type, 'results', { ...trivia, ...triviaResult(trivia, type === 'all' ? ids : ['host', 'guest']) });
    for (const p of pages) {
      const matrix = p.locator('.trivia-matrix');
      await matrix.locator('thead th').first().waitFor();
      assert.deepEqual(await matrix.locator('thead th').allTextContents(), ['Player', '1', '2', '3']);
      assert.deepEqual(await matrix.locator('tbody th').allTextContents(), type === 'all' ? ['guest', 'host', 'spectator'] : ['guest', 'host']);
      assert.deepEqual(await matrix.locator('tbody tr').nth(1).locator('td').allTextContents(), ['✕', '✓', '—']);
    }
    await mobile();
  }
  await host.screenshot({ path: '/tmp/payopoly-trivia-matrix.png', fullPage: true });
  console.log('PASS trivia: numbered matrix, sorted scores, per-question correctness and missing answers in both modes');

  await seed('Rimes Rapides', 'duel', 'category_select');
  assert.equal(await guest.getByRole('button', { name: 'Music', exact: true }).count(), 0);
  await host.getByRole('button', { name: 'Nature', exact: true }).waitFor();
  await host.getByRole('button', { name: 'Music', exact: true }).click();
  await phase('seed_reveal'); await visibleAll('BEAT'); await visibleAll('Music');
  assert.deepEqual(requests.find(r => r.path === '/api/rhymes').body, { category: 'Music', difficulty: 4, language: 'en' });
  await host.reload(); await host.getByText('BEAT', { exact: true }).waitFor();
  assert.equal(requests.filter(r => r.path === '/api/rhymes').length, 1);
  console.log('PASS rhymes: challenger chooses their category, request carries it, seed and category survive reload');

  for (const [name, type, author, other, example] of [
    ['Punchline', 'duel', spectator, host, 'My robot has one useless talent: ___.'],
    ['Sondage Éclair', 'all', host, guest, 'forget their own birthday'],
  ]) {
    const authorId = name === 'Punchline' ? 'spectator' : 'host';
    await seed(name, type, 'prompt_select', { promptAuthorId: authorId, examplePrompt: example, promptDeadline: Date.now() + 90000 });
    await author.getByRole('button', { name: 'Lock in my choice', exact: true }).waitFor();
    assert.equal(await other.getByRole('button', { name: 'Lock in my choice', exact: true }).count(), 0);
    await author.locator('#prompt-manual').fill(name === 'Punchline' ? 'A concert without ___.' : 'miss the concert');
    await author.getByRole('button', { name: 'Lock in my choice', exact: true }).click();
    await phase('dice');
    assert.equal((await state()).currentMinigame[name === 'Punchline' ? 'promptText' : 'surveyPrompt'], name === 'Punchline' ? 'A concert without ___.' : 'miss the concert');
  }
  console.log('PASS existing custom prompts: author-only editing and manual selection still work in Punchline and Quick Poll');

  await host.evaluate(() => navigator.locks.request('payopoly-test-db', () => {
    const db = JSON.parse(localStorage.getItem('payopoly-test-db'));
    Object.assign(db.games.FIX123, { status: 'lobby', currentTurn: null, currentMinigame: null });
    localStorage.setItem('payopoly-test-db', JSON.stringify(db)); window.__testEmit?.();
  }));
  await Promise.all(pages.map(p => p.goto(`${origin}/lobby/FIX123`, { waitUntil: 'domcontentloaded' })));
  for (const p of [host, guest]) {
    await p.getByRole('button', { name: /mini-games/i }).click();
    await p.getByRole('dialog').waitFor();
    await p.getByRole('button', { name: /Forbidden Word/ }).click();
    await p.getByText(/Only you see the target and forbidden words/).waitFor();
    await p.keyboard.press('Escape');
    await p.getByRole('dialog').waitFor({ state: 'detached' });
  }
  await mobile(); assert.deepEqual(errors, []);
  console.log('PASS lobby: host and guest can open and close instructions; mobile layout and no runtime errors');
} catch (error) {
  await host.screenshot({ path: '/tmp/payopoly-game-fixes-failure.png', fullPage: true });
  console.error('Host UI:', await host.locator('body').innerText());
  console.error('Guest UI:', await guest.locator('body').innerText());
  throw error;
} finally { await browser.close(); }
