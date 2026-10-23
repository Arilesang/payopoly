import { MISSIONS, makeMemoScene, memoQuestions } from '../data/partyGames.js';

export const PARTY_GAMES = ['Choix Unique', 'Mission Impossible', 'Code Commun', 'Mémo Flash'];
export const PARTY_SECONDS = { choosing: 40, mission_prep: 15, performing: 45, judging: 15, decoding: 65, studying: 15, recalling: 25 };

export function startPartyGame(name, ids, language = 'fr', random = Math.random, duelIds = null) {
  const participants = duelIds && ['Choix Unique', 'Mémo Flash'].includes(name) ? duelIds : ids;
  const common = { participantIds: participants, contentLanguage: language };
  if (name === 'Choix Unique') return { ...common, phase: 'choosing' };
  if (name === 'Mission Impossible') return { ...common, phase: 'mission_prep', missionIndex: Math.floor(random() * MISSIONS.length) };
  if (name === 'Code Commun') {
    const codeTeams = duelIds ? Object.fromEntries([
      ...duelIds.map(id => [id, id]),
      ...ids.filter(id => !duelIds.includes(id)).map((id, i) => [id, duelIds[i % 2]]),
    ]) : null;
    const groups = duelIds ? duelIds.map(captain => ids.filter(id => codeTeams[id] === captain)) : [ids];
    const digits = Array.from({ length: Math.max(4, ...groups.map(group => group.length)) }, () => Math.floor(random() * 10));
    const clues = Object.fromEntries(ids.map(id => [id, []]));
    groups.forEach(group => digits.forEach((digit, i) => clues[group[i % group.length]].push({ position: i + 1, value: digit + 2 })));
    return { ...common, phase: 'decoding', code: digits.join(''), codeClues: clues, ...(codeTeams ? { codeTeams } : {}) };
  }
  const memoScene = makeMemoScene(random);
  const questionIds = Array.from({ length: 6 }, (_, i) => i);
  for (let i = questionIds.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [questionIds[i], questionIds[j]] = [questionIds[j], questionIds[i]]; }
  return { ...common, phase: 'studying', memoScene, memoQuestionIds: questionIds.slice(0, 3) };
}

// Validate at transaction time, so stale tabs cannot submit after a phase ends.
export function writePartyEntry(mg, id, field, value, timestamp) {
  if (!mg.participantIds?.includes(id)) return undefined;
  const duration = PARTY_SECONDS[mg.phase];
  if (!duration || timestamp >= mg.phaseStartedAt + duration * 1000) return undefined;
  const duellists = [mg.tPlayerId, mg.pPlayerId];
  const allowed = field === 'lanePicks' && mg.phase === 'choosing' && Number.isInteger(value) && value >= 0 && value < 3
    || field === 'missionReady' && mg.phase === 'mission_prep' && duellists.includes(id) && value === true
    || field === 'missionVotes' && mg.phase === 'judging' && !duellists.includes(id) && Array.isArray(value) && value.length === 2 && value.every(v => typeof v === 'boolean')
    || field === 'memoAnswers' && mg.phase === 'recalling' && Array.isArray(value) && value.length === 3 && value.every(v => Number.isInteger(v) && v >= 0 && v < 3);
  if (field === 'codeAttempts' && mg.phase === 'decoding') {
    const duel = mg.type === 'duel';
    if (duel && !duellists.includes(id)) return undefined;
    const attempts = duel ? mg.teamCodeAttempts?.[id] ?? [] : mg.codeAttempts ?? [];
    if (typeof value !== 'string' || !/^\d+$/.test(value) || value.length !== mg.code?.length || attempts.length >= 3 || attempts.some(a => a.code === mg.code || a.code === value)) return undefined;
    if (duel && Object.values(mg.teamCodeAttempts ?? {}).flat().some(a => a.code === mg.code)) return undefined;
    const next = [...attempts, { by: id, code: value }];
    return duel ? { ...mg, teamCodeAttempts: { ...mg.teamCodeAttempts, [id]: next } } : { ...mg, codeAttempts: next };
  }
  if (!allowed || mg[field]?.[id] !== undefined) return undefined;
  return { ...mg, [field]: { ...mg[field], [id]: value } };
}

// Central controller recovery uses persisted deadlines even after a reload.
export function partyTransition(room, timestamp) {
  const mg = room.currentMinigame;
  if (!mg || !PARTY_GAMES.includes(mg.name) || !PARTY_SECONDS[mg.phase]) return null;
  const ids = mg.participantIds ?? [];
  const expired = timestamp >= mg.phaseStartedAt + PARTY_SECONDS[mg.phase] * 1000;
  const allIn = (field, voters = ids) => voters.length > 0 && voters.every(id => mg[field]?.[id] !== undefined);
  const result = awards => ({ phase: 'results', awards });
  const duelResult = (awards, winnerIds) => ({ ...result(awards), winnerIds, winnerId: winnerIds.length === 1 ? winnerIds[0] : null });
  const points = mg.pointsValue ?? mg.diceValue ?? 0;
  if (mg.phase === 'choosing' && (expired || allIn('lanePicks'))) {
    const awards = {};
    ids.forEach(id => {
      const lane = mg.lanePicks?.[id];
      if (Number.isInteger(lane) && ids.filter(other => mg.lanePicks?.[other] === lane).length === 1) awards[id] = points * [0.5, 0.75, 1][lane];
    });
    if (mg.type === 'duel') {
      const top = Math.max(0, ...Object.values(awards));
      return duelResult(awards, ids.filter(id => top > 0 && awards[id] === top));
    }
    return result(awards);
  }
  if (mg.phase === 'mission_prep' && (expired || allIn('missionReady', [mg.tPlayerId, mg.pPlayerId]))) return { phase: 'performing' };
  if (mg.phase === 'performing' && expired) return { phase: 'judging' };
  if (mg.phase === 'judging') {
    const actors = [mg.tPlayerId, mg.pPlayerId];
    const audience = ids.filter(id => !actors.includes(id));
    if (!expired && !allIn('missionVotes', audience)) return null;
    const votes = audience.map(id => mg.missionVotes?.[id]).filter(Boolean);
    const winners = actors.filter((_, i) => votes.length > 0 && votes.filter(v => v[i]).length > votes.length / 2);
    return { phase: 'results', winnerIds: winners, winnerId: winners.length === 1 ? winners[0] : null };
  }
  if (mg.phase === 'decoding') {
    if (mg.type === 'duel') {
      const captains = [mg.tPlayerId, mg.pPlayerId];
      const winner = captains.find(id => mg.teamCodeAttempts?.[id]?.some(attempt => attempt.code === mg.code));
      const exhausted = captains.every(id => (mg.teamCodeAttempts?.[id]?.length ?? 0) >= 3);
      if (winner || expired || exhausted) {
        const winners = winner ? ids.filter(id => mg.codeTeams?.[id] === winner) : [];
        return { ...duelResult(Object.fromEntries(winners.map(id => [id, points])), winner ? [winner] : []), codeSolved: !!winner };
      }
      return null;
    }
    const solved = (mg.codeAttempts ?? []).some(a => a.code === mg.code);
    if (solved || expired || mg.codeAttempts?.length >= 3) return { ...result(solved ? Object.fromEntries(ids.map(id => [id, points])) : {}), codeSolved: solved };
  }
  if (mg.phase === 'studying' && expired) return { phase: 'recalling' };
  if (mg.phase === 'recalling' && (expired || allIn('memoAnswers'))) {
    const questions = memoQuestions(mg.memoScene, mg.contentLanguage);
    const scores = Object.fromEntries(ids.map(id => [id, (mg.memoQuestionIds ?? []).filter((q, i) => mg.memoAnswers?.[id]?.[i] === questions[q].answer).length]));
    if (mg.type === 'duel') {
      const top = Math.max(0, ...Object.values(scores));
      const winners = ids.filter(id => top > 0 && scores[id] === top);
      return { ...duelResult(Object.fromEntries(winners.map(id => [id, points / winners.length])), winners), scores };
    }
    return { ...result(Object.fromEntries(ids.map(id => [id, points * scores[id] / 3]))), scores };
  }
  return null;
}
