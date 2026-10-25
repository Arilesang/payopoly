// Only the listeners judge whether the speaker avoided every forbidden word.
export function motInterditResult(mg, playerIds) {
  const votes = playerIds.filter(id => id !== mg.tPlayerId).map(id => mg.votes?.[id]);
  const yes = votes.filter(v => v === 'yes').length;
  const no = votes.filter(v => v === 'no').length;
  return { phase: 'complete', winnerId: mg.foundBy && yes > no ? mg.tPlayerId : null };
}
