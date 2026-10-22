import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { startPartyGame } from '../src/lib/partyGames.js';
import { memoQuestions, MISSIONS } from '../src/data/partyGames.js';

const browser = await chromium.launch({ headless: true, executablePath: process.env.PAYOPOLY_CHROMIUM ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const origin = process.env.PAYOPOLY_TEST_URL ?? 'http://127.0.0.1:5173';
const mock = await readFile(new URL('./firebase-browser-mock.js', import.meta.url), 'utf8');
await context.route(/\/node_modules\/\.vite\/deps\/firebase_database\.js/, r => r.fulfill({ contentType: 'text/javascript', body: mock }));
await context.route('**/src/lib/identityStorage.js', r => r.fulfill({ contentType: 'text/javascript', body: 'export const identityStorage = sessionStorage;' }));
await context.route('**/api/**', () => { throw new Error('New party games must work without content requests'); });
const ids = ['host', 'guest', 'spectator'];
const errors = [];
const pages = await Promise.all(ids.map(async id => {
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(id => { sessionStorage.setItem('payopoly_PARTY4', id); if (!localStorage.getItem('payopoly_language')) localStorage.setItem('payopoly_language', 'en'); }, id);
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  return page;
}));
const [host, guest, spectator] = pages;
let serial = 0;
async function state() { return host.evaluate(() => JSON.parse(localStorage.getItem('payopoly-test-db')).games.PARTY4); }
async function until(predicate) {
  for (let i = 0; i < 80; i++) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 100)); }
  throw new Error(`Timed out. State: ${JSON.stringify((await state()).currentMinigame)}`);
}
async function phase(value) { await until(async () => (await state()).currentMinigame?.phase === value); }
async function patch(updates) {
  await host.evaluate(updates => navigator.locks.request('payopoly-test-db', () => {
    const db = JSON.parse(localStorage.getItem('payopoly-test-db'));
    Object.assign(db.games.PARTY4.currentMinigame, updates);
    localStorage.setItem('payopoly-test-db', JSON.stringify(db)); window.__testEmit?.();
  }), updates);
}
async function seed(name, extra = {}) {
  const id = `party:${++serial}`;
  const type = name === 'Mission Impossible' ? 'duel' : 'all';
  const room = {
    status: 'play', hostId: 'host', settings: { rounds: 3, language: 'en', preset: 'classic', scoring: 'dice' },
    players: Object.fromEntries(ids.map(id => [id, { name: id, points: 0 }])),
    presence: Object.fromEntries(ids.map(id => [id, { test: { online: true, lastSeen: Date.now() } }])),
    playerOrder: ids, totalTurns: 9, turnsPlayed: 0,
    currentTurn: { id, playerId: 'host', opponentId: type === 'duel' ? 'guest' : null, phase: 'playing', minigameType: type, minigame: name, startedAt: Date.now() },
    currentMinigame: { id, name, type, tPlayerId: 'host', pPlayerId: type === 'duel' ? 'guest' : null, diceValue: 4, pointsValue: 4,
      phaseStartedAt: Date.now(), ...startPartyGame(name, ids, 'en', () => 0), ...extra },
  };
  await host.evaluate(room => navigator.locks.request('payopoly-test-db', () => {
    localStorage.setItem('payopoly-test-db', JSON.stringify({ games: { PARTY4: room } })); window.__testEmit?.();
  }), room);
  await Promise.all(pages.map(page => page.goto(`${origin}/game/PARTY4/minigame`, { waitUntil: 'domcontentloaded' })));
}
async function text(page, value) { await page.getByText(value, { exact: false }).first().waitFor(); }
async function hidden(page, value) { assert.equal(await page.getByText(value, { exact: false }).count(), 0, `Secret unexpectedly visible: ${value}`); }
async function mobile() { for (const page of pages) assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); }
try {
  await seed('Choix Unique');
  await host.getByRole('button', { name: /The hideaway/ }).click();
  await text(host, 'Pick locked');
  assert.equal(await guest.locator('.lane-option.voted').count(), 0);
  assert.equal(await spectator.locator('.lane-option.voted').count(), 0);
  await host.reload(); await text(host, 'Pick locked');
  assert.equal(await host.getByRole('button', { name: /The jackpot/ }).isDisabled(), true);
  await guest.getByRole('button', { name: /The jackpot/ }).click();
  await spectator.getByRole('button', { name: /The jackpot/ }).click();
  await phase('results');
  assert.deepEqual((await state()).currentMinigame.awards, { host: 2 });
  await text(guest, 'Collision · 0 points'); await mobile();
  await host.getByRole('button', { name: 'Continue', exact: true }).click();
  await until(async () => (await state()).history?.length === 1);
  assert.equal((await state()).players.host.points, 2);
  console.log('PASS unique lanes: hidden, immutable, reload, collisions and final payout');

  await seed('Choix Unique', { lanePicks: { guest: 2 }, phaseStartedAt: Date.now() - 41000 });
  await phase('results');
  assert.deepEqual((await state()).currentMinigame.awards, { guest: 4 });
  console.log('PASS unique lanes: absent-player deadline');

  await seed('Mission Impossible');
  await host.getByRole('button', { name: 'Show my secret mission' }).click();
  await text(host, MISSIONS[0].objectives[0].en);
  await hidden(host, MISSIONS[0].objectives[1].en);
  await hidden(guest, MISSIONS[0].objectives[0].en);
  await hidden(spectator, MISSIONS[0].objectives[0].en);
  await guest.getByRole('button', { name: 'Show my secret mission' }).click();
  await text(guest, MISSIONS[0].objectives[1].en);
  await hidden(spectator, MISSIONS[0].objectives[1].en);
  await host.getByRole('button', { name: 'I read my mission · ready' }).click();
  await guest.getByRole('button', { name: 'I read my mission · ready' }).click();
  await phase('performing'); await text(spectator, 'Action!');
  await patch({ phaseStartedAt: Date.now() - 46000 });
  await phase('judging');
  for (const page of pages) await text(page, MISSIONS[0].objectives[0].en);
  assert.equal(await host.getByRole('button', { name: 'Confirm both verdicts' }).count(), 0);
  await spectator.getByRole('button', { name: 'host: Yes', exact: true }).click();
  await spectator.getByRole('button', { name: 'guest: No', exact: true }).click();
  await spectator.getByRole('button', { name: 'Confirm both verdicts' }).click();
  await phase('results');
  assert.equal((await state()).currentMinigame.winnerId, 'host');
  await text(guest, 'Mission accomplished'); await mobile();
  console.log('PASS missions: private objectives, shared scene, audience-only judging and reveal');

  await seed('Mission Impossible', { phase: 'judging', phaseStartedAt: Date.now() - 16000 });
  await phase('results');
  assert.deepEqual((await state()).currentMinigame.winnerIds, []);
  await text(host, 'No votes: no points.');
  console.log('PASS missions: missing audience deadline');

  await seed('Code Commun');
  await text(host, 'The digit in position 1');
  await hidden(guest, 'The digit in position 1');
  await hidden(spectator, 'The digit in position 1');
  await text(guest, 'The digit in position 2');
  await hidden(host, 'The digit in position 2');
  await host.getByLabel('The team’s code').fill('1234');
  await host.getByRole('button', { name: 'Try the code' }).click();
  await text(guest, '1234');
  await guest.getByLabel('The team’s code').fill('1111');
  await guest.getByRole('button', { name: 'Try the code' }).click();
  await host.reload(); await text(host, '1111');
  assert.equal((await state()).currentMinigame.codeAttempts.length, 2);
  await spectator.getByLabel('The team’s code').fill('0000');
  await spectator.getByRole('button', { name: 'Try the code' }).click();
  await phase('results');
  assert.deepEqual((await state()).currentMinigame.awards, { host: 4, guest: 4, spectator: 4 });
  await text(host, 'You cracked it together'); await mobile();
  console.log('PASS shared code: distinct clues, shared attempts, reload, leading zero and team rewards');

  await seed('Code Commun', { phaseStartedAt: Date.now() - 66000 });
  await phase('results');
  assert.deepEqual((await state()).currentMinigame.awards, {});
  console.log('PASS shared code: timeout without attempts');

  await seed('Mémo Flash');
  await Promise.all(pages.map(page => page.locator('.memo-scene').waitFor()));
  const scenes = await Promise.all(pages.map(page => page.locator('.memo-scene').innerHTML()));
  assert.equal(new Set(scenes).size, 1);
  assert.equal(await host.locator('.memo-question').count(), 0);
  const sceneBox = await host.locator('.memo-scene').boundingBox();
  const rankingsBox = await host.locator('.score-sheet-trigger').boundingBox();
  assert.ok(sceneBox.y + sceneBox.height < rankingsBox.y, 'The entire study scene must be above the rankings button');
  await host.screenshot({ path: '/tmp/payopoly-memo-study.png', fullPage: true });
  await patch({ phaseStartedAt: Date.now() - 16000 });
  await phase('recalling');
  await Promise.all(pages.map(page => page.locator('.memo-question').first().waitFor()));
  for (const page of pages) assert.equal(await page.locator('.memo-scene').count(), 0);
  await host.reload(); await host.locator('.memo-question').first().waitFor();
  assert.equal(await host.locator('.memo-scene').count(), 0);
  const mg = (await state()).currentMinigame;
  const correct = mg.memoQuestionIds.map(i => memoQuestions(mg.memoScene, 'en')[i].answer);
  for (let p = 0; p < pages.length; p++) {
    for (let i = 0; i < 3; i++) await pages[p].locator('.memo-question').nth(i).getByRole('button').nth(p === 2 ? (correct[i] + 1) % 3 : correct[i]).click();
    await pages[p].getByRole('button', { name: 'Lock in my memories' }).click();
    if (p === 0) {
      await host.reload(); await text(host, 'Answers locked');
      assert.equal(await host.locator('.memo-scene').count(), 0);
      assert.equal(await guest.locator('.memo-options .voted').count(), 0);
    }
  }
  await phase('results');
  assert.deepEqual((await state()).currentMinigame.awards, { host: 4, guest: 4 });
  assert.deepEqual((await state()).currentMinigame.scores, { host: 3, guest: 3, spectator: 0 });
  await host.locator('.memo-scene').waitFor(); await mobile();
  console.log('PASS flash memory: shared illustration, hidden during recall, private answers, reload and scoring');

  await seed('Mémo Flash', { phase: 'recalling', phaseStartedAt: Date.now() - 26000 });
  await phase('results');
  assert.deepEqual((await state()).currentMinigame.awards, {});
  console.log('PASS flash memory: missing answers deadline');

  await seed('Choix Unique', { contentLanguage: 'fr' });
  await Promise.all(pages.map(page => text(page, 'Choose your lane in secret')));
  await host.addInitScript(() => localStorage.setItem('payopoly_language', 'fr'));
  await host.evaluate(() => localStorage.setItem('payopoly_language', 'fr'));
  await host.reload(); await text(host, 'Choisis ta voie en secret');
  await host.screenshot({ path: '/tmp/payopoly-choix-fr.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS French UI, mobile layouts and no runtime errors');
} catch (error) {
  await host.screenshot({ path: '/tmp/payopoly-party-failure.png', fullPage: true });
  console.error(await host.locator('body').innerText());
  throw error;
} finally { await browser.close(); }
