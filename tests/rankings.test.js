import test from 'node:test';
import assert from 'node:assert/strict';
import { rankingRows } from '../src/lib/rankings.js';
import { finishTurn } from '../src/lib/session.js';

test('completed awards move ranks, preserve ties and leave non-winners at zero', () => {
  const game = { status: 'play', sessionId: 's', players: { a: { name: 'A', points: 0 }, b: { name: 'B', points: 2 }, c: { name: 'C', points: 2 } }, playerOrder: ['a', 'b', 'c'], currentTurn: { id: 's:0', playerId: 'a' }, currentMinigame: { diceValue: 6 }, totalTurns: 9 };
  const done = finishTurn(game, { a: 6 }, 1, 's:0');
  assert.deepEqual(rankingRows(done).map(p => [p.id, p.rank, p.delta, p.movement]), [['a', 1, 6, 2], ['b', 2, 0, -1], ['c', 2, 0, -1]]);
  // Later manual adjustments must not rewrite the last game's movement.
  done.players.b.points = 20;
  assert.equal(rankingRows(done).find(p => p.id === 'b').movement, -1);
});

test('legacy results support fractional gains, signed losses and neutral first game', () => {
  const game = { players: { a: { name: 'A', points: 2.5 }, b: { name: 'B', points: 1 } }, history: [{ awards: { a: 1.5, b: -2 } }] };
  assert.deepEqual(rankingRows(game).map(p => [p.delta, p.movement]), [[1.5, 1], [-2, -1]]);
  delete game.history;
  assert.ok(rankingRows(game).every(p => p.delta === 0 && p.movement === 0));
});
