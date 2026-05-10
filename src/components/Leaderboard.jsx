import { useGame } from '../context/GameContext';

export default function Leaderboard({ players, t }) {
  const { isHost, game, myPlayerId, adjustPoints, removePlayer } = useGame();
  const devMode = game?.devMode ?? false;
  const isMidMinigame = !!game?.currentMinigame;

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
          {devMode && (
            <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
              <button
                className="btn btn-small btn-ghost"
                style={{ padding: '2px 8px', minWidth: 28 }}
                onClick={() => adjustPoints(p.id, -1)}
              >
                −
              </button>
              <button
                className="btn btn-small btn-ghost"
                style={{ padding: '2px 8px', minWidth: 28 }}
                onClick={() => adjustPoints(p.id, 1)}
              >
                +
              </button>
            </div>
          )}
          {isHost && p.id !== myPlayerId && !isMidMinigame && (
            <button
              className="btn btn-small btn-ghost"
              style={{ color: 'var(--danger, #e74c3c)', padding: '2px 8px', fontSize: '0.75rem', marginLeft: devMode ? '4px' : 'auto' }}
              onClick={() => removePlayer(p.id)}
              title={t('game.removePlayer')}
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
