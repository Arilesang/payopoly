import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fallbackContent } from '../src/lib/content.js';

// Three independent identities share the test database, just like three devices.
const browser = await chromium.launch({ headless: true, executablePath: process.env.PAYOPOLY_CHROMIUM ?? '/usr/bin/chromium', args: ['--no-sandbox'] });
const context = await browser.newContext();
const origin = process.env.PAYOPOLY_TEST_URL ?? 'http://127.0.0.1:5173';
const mock = await readFile(new URL('./firebase-browser-mock.js', import.meta.url), 'utf8');
await context.route(/\/node_modules\/\.vite\/deps\/firebase_database\.js/, r => r.fulfill({ contentType: 'text/javascript', body: mock }));
await context.route('**/src/lib/identityStorage.js', r => r.fulfill({ contentType: 'text/javascript', body: 'export const identityStorage = sessionStorage;' }));
await context.route('**/api/**', r => r.fulfill({ json: fallbackContent(new URL(r.request().url()).pathname, 'en') }));
const errors = [];
const pages = await Promise.all(['host', 'guest', 'spectator'].map(async id => {
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(id => { sessionStorage.setItem('payopoly_VIS123', id); localStorage.setItem('payopoly_language', 'en'); }, id);
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  return page;
}));
const [host, guest, spectator] = pages;
const ids = ['host', 'guest', 'spectator'];
let serial = 0;
async function seed(name, type, phase, extra = {}) {
  const id = `visibility:${++serial}`;
  const room = {
    status: 'play', hostId: 'host', settings: { rounds: 3, language: 'en', preset: 'classic', scoring: 'dice' },
    players: Object.fromEntries(ids.map(id => [id, { name: id, points: 0, categories: ['Animals'] }])),
    presence: Object.fromEntries(ids.map(id => [id, { test: { online: true, lastSeen: Date.now() } }])),
    playerOrder: ids, totalTurns: 9, turnsPlayed: 0,
    currentTurn: { id, playerId: 'host', phase: 'playing', minigameType: type, minigame: name, startedAt: Date.now() },
    currentMinigame: { id, name, type, tPlayerId: 'host', pPlayerId: type === 'duel' ? 'guest' : null, phase, phaseStartedAt: Date.now(), countdownStartedAt: Date.now(), diceValue: phase === 'dice' ? null : 4, pointsValue: 4, ...extra },
  };
  await host.evaluate(room => navigator.locks.request('payopoly-test-db', () => { localStorage.setItem('payopoly-test-db', JSON.stringify({ games: { VIS123: room } })); window.__testEmit?.(); }), room);
  await Promise.all(pages.map(p => p.goto(`${origin}/game/VIS123/minigame`, { waitUntil: 'domcontentloaded' })));
}
async function visibleAll(text) { await Promise.all(pages.map(p => p.getByText(text, { exact: false }).first().waitFor())); }
async function hidden(page, text) { assert.equal(await page.getByText(text, { exact: false }).count(), 0, `Unexpected secret: ${text}`); }
async function patch(updates) {
  await host.evaluate(updates => navigator.locks.request('payopoly-test-db', () => {
    const db = JSON.parse(localStorage.getItem('payopoly-test-db'));
    if (updates.phase) updates.phaseStartedAt = Date.now();
    Object.assign(db.games.VIS123.currentMinigame, updates);
    localStorage.setItem('payopoly-test-db', JSON.stringify(db)); window.__testEmit?.();
  }), updates);
}
try {
  const variants = [['solo','Petit Bac'],['duel','Petit Bac'],['duel','Trivia'],['all','Trivia'],['all','Mimes'],['all','Pictionary'],['solo','Mot Melangés'],['all','Sondage Éclair'],['all','Mot Interdit'],['duel','Punchline'],['all','Bluff'],['all','Le Curseur'],['all','Qui a écrit ça'],['duel','Rimes Rapides'],['all','Croquis Croisés'],['all','Choix Unique'],['duel','Mission Impossible'],['all','Code Commun'],['all','Mémo Flash'],['duel','Choix Unique'],['duel','Code Commun'],['duel','Mémo Flash']];
  for (const [type, name] of variants) {
    await seed(name, type, 'dice');
    await host.getByRole('button', { name: 'Roll the die', exact: true }).click();
    await Promise.all(pages.map(p => p.locator('.dice-rolling').waitFor()));
    for (const p of [guest, spectator]) assert.equal(await p.getByRole('button', { name: 'Roll the die', exact: true }).count(), 0);
    await Promise.all(pages.map(p => p.locator('.dice-result-text').waitFor()));
    const results = await Promise.all(pages.map(p => p.locator('.dice-result-text').innerText()));
    assert.equal(new Set(results).size, 1, name);
    console.log(`PASS shared dice: ${type}:${name}`);
  }
  await seed('Mot Melangés', 'solo', 'playing', { category: 'Animals', jumbledWord: 'RITGE', originalWord: 'TIGER' });
  await visibleAll('RITGE');
  for (const p of pages) await hidden(p, 'TIGER');
  await patch({ phase: 'voting' }); await visibleAll('TIGER');

  await seed('Mimes', 'all', 'playing', { category: 'Animals', mimeWord: 'SECRET-MIME' });
  await visibleAll('Animals');
  await host.getByText('SECRET-MIME', { exact: false }).waitFor();
  for (const p of [guest, spectator]) await hidden(p, 'SECRET-MIME');
  await patch({ phase: 'voting' }); await visibleAll('SECRET-MIME');

  await seed('Pictionary', 'all', 'playing', { category: 'Animals', pictionaryWord: 'SECRET-DRAWING' });
  for (const p of [guest, spectator]) await hidden(p, 'SECRET-DRAWING');
  await patch({ phase: 'voting' }); await visibleAll('SECRET-DRAWING');

  await seed('Mot Interdit', 'all', 'playing', { category: 'Animals', tabooWord: 'SECRET-TABOO', forbiddenWords: ['BANNED-ONE', 'BANNED-TWO'] });
  await visibleAll('BANNED-ONE');
  for (const p of [guest, spectator]) await hidden(p, 'SECRET-TABOO');

  const triviaQuestions = [1,2,3].map(i => ({ q: `Public question ${i}`, options: ['Option one','Option two','Option three','Option four'], answer: 2 }));
  await seed('Trivia', 'duel', 'playing', { triviaQuestions });
  await visibleAll('Public question 1');
  assert.equal(await spectator.locator('.trivia-q-text').count(), 3);
  assert.equal(await spectator.getByRole('button', { name: /Option/ }).count(), 0);
  await patch({ phase: 'results' }); await visibleAll('Option three');

  await seed('Bluff', 'all', 'writing', { category: 'Animals', promptText: 'Public bluff prompt', trueAnswer: 'SECRET-TRUTH' });
  await visibleAll('Public bluff prompt');
  for (const p of pages) await hidden(p, 'SECRET-TRUTH');

  await seed('Le Curseur', 'all', 'guessing', { spectrum: { left: 'Cold', right: 'Hot' }, target: 73, clue: 'Public clue' });
  await visibleAll('Public clue');
  assert.equal(await spectator.locator('.spectrum-target').count(), 0);

  await seed('Croquis Croisés', 'all', 'drawing', { drawWords: { host: 'PRIVATE-HOST', guest: 'PRIVATE-GUEST', spectator: 'PRIVATE-SPECTATOR' } });
  for (let i = 0; i < pages.length; i++) {
    await pages[i].getByText(`PRIVATE-${ids[i].toUpperCase()}`, { exact: false }).waitFor();
    for (let j = 0; j < pages.length; j++) if (i !== j) await hidden(pages[i], `PRIVATE-${ids[j].toUpperCase()}`);
  }
  console.log('PASS private words, public prompts and voting reveals');
  // Everyone watches the same wheel, including after a spectator reload.
  await host.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('payopoly-test-db')); const room = db.games.VIS123;
    room.currentMinigame = null; room.currentTurn = { id: 'wheel:shared', playerId: 'host', phase: 'spinning', minigameType: 'duel', startedAt: Date.now() };
    localStorage.setItem('payopoly-test-db', JSON.stringify(db)); window.__testEmit?.();
  });
  await Promise.all(pages.map(p => p.goto(`${origin}/game/VIS123`, { waitUntil: 'domcontentloaded' })));
  await host.getByRole('button', { name: 'Spin!', exact: true }).click();
  await Promise.all(pages.map(p => p.locator('.is-spinning').waitFor()));
  await spectator.reload({ waitUntil: 'domcontentloaded' }); await spectator.locator('.is-spinning').waitFor();
  const wheelResults = await Promise.all(pages.map(p => p.locator('.wheel-result').innerText({ timeout: 8000 })));
  assert.equal(new Set(wheelResults).size, 1);
  assert.deepEqual(errors, []);
  console.log('PASS three-player public content, private words, answer reveals and shared wheel/reload');
} catch (error) {
  console.error(await host.evaluate(() => JSON.parse(localStorage.getItem('payopoly-test-db')).games.VIS123.currentMinigame));
  for (const p of pages) console.error('UI:', await p.locator('body').innerText());
  console.error('Page errors:', errors);
  throw error;
} finally { await browser.close(); }
