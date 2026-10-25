import test from 'node:test';
import assert from 'node:assert/strict';
import { motInterditResult } from '../src/lib/motInterdit.js';
import { roundAwards } from '../src/lib/session.js';

test('listeners approve taboo rewards, while rejections, ties and missing votes pay nothing', () => {
  const players = { speaker: {}, finder: {}, listener: {} };
  const base = { name: 'Mot Interdit', tPlayerId: 'speaker', foundBy: 'finder', diceValue: 4, pointsValue: 4 };
  for (const [votes, approved] of [
    [{ finder: 'yes', listener: 'yes' }, true],
    [{ finder: 'no', listener: 'no' }, false],
    [{ finder: 'yes', listener: 'no' }, false],
    [{}, false],
    [{ speaker: 'yes', outsider: 'yes' }, false],
    [{ finder: 'yes' }, true],
  ]) {
    const mg = { ...base, votes };
    assert.deepEqual(roundAwards({ players, currentMinigame: mg }), {}, 'No points before approval');
    const result = motInterditResult(mg, Object.keys(players));
    assert.equal(result.winnerId, approved ? 'speaker' : null);
    assert.deepEqual(roundAwards({ players, currentMinigame: { ...mg, ...result } }), approved ? { speaker: 4, finder: 4 } : {});
  }
  assert.equal(motInterditResult({ ...base, foundBy: null, votes: { finder: 'yes' } }, Object.keys(players)).winnerId, null);
});
