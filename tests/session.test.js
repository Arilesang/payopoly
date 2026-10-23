import test from 'node:test';
import assert from 'node:assert/strict';
import { finishTurn, cleanAwards, scoreUnit, controllerId, wheelGames, triviaResult, tiedLeaders, roundAwards, predictionAwards, isLeaderBounty, headToHead, lastDuelOpponent, seatPlayer, generateCode, codeVariants } from '../src/lib/session.js';
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
  r.currentMinigame = { name:'Punchline', type:'duel', pointsValue:6, diceValue:6, tPlayerId:'a', pPlayerId:'b', winnerId:'a', votes:{ c:'a', d:'a' } };
  assert.deepEqual(roundAwards(r), { a:12 });
  r.currentMinigame.winnerId=null;r.currentMinigame.winnerIds=['a','b'];
  assert.deepEqual(roundAwards(r), { a:3, b:3 });
});

test('voting waits for the final ballot when a unanimity bonus remains at stake', () => {
  assert.equal(votesSettled({ a:'x', b:'x' }, ['a','b','c'], Date.now()+10000), false);
});

const duelRoom = (mg, players = { a: { points: 1 }, b: { points: 9 }, c: { points: 0 }, d: { points: 0 }, e: { points: 0 } }) => ({
  ...room(), players, currentMinigame: { type: 'duel', tPlayerId: 'a', pPlayerId: 'b', diceValue: 4, pointsValue: 4, ...mg },
});

test('punchline pays the die, and a clean sweep really doubles it past the usual cap', () => {
  const r = duelRoom({ name: 'Punchline', winnerId: 'a', votes: { c: 'a', d: 'a', e: 'a' } });
  assert.equal(scoreUnit(r), 4);
  assert.deepEqual(roundAwards(r), { a: 8 });
  r.currentMinigame.votes.e = 'b';
  assert.deepEqual(roundAwards(r), { a: 4 });
  // One judge alone never counts as a sweep.
  r.currentMinigame.votes = { c: 'a' };
  assert.deepEqual(roundAwards(r), { a: 4 });
});

test('leader bounty pays +50% only when the trailing challenger beats the leader', () => {
  const r = duelRoom({ name: 'Rimes Rapides', bounty: true, winnerId: 'a' });
  assert.ok(isLeaderBounty(r, 'a', 'b'));
  assert.ok(!isLeaderBounty(r, 'b', 'a'));
  assert.ok(!isLeaderBounty(r, 'a', 'c'));
  assert.deepEqual(roundAwards(r), { a: 6 });
  r.currentMinigame.winnerId = 'b';
  assert.deepEqual(roundAwards(r), { b: 4 });
  // A bounty duel can still be a Punchline sweep: both stack.
  Object.assign(r.currentMinigame, { name: 'Punchline', winnerId: 'a', votes: { c: 'a', d: 'a' } });
  assert.deepEqual(roundAwards(r), { a: 10 });
  // Duel extras never stretch the cap for anyone but the winner.
  assert.deepEqual(cleanAwards(r, { b: 10 }), { b: 4 });
});

test('predictions pay half the die with the crowd and the full die against it', () => {
  const r = duelRoom({ name: 'Trivia', winnerId: 'a', winnerIds: ['a'], bets: { c: 'a', d: 'b', e: 'b' } });
  assert.deepEqual(predictionAwards(r), { c: 4 });
  r.currentMinigame.winnerId = 'b'; r.currentMinigame.winnerIds = ['b'];
  assert.deepEqual(predictionAwards(r), { d: 2, e: 2 });
  assert.deepEqual(roundAwards(r), { b: 4, d: 2, e: 2 });
  // An even split is not an upset.
  r.currentMinigame.bets = { c: 'a', d: 'b' };
  assert.deepEqual(predictionAwards(r), { d: 2 });
  // Ties, no winner, judged duels and duellists' own bets pay nothing.
  r.currentMinigame.winnerId = null; r.currentMinigame.winnerIds = ['a', 'b'];
  assert.deepEqual(predictionAwards(r), {});
  const judged = duelRoom({ name: 'Punchline', winnerId: 'a', bets: { c: 'a' }, votes: { c: 'a' } });
  assert.deepEqual(predictionAwards(judged), {});
  const self = duelRoom({ name: 'Rimes Rapides', winnerId: 'a', bets: { a: 'a' } });
  assert.deepEqual(predictionAwards(self), {});
});

test('duels are recorded for head-to-head and the last opponent', () => {
  const r = { ...duelRoom({ name: 'Rimes Rapides', winnerId: 'b' }), currentTurn: { id: 's:0', playerId: 'a' }, playerOrder: ['a', 'b', 'c'] };
  const next = finishTurn(r, roundAwards(r), 1000, 's:0');
  assert.deepEqual(next.history[0].duel, { ids: ['a', 'b'], winnerId: 'b' });
  const skipped = finishTurn(r, {}, 1000, 's:0', 'skipped');
  assert.equal(skipped.history[0].duel.winnerId, null);
  const history = [...next.history, ...skipped.history, { duel: { ids: ['c', 'a'], winnerId: 'a' } }];
  assert.deepEqual(headToHead(history, 'a', 'b'), { a: 0, b: 1 });
  assert.equal(lastDuelOpponent(history, 'a'), 'c');
  assert.equal(lastDuelOpponent(history, 'b'), 'a');
  assert.equal(lastDuelOpponent([], 'a'), null);
});
test('late joiners get a seat at the end of the rotation and one turn per remaining round', () => {
  const r = { ...room(), settings: { rounds: 3 }, totalTurns: 6, turnsPlayed: 1, currentTurn: { id: 's:1', playerId: 'b' },
    players: { a: { name: 'Ana', points: 3, defaultCategories: ['Sports', 'Films'] }, b: { name: 'Bo', points: 2 } } };
  const { room: next, playerId } = seatPlayer(r, { newId: 'c', name: 'Cy', now: 1000 });
  assert.equal(playerId, 'c'); assert.deepEqual(next.playerOrder, ['a', 'b', 'c']); assert.equal(next.totalTurns, 9);
  assert.equal(next.players.c.points, 0); assert.equal(next.players.c.categories.length, 2); assert.ok(!next.players.c.categories.includes('Sports'));
  let state = next; const turns = [];
  while (state.status === 'play') { turns.push(state.currentTurn.playerId); state = finishTurn(state, {}, 2000, state.currentTurn.id); }
  assert.deepEqual(turns, ['b', 'c', 'a', 'b', 'c', 'a', 'b', 'c']);
});
test('joining reclaims a disconnected seat by name and refuses a connected one', () => {
  const r = { ...room(), players: { a: { name: 'Ludine', points: 4 }, b: { name: 'Bo' } }, presence: { b: { t: { online: true, lastSeen: 1000 } } } };
  assert.equal(seatPlayer(r, { newId: 'z', name: ' ludine ', now: 2000 }).playerId, 'a');
  assert.equal(seatPlayer(r, { newId: 'z', name: 'BO', now: 2000 }).error, 'nameTaken');
  assert.equal(seatPlayer(r, { storedId: 'b', newId: 'z', name: 'Bo', now: 2000 }).playerId, 'b');
  const lobby = seatPlayer({ status: 'lobby', players: {} }, { newId: 'z', name: 'Zed', now: 0 }).room;
  assert.deepEqual(lobby.players.z, { name: 'Zed', ready: false, points: 0, categoriesSubmitted: false });
});
test('room codes avoid look-alikes, and typed look-alikes still find older rooms', () => {
  for (let i = 0; i < 200; i++) assert.match(generateCode(), /^[A-HJKMNP-Z2-9]{6}$/);
  assert.equal(generateCode(() => 0.999999).length, 6);
  assert.deepEqual(codeVariants('ABCDEF'), ['ABCDEF']);
  assert.deepEqual(codeVariants('06BMD2'), ['06BMD2', 'O6BMD2']);
  assert.deepEqual(codeVariants('1X0'), ['1X0', '1XO', 'IX0', 'IXO', 'LX0', 'LXO']);
  assert.equal(codeVariants('000000').length, 64);
});

test('wheel catalog shows unavailable games with a reason while excluding them from selectable slices', async () => {
  const { wheelCatalog } = await import('../src/lib/session.js');
  const r = room();
  const mission = wheelCatalog(r, 'duel').find(entry => entry.name === 'Mission Impossible');
  assert.deepEqual(mission, { name: 'Mission Impossible', minPlayers: 3, available: false, reason: 'players' });
  assert.ok(!wheelGames(r, 'duel').includes(mission.name));
  for (const name of ['Choix Unique', 'Code Commun', 'Mémo Flash']) assert.ok(wheelCatalog(r, 'duel').find(e => e.name === name).available);
  r.players.c = {};
  assert.ok(wheelCatalog(r, 'duel').find(entry => entry.name === mission.name).available);
  r.history = [{ key: 'duel:Mission Impossible' }];
  assert.equal(wheelCatalog(r, 'duel').find(entry => entry.name === mission.name).reason, 'repeat');
  r.settings.preset = 'quick';
  assert.equal(wheelCatalog(r, 'all').find(entry => entry.name === 'Croquis Croisés').reason, 'preset');
});
