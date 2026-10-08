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
      <div className="leaderboard-grid">
        {sorted.map((p, i) => (
          <div key={p.id} className={`leaderboard-row ${i === 0 ? 'is-leading' : ''}`}>
            <span className="lb-rank" aria-label={`${i + 1}`}>{i === 0 ? '★' : `${i + 1}.`}</span>
            <span className="lb-name" title={p.name}>{p.name}</span>
            <span className="lb-points">{p.points}<small> {t('game.points')}</small></span>
            {(devMode || (isHost && p.id !== myPlayerId && !isMidMinigame)) && <div className="lb-controls">
            {devMode && (
              <>
                <button
                  className="btn btn-small btn-ghost"
                  aria-label={`${p.name} −1 ${t('game.points')}`}
                  onClick={() => adjustPoints(p.id, -1)}
                >
                  −
                </button>
                <button
                  className="btn btn-small btn-ghost"
                  aria-label={`${p.name} +1 ${t('game.points')}`}
                  onClick={() => adjustPoints(p.id, 1)}
                >
                  +
                </button>
              </>
            )}
            {isHost && p.id !== myPlayerId && !isMidMinigame && (
              <button
                className="btn btn-small btn-ghost"
                onClick={() => removePlayer(p.id)}
                title={t('game.removePlayer')}
                aria-label={`${t('game.removePlayer')}: ${p.name}`}
              >
                ✕
              </button>
            )}
            </div>}
          </div>
        ))}
      </div>
    </div>
  );
}
