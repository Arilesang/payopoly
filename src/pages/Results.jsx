import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
export default function Results() {
  const { game, isHost, rematch } = useGame();
  const { say } = useLang();
  const [busy, setBusy] = useState(false);
  const players = Object.entries(game?.players ?? {}).map(([id, p]) => ({ id, ...p })).sort((a, b) => b.points - a.points);
  async function again() { setBusy(true); try { await rematch(); } finally { setBusy(false); } }
  return <div className="page page-center">
    <p className="label">{say('Partie terminée', 'Game complete')}</p>
    <h1>🏆 {say('Classement final', 'Final standings')}</h1>
    <p>{say('Bien joué à toute la table !', 'Well played, everyone!')}</p>
    <div className="card podium">
      {players.map((p, i) => {
        const rank = players.filter(other => other.points > p.points).length + 1;
        return <div className="mg-row" key={p.id}><span>{rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `${rank}.`} {p.name}{i > 0 && p.points === players[i - 1].points ? say(' (égalité)', ' (tie)') : ''}</span><strong>{p.points ?? 0} pts</strong></div>;
      })}
    </div>
    {isHost ? <button className="btn btn-primary" disabled={busy} onClick={again}>{say('Rejouer avec le même groupe', 'Play again with this group')}</button> : <p>{say('L’hôte peut lancer une revanche.', 'The host can start a rematch.')}</p>}
    <Link className="btn btn-ghost" to="/">{say('Accueil', 'Home')}</Link>
  </div>;
}
