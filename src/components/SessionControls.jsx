import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
export default function SessionControls({ compact = false }) {
  const { game, connected, isHost, isController, skipTurn, onlinePlayerIds } = useGame();
  const { say } = useLang();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  async function skip() {
    setBusy(true);
    try { await skipTurn(); setConfirm(false); } finally { setBusy(false); }
  }
  return <aside className="session-controls">
    <span>{say('Tour', 'Turn')} {Math.min((game?.turnsPlayed ?? 0) + 1, game?.totalTurns ?? 1)}/{game?.totalTurns ?? '—'}</span>
    {game?.currentTurn?.playerId && !onlinePlayerIds.includes(game.currentTurn.playerId) && <span role="status">{say('Le joueur actif est déconnecté. L’hôte peut passer le tour.', 'The active player is offline. The host can skip the turn.')}</span>}
    <span role="status" aria-label={connected ? say('Connecté', 'Connected') : say('Reconnexion…', 'Reconnecting…')}>{compact ? (connected ? '●' : '◌') : connected ? say('Connecté', 'Connected') : say('Reconnexion…', 'Reconnecting…')}</span>
    {(isHost || isController) && <button className="btn btn-small btn-ghost" aria-label={say('Passer le tour', 'Skip turn')} title={say('Passer le tour', 'Skip turn')} onClick={() => setConfirm(true)}>{compact ? '⏭' : say('Passer le tour', 'Skip turn')}</button>}
    {confirm && <div className="overlay"><div className="card modal" role="dialog" aria-modal="true" aria-labelledby="skip-title">
      <h2 id="skip-title">{say('Passer ce tour ?', 'Skip this turn?')}</h2>
      <p>{say('Aucun point ne sera attribué. Le joueur suivant pourra jouer.', 'No points will be awarded. The next player can play.')}</p>
      <button className="btn btn-primary" onClick={skip} disabled={busy}>{say('Passer', 'Skip')}</button>
      <button className="btn btn-ghost" onClick={() => setConfirm(false)}>{say('Annuler', 'Cancel')}</button>
    </div></div>}
  </aside>;
}
