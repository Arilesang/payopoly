export default function Leaderboard({ players, t }) {
  const sorted = Object.entries(players)
    .map(([id, p]) => ({ id, name: p.name, points: p.points ?? 0 }))
    .sort((a, b) => b.points - a.points);

  return (
    <div className="leaderboard card">
      <h3 className="leaderboard-title">{t('game.leaderboard')}</h3>
      {sorted.map((p, i) => (
        <div key={p.id} className="leaderboard-row">
          <span className="lb-rank">{i + 1}.</span>
          <span className="lb-name">{p.name}</span>
          <span className="lb-points">{p.points} {t('game.points')}</span>
        </div>
      ))}
    </div>
  );
}
