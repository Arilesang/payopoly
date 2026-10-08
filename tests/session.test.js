import test from 'node:test';
import assert from 'node:assert/strict';
import { finishTurn, cleanAwards, scoreUnit, controllerId, wheelGames, triviaResult, tiedLeaders } from '../src/lib/session.js';
import { fallbackContent, validContent, requestContent } from '../src/lib/content.js';
import { votesSettled, topVote } from '../src/utils.js';
const room = () => ({ status: 'play', sessionId: 's', settings: { rounds: 1, scoring: 'dice' }, initialPlayerCount: 2,
  players: { a: { points: 0 }, b: { points: 2 } }, playerOrder: ['a', 'b'], currentTurn: { id: 's:0', playerId: 'a', minigameType: 'solo', minigame: 'Petit Bac' },
  currentMinigame: { diceValue: 6, pointsValue: 6 }, totalTurns: 2 });
test('completion is idempotent, advances once and caps awards', () => {
  const first = finishTurn(room(), { a: 999 }, 1000, 's:0');
  assert.equal(first.players.a.points, 6); assert.equal(first.currentTurn.playerId, 'b');
  assert.equal(finishTurn(first, { a: 6 }, 1001, 's:0'), undefined);
  assert.equal(room().players.a.points, 0);
});
test('final turn ends the session without a phantom next turn', () => {
  const next = finishTurn(room(), {}, 1000, 's:0');
  const end = finishTurn(next, { b: 2 }, 2000, 's:1');
  assert.equal(end.status, 'finished'); assert.equal(end.currentTurn, null); assert.equal(end.turnsPlayed, 2);
});
test('skipping preserves points and records the reason', () => {
  const next = finishTurn(room(), {}, 1000, 's:0', 'skipped');
  assert.equal(next.players.b.points, 2); assert.equal(next.history[0].skipped, 'skipped');
});
test('invalid players, negative and non-finite rewards are discarded', () => {
  assert.deepEqual(cleanAwards(room(), { a: -2, b: Infinity, outsider: 10 }), {});
});
test('crowd scoring stays inside a fixed per-person budget', () => {
  for (const n of [2, 3, 6, 10]) {
    const r = { ...room(), players: Object.fromEntries(Array.from({ length: n }, (_, i) => [i, {}])) };
    for (const name of ['Bluff', 'Qui a écrit ça', 'Croquis Croisés']) {
      const unit = scoreUnit(r, { name, diceValue: 6 });
      assert.ok(unit > 0 && unit <= 6);
      if (name === 'Bluff') assert.equal(unit * n, 6);
    }
  }
});
test('host takes control when turn player is disconnected; tab presence is aggregated', () => {
  const r = { ...room(), hostId: 'b', presence: { a: { tab1: { online: false, lastSeen: 1000 } }, b: { tab1: { online: true, lastSeen: 1000 } } } };
  assert.equal(controllerId(r, 2000), 'b');
  r.presence.a.tab2 = { online: true, lastSeen: 1000 };
  assert.equal(controllerId(r, 2000), 'a');
});
test('quick wheel favors simultaneous games and avoids immediate repeats', () => {
  const r = { ...room(), settings: { preset: 'quick' }, history: [{ key: 'all:Trivia' }] };
  const names = wheelGames(r, 'all');
  assert.ok(names.length); assert.ok(!names.includes('Trivia')); assert.ok(!names.includes('Mimes')); assert.ok(!names.includes('Croquis Croisés'));
});
test('voting handles ties and empty deadline without arbitrary winners', () => {
  assert.equal(topVote({ a: 'x', b: 'y' }), null);
  assert.deepEqual(tiedLeaders({ a: 'x', b: 'y' }), ['x', 'y']);
  assert.equal(votesSettled({}, ['a'], 1), true);
});
test('trivia zero correct answers does not award a winner; exact ties split', () => {
  const mg = { countdownStartedAt: 1000, triviaQuestions: [{ answer: 0 }], triviaAnswers: { a: { 0: { questionIndex: 0, answerIndex: 1, timestamp: 1100 } }, b: { 0: { questionIndex: 0, answerIndex: 2, timestamp: 1200 } } } };
  assert.deepEqual(triviaResult(mg, ['a', 'b']).winnerIds, []);
  mg.triviaAnswers.a[0].answerIndex = 0; mg.triviaAnswers.b[0] = { ...mg.triviaAnswers.a[0] };
  assert.deepEqual(triviaResult(mg, ['a', 'b']).winnerIds, ['a', 'b']);
});
test('every curated backup validates in both languages', () => {
  for (const lang of ['fr', 'en']) for (const endpoint of ['trivia', 'mime-word', 'pictionary-word', 'jumble', 'taboo', 'punchline', 'prompt', 'bluff', 'spectrum', 'rhymes']) {
    assert.ok(validContent(endpoint, fallbackContent(endpoint, lang)), `${lang}:${endpoint}`);
  }
});
test('HTTP and schema failures become playable language-specific backups', async () => {
  for (const fetcher of [async () => ({ ok: false }), async () => ({ ok: true, json: async () => ({ questions: [] }) }), async () => { throw new Error('offline'); }]) {
    const data = await requestContent('/api/trivia', { body: '{}' }, { language: 'en', fetcher });
    assert.equal(data.fallback, true); assert.ok(validContent('trivia', data));
  }
});
test('request timeout aborts generation and produces a fallback', async () => {
  const fetcher = (_, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  const result = await requestContent('/api/taboo', { body: '{}' }, { timeout: 5, fetcher });
  assert.equal(result.fallback, true); assert.ok(result.forbidden.length === 5);
});

test('automatic and manual results use the same taboo and punchline payouts', async () => {
  const { roundAwards } = await import('../src/lib/session.js');
  const r = room(); r.currentMinigame = { name:'Mot Interdit', pointsValue:6, diceValue:6, tPlayerId:'a', foundBy:'b' };
  assert.deepEqual(roundAwards(r), { a:6, b:6 });
  r.currentMinigame = { name:'Punchline', pointsValue:3, diceValue:6, winnerId:'a', votes:{ b:'a', c:'a' } };
  assert.deepEqual(roundAwards(r), { a:6 });
  r.currentMinigame.winnerId=null;r.currentMinigame.winnerIds=['a','b'];
  assert.deepEqual(roundAwards(r), { a:1.5, b:1.5 });
});

test('voting waits for the final ballot when a unanimity bonus remains at stake', () => {
  assert.equal(votesSettled({ a:'x', b:'x' }, ['a','b','c'], Date.now()+10000), false);
});
