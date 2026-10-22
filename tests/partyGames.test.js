import test from 'node:test';
import assert from 'node:assert/strict';
import { PARTY_GAMES, startPartyGame, writePartyEntry, partyTransition } from '../src/lib/partyGames.js';
import { memoQuestions, MISSIONS } from '../src/data/partyGames.js';
import { availableMinigames } from '../src/gameConfig.js';
import { wheelGames, roundAwards, cleanAwards, finishTurn } from '../src/lib/session.js';
import { MINIGAME_RULES } from '../src/data/minigameRules.js';
import { ROUND_EXAMPLES } from '../src/data/roundExamples.js';
const ids = ['a', 'b', 'c'];
const timestamp = 10000;
function room(name, extra = {}, participants = ids) {
  return {
    players: Object.fromEntries(participants.map(id => [id, { name: id, points: 0 }])),
    playerOrder: participants, settings: { scoring: 'dice' },
    currentMinigame: { id: 'round', name, type: name === 'Mission Impossible' ? 'duel' : 'all',
      tPlayerId: 'a', pPlayerId: 'b', diceValue: 4, pointsValue: 4, phaseStartedAt: timestamp,
      ...startPartyGame(name, participants, 'en', () => 0), ...extra },
  };
}
function transition(r, at = timestamp + 1) { return partyTransition(r, at); }
function apply(r, at) { const patch = transition(r, at); assert.ok(patch); r.currentMinigame = { ...r.currentMinigame, ...patch, phaseStartedAt: at }; return patch; }

test('new games have rules, examples, player thresholds and quick-play eligibility', () => {
  for (const name of PARTY_GAMES) {
    const type = name === 'Mission Impossible' ? 'duel' : 'all';
    const key = `${type}:${name}`;
    const rules = MINIGAME_RULES.find(r => r.id === key);
    assert.ok(rules);
    assert.ok(ROUND_EXAMPLES[key]?.every(Boolean));
    for (const lang of ['en', 'fr']) assert.ok(rules.steps.every(s => s[lang]) && rules.tagline[lang] && rules.scoring[lang]);
    assert.ok(availableMinigames(type, 3).includes(name));
    if (type === 'all') assert.ok(wheelGames({ players: { a: {}, b: {} }, settings: { preset: 'quick' } }, type).includes(name));
  }
  assert.ok(!availableMinigames('duel', 2).includes('Mission Impossible'));
});

test('unique lanes reward only sole occupants, including lane zero; missing picks earn nothing', () => {
  const r = room('Choix Unique', { lanePicks: { a: 0, b: 2, c: 2 } });
  assert.deepEqual(transition(r).awards, { a: 2 });
  r.currentMinigame.lanePicks = { a: 0, b: 1, c: 2 };
  assert.deepEqual(transition(r).awards, { a: 2, b: 3, c: 4 });
  r.currentMinigame.lanePicks = { a: 2 };
  assert.equal(transition(r), null);
  assert.deepEqual(transition(r, timestamp + 40000).awards, { a: 4 });
  r.currentMinigame.lanePicks = {};
  assert.deepEqual(transition(r, timestamp + 40000).awards, {});
});

test('immutable choices reject late writes, invalid values, spectators joining mid-round and old phases', () => {
  let mg = room('Choix Unique').currentMinigame;
  for (const value of [-1, 3, 0.5, '0', null]) assert.equal(writePartyEntry(mg, 'a', 'lanePicks', value, timestamp), undefined);
  assert.equal(writePartyEntry(mg, 'late-joiner', 'lanePicks', 0, timestamp), undefined);
  assert.equal(writePartyEntry(mg, 'a', 'lanePicks', 0, timestamp + 40000), undefined);
  mg = writePartyEntry(mg, 'a', 'lanePicks', 0, timestamp + 39999);
  assert.equal(mg.lanePicks.a, 0);
  assert.equal(writePartyEntry(mg, 'a', 'lanePicks', 1, timestamp), undefined);
  assert.equal(writePartyEntry({ ...mg, phase: 'results' }, 'b', 'lanePicks', 2, timestamp), undefined);
});

test('missions recover through prep, performance and judging deadlines without responses', () => {
  const r = room('Mission Impossible');
  assert.equal(transition(r, timestamp + 14999), null);
  assert.equal(apply(r, timestamp + 15000).phase, 'performing');
  assert.equal(transition(r, timestamp + 59999), null);
  assert.equal(apply(r, timestamp + 60000).phase, 'judging');
  const patch = apply(r, timestamp + 75000);
  assert.equal(patch.phase, 'results');
  assert.deepEqual(patch.winnerIds, []);
  assert.deepEqual(roundAwards(r), {});
});

test('mission objectives are bilingual and distinct, votes are audience-only, and ready checks need both actors', () => {
  for (const mission of MISSIONS) for (const lang of ['fr', 'en']) {
    assert.ok(mission.scene[lang]);
    assert.equal(mission.roles.length, 2);
    assert.notEqual(mission.objectives[0][lang], mission.objectives[1][lang]);
  }
  const r = room('Mission Impossible');
  assert.equal(writePartyEntry(r.currentMinigame, 'c', 'missionReady', true, timestamp), undefined);
  r.currentMinigame = writePartyEntry(r.currentMinigame, 'a', 'missionReady', true, timestamp);
  assert.equal(transition(r), null);
  r.currentMinigame = writePartyEntry(r.currentMinigame, 'b', 'missionReady', true, timestamp);
  assert.equal(transition(r).phase, 'performing');
  r.currentMinigame.phase = 'judging';
  assert.equal(writePartyEntry(r.currentMinigame, 'a', 'missionVotes', [true, true], timestamp), undefined);
  assert.equal(writePartyEntry(r.currentMinigame, 'c', 'missionVotes', [true], timestamp), undefined);
  r.currentMinigame = writePartyEntry(r.currentMinigame, 'c', 'missionVotes', [true, false], timestamp);
  Object.assign(r.currentMinigame, transition(r));
  assert.equal(r.currentMinigame.winnerId, 'a');
  assert.deepEqual(roundAwards(r), { a: 4 });
  r.currentMinigame.phase = 'judging';
  r.currentMinigame.missionVotes.c = [true, true];
  Object.assign(r.currentMinigame, transition(r));
  assert.deepEqual(roundAwards(r), { a: 2, b: 2 });
});

test('strict mission majorities, empty ballots and bounty agree with the shared payout rules', () => {
  const r = room('Mission Impossible', { phase: 'judging', missionVotes: { c: [true, false], d: [false, false] } }, [...ids, 'd']);
  assert.deepEqual(transition(r).winnerIds, []);
  r.currentMinigame.missionVotes.d = [true, false];
  r.currentMinigame.bounty = true;
  Object.assign(r.currentMinigame, transition(r));
  assert.deepEqual(roundAwards(r), { a: 6 });
});

test('shared code clues cover every position exactly once for small and large groups, preserving zeros', () => {
  for (const count of [2, 3, 4, 8, 20]) {
    const participants = Array.from({ length: count }, (_, i) => `p${i}`);
    const data = startPartyGame('Code Commun', participants, 'fr', () => 0);
    const clues = Object.values(data.codeClues).flat();
    assert.equal(clues.length, data.code.length);
    assert.equal(new Set(clues.map(c => c.position)).size, data.code.length);
    assert.ok(Object.values(data.codeClues).every(c => c.length > 0));
    assert.equal(clues.sort((a, b) => a.position - b.position).map(c => c.value - 2).join(''), data.code);
    assert.ok(data.code.startsWith('0'));
  }
});

test('three code attempts are shared atomically, reject duplicates and reward all participants on success', () => {
  const r = room('Code Commun');
  let mg = r.currentMinigame;
  assert.equal(writePartyEntry(mg, 'a', 'codeAttempts', '12a4', timestamp), undefined);
  assert.equal(writePartyEntry(mg, 'a', 'codeAttempts', '000', timestamp), undefined);
  mg = writePartyEntry(mg, 'a', 'codeAttempts', '1234', timestamp);
  assert.equal(writePartyEntry(mg, 'b', 'codeAttempts', '1234', timestamp), undefined);
  mg = writePartyEntry(mg, 'b', 'codeAttempts', '1111', timestamp);
  mg = writePartyEntry(mg, 'c', 'codeAttempts', '0000', timestamp);
  assert.equal(writePartyEntry(mg, 'a', 'codeAttempts', '9999', timestamp), undefined);
  r.currentMinigame = mg;
  assert.deepEqual(transition(r).awards, { a: 4, b: 4, c: 4 });
  assert.equal(transition(r).codeSolved, true);
  mg.codeAttempts[2].code = '2222';
  assert.deepEqual(transition(r).awards, {});
  mg.codeAttempts = [];
  assert.equal(transition(r), null);
  assert.deepEqual(transition(r, timestamp + 65000).awards, {});
});

test('memo scene has consistent bilingual questions for every visual variant', () => {
  for (const random of [() => 0, () => 0.49, () => 0.999]) {
    const data = startPartyGame('Mémo Flash', ids, 'en', random);
    assert.equal(new Set(data.memoQuestionIds).size, 3);
    for (const lang of ['fr', 'en']) {
      const questions = memoQuestions(data.memoScene, lang);
      assert.equal(questions.length, 6);
      assert.ok(questions.every(q => q.options.length === 3 && q.options[q.answer]));
      assert.equal(questions[1].options[questions[1].answer], String(data.memoScene.balloons));
      assert.equal(questions[4].options[questions[4].answer], String(data.memoScene.ducks));
    }
  }
});

test('memo hides questions until study deadline, rejects invalid/late answers and scores only submitted memories', () => {
  const r = room('Mémo Flash');
  assert.equal(writePartyEntry(r.currentMinigame, 'a', 'memoAnswers', [0, 0, 0], timestamp), undefined);
  assert.equal(transition(r, timestamp + 14999), null);
  assert.equal(apply(r, timestamp + 15000).phase, 'recalling');
  const mg = r.currentMinigame;
  const correct = mg.memoQuestionIds.map(i => memoQuestions(mg.memoScene)[i].answer);
  for (const bad of [[0], ['0', 0, 0], [0, -1, 0]]) assert.equal(writePartyEntry(mg, 'a', 'memoAnswers', bad, timestamp + 15001), undefined);
  r.currentMinigame = writePartyEntry(mg, 'a', 'memoAnswers', correct, timestamp + 15001);
  assert.equal(writePartyEntry(mg, 'b', 'memoAnswers', correct, timestamp + 40000), undefined);
  assert.equal(transition(r, timestamp + 39999), null);
  const result = apply(r, timestamp + 40000);
  assert.deepEqual(result.scores, { a: 3, b: 0, c: 0 });
  assert.deepEqual(cleanAwards(r, result.awards), { a: 4 });
});

test('new game payouts use fixed scoring and round completion remains idempotent', () => {
  const r = room('Choix Unique', { lanePicks: { a: 0, b: 1, c: 2 }, diceValue: 6, pointsValue: 10 });
  r.settings.scoring = 'fixed';
  Object.assign(r.currentMinigame, transition(r));
  assert.deepEqual(roundAwards(r), { a: 5, b: 7.5, c: 10 });
  r.currentTurn = { id: 'round', playerId: 'a', phase: 'playing', minigameType: 'all', minigame: 'Choix Unique' };
  r.status = 'play'; r.totalTurns = 3; r.turnsPlayed = 0;
  const next = finishTurn(r, roundAwards(r), timestamp + 1, 'round');
  assert.equal(next.players.c.points, 10);
  assert.equal(finishTurn(next, roundAwards(r), timestamp + 2, 'round'), undefined);
});
