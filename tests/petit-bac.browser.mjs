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
async function until(predicate) {
  for (let i = 0; i < 100; i++) { if (await predicate()) return; await new Promise(r => setTimeout(r, 50)); }
  throw new Error('Timed out waiting for saved state');
}
async function currentRoom() { return host.evaluate(() => JSON.parse(localStorage.getItem('payopoly-test-db')).games.VIS123); }
async function enter(page, category, word) {
  await page.getByRole('button', { name: new RegExp(`^${category}`) }).click();
  await page.getByRole('textbox', { name: category, exact: true }).fill(word);
}
const settings = { gameCategories: ['Animals', 'Food'], letter: 'B', bacOrder: ['guest', 'host'] };
try {
  await seed('Petit Bac', 'duel', 'playing', settings);
  await enter(host, 'Animals', 'Bear');
  await until(async () => (await currentRoom()).currentMinigame.bacEntries?.host?.[0] === 'Bear');
  await spectator.getByText('Bear', { exact: true }).waitFor();
  await hidden(guest, 'Bear');
  await enter(guest, 'Animals', 'Bison');
  await until(async () => (await currentRoom()).currentMinigame.bacEntries?.guest?.[0] === 'Bison');
  await spectator.getByText('Bison', { exact: true }).waitFor();
  await hidden(host, 'Bison');
  assert.equal(await spectator.getByRole('textbox').count(), 0);
  for (const id of ids) assert.equal(await spectator.locator('.bac-sets').getByText(id, { exact: false }).count(), 0);
  assert.equal(await spectator.getByRole('region', { name: 'Set A' }).getByText('Bison').count(), 1);
  // Invalid words never become a displayed entry; deleting clears a saved entry.
  await enter(host, 'Food', 'Carrot');
  assert.equal(await host.getByRole('textbox', { name: 'Food', exact: true }).getAttribute('aria-invalid'), 'true');
  await spectator.getByRole('region', { name: 'Set B' }).waitFor();
  await hidden(spectator, 'Carrot');
  await host.getByRole('textbox', { name: 'Food', exact: true }).fill('Bread');
  await until(async () => (await currentRoom()).currentMinigame.bacEntries.host[1] === 'Bread');
  await spectator.getByText('Bread', { exact: true }).waitFor();
  await host.getByRole('textbox', { name: 'Food', exact: true }).fill('');
  await until(async () => (await currentRoom()).currentMinigame.bacEntries.host[1] === '');
  await host.reload({ waitUntil: 'domcontentloaded' });
  await host.getByRole('button', { name: /^Animals.*Bear/ }).waitFor();
  // Expiry freezes the entries and reveals the same anonymous sets to contestants.
  await patch({ countdownStartedAt: Date.now() - 31000 });
  await Promise.all(pages.map(p => p.getByText('Choose the best set of answers.').waitFor()));
  assert.equal(await host.getByRole('textbox').count(), 0);
  await visibleAll('Bison');
  for (const p of pages) {
    assert.equal(await p.getByRole('region', { name: 'Set A' }).getByText('Bison').count(), 1);
    for (const id of ids) assert.equal(await p.locator('.bac-sets').getByText(id, { exact: false }).count(), 0);
  }
  assert.ok(await host.getByRole('button', { name: 'Vote for Set B (your answers)', exact: true }).isDisabled());
  assert.ok(await guest.getByRole('button', { name: 'Vote for Set A (your answers)', exact: true }).isDisabled());
  await host.getByRole('button', { name: 'Vote for Set A', exact: true }).click();
  await until(async () => (await currentRoom()).currentMinigame.votes?.host === 'guest');
  assert.equal((await currentRoom()).currentMinigame.phase, 'voting');
  await guest.getByRole('button', { name: 'Vote for Set B', exact: true }).click();
  await until(async () => (await currentRoom()).currentMinigame.votes?.guest === 'host');
  assert.equal((await currentRoom()).currentMinigame.phase, 'voting');
  await spectator.getByRole('button', { name: 'Vote for Set B', exact: true }).click();
  await visibleAll('Set B — host');
  assert.equal((await currentRoom()).currentMinigame.winnerId, 'host');
  await host.getByRole('button', { name: 'Continue', exact: true }).click();
  await until(async () => (await currentRoom()).turnsPlayed === 1);
  assert.equal((await currentRoom()).players.host.points, 4);
  console.log('PASS live anonymous duel entries, editing, validation, reload, expiry, self-vote blocking and payout');

  for (const wins of [false, true]) {
    await seed('Petit Bac', 'solo', 'playing', { ...settings, bacOrder: ['host'] });
    await enter(host, 'Animals', 'Bear');
    await until(async () => (await currentRoom()).currentMinigame.bacEntries?.host?.[0] === 'Bear');
    await Promise.all([guest, spectator].map(p => p.getByText('Bear', { exact: true }).waitFor()));
    await patch({ countdownStartedAt: Date.now() - 31000 });
    await host.getByRole('button', { name: '✅ Yes', exact: true }).waitFor();
    assert.ok(await host.getByRole('button', { name: '✅ Yes', exact: true }).isDisabled());
    await guest.getByRole('button', { name: '✅ Yes', exact: true }).click();
    await until(async () => (await currentRoom()).currentMinigame.votes?.guest === 'yes');
    await spectator.getByRole('button', { name: wins ? '✅ Yes' : '❌ No', exact: true }).click();
    await host.getByRole('button', { name: 'Continue', exact: true }).waitFor();
    assert.equal((await currentRoom()).currentMinigame.winnerId, wins ? 'host' : null);
    await host.getByRole('button', { name: 'Continue', exact: true }).click();
    await until(async () => (await currentRoom()).turnsPlayed === 1);
    assert.equal((await currentRoom()).players.host.points, wins ? 4 : 0);
  }
  assert.deepEqual(errors, []);
  console.log('PASS solo live entries, spectator-only yes/no voting, tied rejection and success payout');
} catch (error) {
  console.error('State:', JSON.stringify(await currentRoom()));
  for (const p of pages) console.error('UI:', await p.locator('body').innerText());
  console.error(errors);
  throw error;
} finally { await browser.close(); }
