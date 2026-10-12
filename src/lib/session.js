import { MINIGAME_META, availableMinigames } from '../gameConfig.js';

export const DEFAULT_SETTINGS = { rounds: null, preset: 'classic', language: 'fr', scoring: 'dice' };
export const CATEGORIES = {
  fr: ['Animaux', 'Sports', 'Films', 'Métiers', 'Pays', 'Couleurs', 'Nourriture', 'Musique', 'Célébrités', 'Nature', 'Vêtements', 'Transports', 'Instruments', 'Fleurs', 'Histoire'],
  en: ['Animals', 'Sports', 'Movies', 'Jobs', 'Countries', 'Colors', 'Food', 'Music', 'Celebrities', 'Nature', 'Clothes', 'Transport', 'Instruments', 'Flowers', 'History'],
};
export function onlineIds(room, now) {
  return Object.keys(room?.players ?? {}).filter(id => Object.values(room.presence?.[id] ?? {}).some(p => p.online && now - p.lastSeen < 45000));
}
export function controllerId(room, now) {
  const online = onlineIds(room, now);
  const turnId = room.currentTurn?.playerId;
  return online.includes(turnId) ? turnId : online.includes(room.hostId) ? room.hostId : online.sort()[0];
}
export function wheelGames(room, type) {
  let names = availableMinigames(type, Object.keys(room.players ?? {}).length);
  if (room.settings?.preset === 'quick' && type === 'all') {
    names = names.filter(n => MINIGAME_META[`all:${n}`]?.kind === 'melee');
    names = names.filter(n => n !== 'Croquis Croisés');
  }
  const last = room.history?.slice(-1)[0];
  const withoutRepeat = names.filter(n => `${type}:${n}` !== last?.key);
  return withoutRepeat.length ? withoutRepeat : names;
}
export function payoutCap(room, mg = room.currentMinigame) {
  return room.settings?.scoring === 'fixed' ? 10 : Number(mg?.diceValue ?? mg?.pointsValue ?? 0);
}
// Crowd-dependent rewards have a fixed per-person budget, regardless of table size.
export function scoreUnit(room, mg = room.currentMinigame) {
  const cap = payoutCap(room, mg);
  const n = Object.keys(room.players ?? {}).length;
  if (mg?.name === 'Bluff') return cap / Math.max(1, n);
  if (mg?.name === 'Qui a écrit ça') return cap / Math.max(1, Math.min(n, 6));
  if (mg?.name === 'Croquis Croisés') return cap / Math.max(1, Math.min(n, 3) * Math.max(1, n - 1));
  if (mg?.name === 'Sondage Éclair') return cap / 2;
  if (mg?.name === 'Punchline') return cap / 2;
  return cap;
}
export function cleanAwards(room, awards) {
  const cap = payoutCap(room);
  return Object.fromEntries(Object.entries(awards ?? {}).filter(([id, value]) => room.players?.[id] && Number.isFinite(value) && value > 0)
    .map(([id, value]) => [id, Math.min(cap, Math.round(value * 10) / 10)]));
}
export function finishTurn(room, awards, now, expectedTurnId, reason = null) {
  if (!room || room.status !== 'play' || room.currentTurn?.id !== expectedTurnId) return undefined;
  const players = Object.fromEntries(Object.entries(room.players ?? {}).map(([id, p]) => [id, { ...p }]));
  const payouts = cleanAwards(room, awards);
  Object.entries(payouts).forEach(([id, value]) => { players[id].points = Math.round(((players[id].points ?? 0) + value) * 10) / 10; });
  const order = (room.playerOrder ?? []).filter(id => players[id]);
  const turn = room.currentTurn;
  const history = [...(room.history ?? []), {
    turnId: turn.id, key: `${turn.minigameType}:${turn.minigame}`, playerId: turn.playerId,
    awards: payouts,
    scoresBefore: Object.fromEntries(Object.entries(room.players ?? {}).map(([id, p]) => [id, p.points ?? 0])),
    scoresAfter: Object.fromEntries(Object.entries(players).map(([id, p]) => [id, p.points ?? 0])),
    skipped: reason, at: now,
  }];
  const turnsPlayed = (room.turnsPlayed ?? 0) + 1;
  const totalTurns = room.totalTurns ?? order.length * (room.settings?.rounds ?? 3);
  const end = turnsPlayed >= totalTurns || order.length < 2;
  const currentPos = order.indexOf(turn.playerId);
  const nextIndex = (currentPos + 1) % Math.max(1, order.length);
  const showcaseCounts = { ...(room.showcaseCounts ?? {}) };
  (room.currentMinigame?.revealOrder ?? []).forEach(id => { showcaseCounts[id] = (showcaseCounts[id] ?? 0) + 1; });
  const roundNumber = Math.floor(turnsPlayed / Math.max(1, room.initialPlayerCount ?? order.length)) + 1;
  return { ...room, showcaseCounts, players, history, turnsPlayed, status: end ? 'finished' : 'play', finishedAt: end ? now : null,
    currentTurnIndex: nextIndex, currentMinigame: null,
    currentTurn: end ? null : { id: `${room.sessionId}:${turnsPlayed}`, playerId: order[nextIndex], phase: 'choose_type', startedAt: now, roundNumber } };
}
export function tiedLeaders(votes) {
  const tally = {};
  Object.values(votes ?? {}).forEach(v => { tally[v] = (tally[v] ?? 0) + 1; });
  const top = Math.max(0, ...Object.values(tally));
  return Object.keys(tally).filter(id => top > 0 && tally[id] === top);
}
export function triviaResult(mg, ids) {
  const questions = mg.triviaQuestions ?? [];
  const records = ids.map(id => {
    const answers = Object.values(mg.triviaAnswers?.[id] ?? {});
    const correct = answers.filter(a => a.answerIndex >= 0 && questions[a.questionIndex]?.answer === a.answerIndex);
    return { id, score: correct.length, time: correct.reduce((sum, a) => sum + Math.max(0, a.timestamp - mg.countdownStartedAt), 0) };
  }).sort((a, b) => b.score - a.score || a.time - b.time);
  const best = records[0];
  const winnerIds = best?.score ? records.filter(r => r.score === best.score && r.time === best.time).map(r => r.id) : [];
  return { scores: Object.fromEntries(records.map(r => [r.id, r.score])), winnerIds, winnerId: winnerIds.length === 1 ? winnerIds[0] : null,
    tScore: records.find(r => r.id === mg.tPlayerId)?.score ?? 0, pScore: records.find(r => r.id === mg.pPlayerId)?.score ?? 0 };
}

// One payout source for result screens, manual continuation and timed continuation.
export function roundAwards(room) {
  const mg = room.currentMinigame;
  if (!mg) return {};
  const points = mg.pointsValue ?? 0;
  if (mg.awards) return cleanAwards(room, mg.awards);
  if (mg.winnerIds?.length > 1) return cleanAwards(room, Object.fromEntries(mg.winnerIds.map(id => [id, points / mg.winnerIds.length])));
  if (mg.name === 'Mot Interdit') return mg.foundBy ? cleanAwards(room, { [mg.tPlayerId]: points, [mg.foundBy]: points }) : {};
  const awards = {};
  if (mg.winnerId) {
    const votes = Object.values(mg.votes ?? {});
    const sweep = mg.name === 'Punchline' && votes.length >= 2 && votes.every(id => id === mg.winnerId);
    awards[mg.winnerId] = sweep ? points * 2 : points;
  }
  if (mg.bonusWinnerId) awards[mg.bonusWinnerId] = (awards[mg.bonusWinnerId] ?? 0) + points;
  return cleanAwards(room, awards);
}
