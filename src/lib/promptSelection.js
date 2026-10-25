import { validPromptTone } from './promptTone.js';

export const PROMPT_PREP_SECONDS = 90;
export const PROMPT_MAX_LENGTH = 180;

export const hasPromptSelection = mg => mg?.name === 'Punchline' || mg?.name === 'Sondage Éclair';

export function promptExample(name, language = 'fr') {
  if (name === 'Punchline') return language === 'en'
    ? 'My robot has one useless talent: ___.' : 'Mon robot a un talent inutile : ___.';
  return language === 'en' ? 'forget their own birthday' : 'oublier son propre anniversaire';
}

export function beginPromptSelection(room, timestamp, random = Math.random) {
  const mg = room.currentMinigame;
  if (!hasPromptSelection(mg)) return undefined;
  const ids = Object.keys(room.players ?? {});
  const spectators = ids.filter(id => ![mg.tPlayerId, mg.pPlayerId].includes(id));
  const authors = spectators.length ? spectators : ids;
  return {
    phase: 'prompt_select', phaseStartedAt: timestamp,
    promptAuthorId: mg.name === 'Punchline' ? authors[Math.floor(random() * authors.length)] : mg.tPlayerId,
    examplePrompt: promptExample(mg.name, room.settings?.language),
    promptDeadline: timestamp + PROMPT_PREP_SECONDS * 1000,
  };
}

export function normalizePrompt(name, value) {
  if (typeof value !== 'string') return '';
  let text = value.trim().replace(/\s+/g, ' ');
  if (name === 'Sondage Éclair') {
    text = text.replace(/^(?:qui est le plus susceptible de\s*|who(?:'s|’s| is) most likely to\s*)/i, '').replace(/\s*[?？]+$/, '').trim();
  }
  return text;
}

export function validPrompt(name, value) {
  const text = normalizePrompt(name, value);
  if (!text || text.length > PROMPT_MAX_LENGTH) return false;
  if (name === 'Punchline') return (text.match(/_+/g) ?? []).length === 1
    && text.includes('___') && !text.includes('____') && text.replace('___', '').replace(/[\s.,!?;:…]/g, '').length > 0;
  return name === 'Sondage Éclair' && !text.includes('___');
}

// Used inside the room transaction: author, phase, deadline and shape are authoritative.
export function lockPromptSelection(room, actorId, selection, timestamp, automatic = false) {
  const mg = room.currentMinigame;
  if (!hasPromptSelection(mg) || mg.phase !== 'prompt_select' || mg.promptLockedAt) return undefined;
  if (!automatic && (actorId !== mg.promptAuthorId || !room.players?.[actorId] || timestamp >= mg.promptDeadline)) return undefined;
  if (automatic && timestamp < mg.promptDeadline) return undefined;
  const source = automatic ? 'example' : selection?.source;
  if (!['example', 'generated', 'manual'].includes(source)) return undefined;
  const text = normalizePrompt(mg.name, automatic ? mg.examplePrompt : selection?.text);
  if (!validPrompt(mg.name, text) || (source === 'example' && text !== mg.examplePrompt)) return undefined;
  const category = source === 'generated' ? selection?.category : null;
  if (source === 'generated' && (!(room.players[actorId]?.categories ?? []).includes(category) || !validPromptTone(selection.tone))) return undefined;
  return {
    ...mg, phase: 'dice', phaseStartedAt: timestamp, promptLockedAt: timestamp,
    promptSource: source, category, promptTone: source === 'generated' ? selection.tone : null,
    fallback: source === 'generated' && Boolean(selection.fallback),
    [mg.name === 'Punchline' ? 'promptText' : 'surveyPrompt']: text,
  };
}

export function insertPromptBlank(text, start, end = start) {
  if (text.includes('___')) return { text, cursor: start };
  const before = text.slice(0, start);
  const after = text.slice(end);
  const inserted = `${before && !/\s$/.test(before) ? ' ' : ''}___${after && !/^[\s.,!?;:]/.test(after) ? ' ' : ''}`;
  return { text: before + inserted + after, cursor: before.length + inserted.length };
}

export function writePromptGameEntry(room, actorId, field, value, timestamp) {
  const mg = room.currentMinigame;
  if (!hasPromptSelection(mg) || !room.players?.[actorId] || mg[field]?.[actorId] !== undefined) return undefined;
  let accepted = false;
  if (mg.name === 'Punchline') {
    if (field === 'submissions') accepted = mg.phase === 'writing'
      && [mg.tPlayerId, mg.pPlayerId].includes(actorId)
      && typeof value === 'string' && value.trim().length > 0 && value.length <= 120
      && timestamp < mg.countdownStartedAt + 45000;
    if (field === 'votes') accepted = mg.phase === 'voting'
      && ![mg.tPlayerId, mg.pPlayerId].includes(actorId)
      && (mg.options ?? []).some(option => option.id === value) && timestamp < mg.voteDeadline;
  } else {
    const phase = field === 'answers' ? 'answering' : field === 'predictions' ? 'predicting' : null;
    accepted = phase && mg.phase === phase && Boolean(room.players[value]) && timestamp < mg.countdownStartedAt + 15000;
  }
  return accepted ? { ...mg, [field]: { ...mg[field], [actorId]: value } } : undefined;
}
