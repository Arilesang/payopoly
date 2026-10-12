import { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
import { rankingRows } from '../lib/rankings';
import Leaderboard from './Leaderboard';

export default function ScoreSheet() {
  const { game, myPlayerId, isHost } = useGame();
  const { say, t } = useLang();
  const [open, setOpen] = useState(false);
  const dialog = useRef(null);
  const trigger = useRef(null);
  const touchStart = useRef(null);

  useEffect(() => {
    if (!open) return;
    const node = dialog.current;
    const button = trigger.current;
    node.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      node.close();
      document.body.style.overflow = overflow;
      button?.focus();
    };
  }, [open]);

  if (!game) return null;
  const rows = rankingRows(game);
  const mine = rows.find(row => row.id === myPlayerId);
  const hasResult = !!game.history?.length;
  const close = () => setOpen(false);
  return <>
    <div className="score-sheet-space" aria-hidden="true" />
    <button ref={trigger} className="score-sheet-trigger" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
      <span>🏆 {say('Classement', 'Rankings')} ↑</span>
      {mine && <span className="score-sheet-position">#{mine.rank} · {mine.points} pts</span>}
    </button>
    <dialog ref={dialog} className="score-sheet" aria-labelledby="score-sheet-title" aria-describedby="score-sheet-subtitle" onCancel={close} onClose={close}
      onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="score-sheet-content">
        <div className="score-sheet-handle" aria-hidden="true"
          onTouchStart={event => { touchStart.current = event.touches[0].clientY; }}
          onTouchEnd={event => { if (touchStart.current !== null && event.changedTouches[0].clientY - touchStart.current > 50) close(); touchStart.current = null; }}><span /></div>
        <header className="score-sheet-header">
          <div><h2 id="score-sheet-title">{say('Classement', 'Rankings')}</h2>
            <p id="score-sheet-subtitle">{hasResult ? say('Après le dernier mini-jeu terminé', 'After the last completed game') : say('Aucun mini-jeu terminé', 'No completed games yet')}</p></div>
          <button className="btn-close" onClick={close} aria-label={say('Fermer', 'Close')}>✕</button>
        </header>
        <div className="score-sheet-scroll">
          <table className="score-sheet-table">
            <thead><tr><th scope="col">{say('Joueur', 'Player')}</th><th scope="col">Total</th><th scope="col">{say('Dernier jeu', 'Last game')}</th><th scope="col">{say('Rang ±', 'Move')}</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.id} className={row.id === myPlayerId ? 'score-sheet-me' : ''}>
              <th scope="row"><span className="score-sheet-rank">{row.rank}</span><span className="score-sheet-name">{row.name}{row.id === myPlayerId && <small> {say('(toi)', '(you)')}</small>}</span></th>
              <td>{row.points}</td>
              <td className={row.delta > 0 ? 'score-gain' : row.delta < 0 ? 'score-loss' : ''}>{hasResult ? `${row.delta > 0 ? '+' : ''}${row.delta}` : '—'}</td>
              <td className={row.movement > 0 ? 'score-gain' : row.movement < 0 ? 'score-loss' : ''} aria-label={row.movement ? say(`${row.movement > 0 ? 'Monte' : 'Descend'} de ${Math.abs(row.movement)} places`, `${row.movement > 0 ? 'Up' : 'Down'} ${Math.abs(row.movement)} places`) : say('Rang inchangé', 'Rank unchanged')}>
                {row.movement ? `${row.movement > 0 ? '↑' : '↓'} ${Math.abs(row.movement)}` : '—'}
              </td>
            </tr>)}</tbody>
          </table>
          <p className="score-sheet-legend">{say('Dernier jeu = points gagnés/perdus · Flèches = changement de rang', 'Last game = points gained/lost · Arrows = rank change')}</p>
          {(isHost || game.devMode) && <details className="score-sheet-management">
            <summary>{say('Gérer les joueurs et les points', 'Manage players and scores')}</summary>
            <Leaderboard players={game.players ?? {}} t={t} />
          </details>}
          <p className="score-sheet-live">{say('Le mini-jeu continue pendant la consultation.', 'The mini-game continues while you view rankings.')}</p>
        </div>
      </div>
    </dialog>
  </>;
}
