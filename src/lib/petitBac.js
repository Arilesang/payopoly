import { tiedLeaders } from './session.js';

export const petitBacParticipants = mg => [mg?.tPlayerId, ...(mg?.type === 'duel' ? [mg.pPlayerId] : [])].filter(Boolean);

export function validPetitBacWord(word, letter) {
  if (typeof word !== 'string' || !letter || !word.trim() || word.trim().length > 60) return false;
  const normalize = text => text.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
  return normalize(word.trim()).startsWith(normalize(letter));
}

export function writePetitBacWord(mg, playerId, categoryIndex, word, timestamp) {
  if (mg?.name !== 'Petit Bac' || mg.phase !== 'playing' || !petitBacParticipants(mg).includes(playerId)
    || !Number.isFinite(mg.countdownStartedAt) || timestamp >= mg.countdownStartedAt + 30000 || !Number.isInteger(categoryIndex)
    || categoryIndex < 0 || categoryIndex >= (mg.gameCategories?.length ?? 0)
    || typeof word !== 'string' || (word.trim() && !validPetitBacWord(word, mg.letter))) return undefined;
  const entries = { ...mg.bacEntries, [playerId]: { ...mg.bacEntries?.[playerId], [categoryIndex]: word.trim() } };
  return { ...mg, bacEntries: entries };
}

export function petitBacVoters(room) {
  const mg = room.currentMinigame;
  return Object.keys(room.players ?? {}).filter(id => mg.type === 'duel' || id !== mg.tPlayerId);
}

export function validPetitBacVote(room, playerId, choice) {
  const mg = room.currentMinigame;
  return petitBacVoters(room).includes(playerId) && (mg.type === 'solo'
    ? ['yes', 'no'].includes(choice)
    : petitBacParticipants(mg).includes(choice) && choice !== playerId);
}

export function petitBacResult(room) {
  const mg = room.currentMinigame;
  const votes = Object.fromEntries(Object.entries(mg.votes ?? {}).filter(([id, choice]) => validPetitBacVote(room, id, choice)));
  if (mg.type === 'duel') {
    const winnerIds = tiedLeaders(votes);
    return { phase: 'complete', winnerIds, winnerId: winnerIds.length === 1 ? winnerIds[0] : null };
  }
  const cast = Object.values(votes);
  const won = cast.filter(v => v === 'yes').length > cast.filter(v => v === 'no').length;
  return { phase: 'complete', winnerId: won ? mg.tPlayerId : null };
}
