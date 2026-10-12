// Competition ranking gives equal scores the same position (1, 1, 3).
export function scoreRanks(scores) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  let rank = 0;
  return Object.fromEntries(sorted.map(([id, points], index) => {
    if (index === 0 || points !== sorted[index - 1][1]) rank = index + 1;
    return [id, rank];
  }));
}

export function rankingRows(game) {
  const players = game.players ?? {};
  const last = game.history?.slice(-1)[0];
  const scores = Object.fromEntries(Object.entries(players).map(([id, p]) => [id, p.points ?? 0]));
  const ranks = scoreRanks(scores);
  const before = last?.scoresBefore ?? Object.fromEntries(Object.entries(scores).map(([id, points]) => [id, Math.round((points - (last?.awards?.[id] ?? 0)) * 10) / 10]));
  const previousRanks = scoreRanks(before);
  const resultRanks = last?.scoresAfter ? scoreRanks(last.scoresAfter) : ranks;
  return Object.entries(players).map(([id, p]) => ({
    id, name: p.name, points: scores[id], rank: ranks[id],
    delta: last?.awards?.[id] ?? 0,
    movement: last && previousRanks[id] && resultRanks[id] ? previousRanks[id] - resultRanks[id] : 0,
  })).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}
