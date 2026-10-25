import test from 'node:test';
import assert from 'node:assert/strict';
import { beginPromptSelection, lockPromptSelection, writePromptGameEntry } from '../src/lib/promptSelection.js';
import { fallbackPartyPrompt } from '../src/lib/promptTone.js';

function room(name = 'Punchline') {
  const result = { players: { host: { categories: ['Music'] }, guest: {}, spectator: {} }, settings: { language: 'en' },
    currentMinigame: { name, tPlayerId: 'host', pPlayerId: name === 'Punchline' ? 'guest' : null } };
  Object.assign(result.currentMinigame, beginPromptSelection(result, 1000, () => 0));
  return result;
}

test('custom prompts remain author-only, immutable and bounded by the preparation deadline', () => {
  const r = room();
  assert.equal(r.currentMinigame.promptAuthorId, 'spectator');
  const choice = { source: 'manual', text: 'My new instrument is ___.' };
  assert.equal(lockPromptSelection(r, 'host', choice, 2000), undefined);
  const locked = lockPromptSelection(r, 'spectator', choice, 2000);
  assert.equal(locked.promptText, choice.text); assert.equal(locked.phase, 'dice');
  assert.equal(lockPromptSelection({ ...r, currentMinigame: locked }, 'spectator', choice, 2100), undefined);
  assert.equal(lockPromptSelection(r, 'spectator', choice, r.currentMinigame.promptDeadline), undefined);
  const recovered = lockPromptSelection(r, 'host', null, r.currentMinigame.promptDeadline, true);
  assert.equal(recovered.promptText, r.currentMinigame.examplePrompt);
});

test('generated poll choices preserve category and tone validation', () => {
  const r = room('Sondage Éclair');
  const choice = { source: 'generated', text: 'forget their headphones', category: 'Music', tone: 2 };
  assert.equal(lockPromptSelection(r, 'guest', choice, 2000), undefined);
  assert.equal(lockPromptSelection(r, 'host', { ...choice, category: 'Unknown' }, 2000), undefined);
  assert.equal(lockPromptSelection(r, 'host', { ...choice, tone: 99 }, 2000), undefined);
  assert.equal(lockPromptSelection(r, 'host', choice, 2000).surveyPrompt, choice.text);
  for (const language of ['fr', 'en']) for (let tone = 0; tone < 4; tone++) {
    assert.ok(fallbackPartyPrompt('Punchline', language, 'Music', tone, () => 0).prompt.includes('Music'));
  }
});

test('custom-prompt rounds still reject contestants judging their own duel and late answers', () => {
  const r = room();
  r.currentMinigame = { ...r.currentMinigame, phase: 'voting', options: [{ id: 'host' }, { id: 'guest' }], voteDeadline: 5000 };
  assert.equal(writePromptGameEntry(r, 'host', 'votes', 'host', 2000), undefined);
  assert.equal(writePromptGameEntry(r, 'spectator', 'votes', 'host', 5000), undefined);
  assert.equal(writePromptGameEntry(r, 'spectator', 'votes', 'host', 2000).votes.spectator, 'host');
});
