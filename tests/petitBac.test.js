import test from 'node:test';
import assert from 'node:assert/strict';
import { validPetitBacWord, writePetitBacWord, validPetitBacVote, petitBacResult } from '../src/lib/petitBac.js';
import { roundAwards } from '../src/lib/session.js';
const room = (type = 'duel') => ({ players: { a: {}, b: {}, c: {} }, currentMinigame: {
  name: 'Petit Bac', type, phase: 'playing', tPlayerId: 'a', pPlayerId: type === 'duel' ? 'b' : null,
  gameCategories: ['Animals', 'Food'], letter: 'E', countdownStartedAt: 1000, diceValue: 6, pointsValue: 6,
} });
test('words match the letter regardless of case, accents and surrounding whitespace', () => {
  for (const word of ['elephant', ' Éléphant ', 'Eel']) assert.ok(validPetitBacWord(word, 'E'));
  for (const word of ['', 'Bear', '"Elephant"', 'E'.repeat(61), null]) assert.equal(validPetitBacWord(word, 'E'), false);
});
test('only participants can edit real categories while the clock is running', () => {
  const mg = room().currentMinigame;
  const saved = writePetitBacWord(mg, 'a', 0, 'Éléphant', 2000);
  assert.equal(saved.bacEntries.a[0], 'Éléphant');
  assert.equal(writePetitBacWord(mg, 'c', 0, 'Eel', 2000), undefined);
  assert.equal(writePetitBacWord(mg, 'a', 2, 'Eel', 2000), undefined);
  assert.equal(writePetitBacWord(mg, 'a', 0, 'Bear', 2000), undefined);
  assert.equal(writePetitBacWord(mg, 'a', 0, 'Eel', 31000), undefined);
  assert.equal(writePetitBacWord({ ...mg, phase: 'voting' }, 'a', 0, 'Eel', 2000), undefined);
  assert.equal(writePetitBacWord(saved, 'a', 0, '', 3000).bacEntries.a[0], '');
  assert.equal(writePetitBacWord(saved, 'a', 1, 'Egg', 3000).bacEntries.a[0], 'Éléphant');
});
test('duel participants vote for opponents and spectators choose either set', () => {
  const r = room();
  assert.equal(validPetitBacVote(r, 'a', 'a'), false);
  assert.equal(validPetitBacVote(r, 'a', 'b'), true);
  assert.equal(validPetitBacVote(r, 'c', 'a'), true);
  assert.equal(validPetitBacVote(r, 'c', 'c'), false);
  assert.equal(validPetitBacVote(r, 'outsider', 'a'), false);
  r.currentMinigame.votes = { a: 'b', b: 'a', c: 'a', outsider: 'b' };
  Object.assign(r.currentMinigame, petitBacResult(r));
  assert.equal(r.currentMinigame.winnerId, 'a');
  assert.deepEqual(roundAwards(r), { a: 6 });
});
test('ties split the die; an expired empty vote awards nothing', () => {
  const r = room();
  r.currentMinigame.votes = { a: 'b', b: 'a' };
  Object.assign(r.currentMinigame, petitBacResult(r));
  assert.deepEqual(roundAwards(r), { a: 3, b: 3 });
  r.currentMinigame.votes = {};
  Object.assign(r.currentMinigame, petitBacResult(r));
  assert.deepEqual(roundAwards(r), {});
});
test('solo excludes the contestant and requires more yes votes than no votes', () => {
  const r = room('solo');
  assert.equal(validPetitBacVote(r, 'a', 'yes'), false);
  r.currentMinigame.votes = { a: 'yes', b: 'yes', c: 'no' };
  assert.equal(petitBacResult(r).winnerId, null);
  r.currentMinigame.votes = { b: 'yes', c: 'yes' };
  Object.assign(r.currentMinigame, petitBacResult(r));
  assert.deepEqual(roundAwards(r), { a: 6 });
});
