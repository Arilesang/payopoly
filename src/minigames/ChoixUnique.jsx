import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
import { LANE_LABELS } from '../data/partyGames';
import { payoutCap, roundAwards } from '../lib/session';
import { TallyLine } from '../components/MgHeader';
import PartyFrame from './PartyFrame';

export default function ChoixUnique() {
  const { game, myPlayerId, setMyEntry } = useGame();
  const { say } = useLang();
  const mg = game.currentMinigame;
  const ids = mg.participantIds ?? [];
  const mine = mg.lanePicks?.[myPlayerId];
  const awards = roundAwards(game);
  return <PartyFrame results={<>
    <h2>{say('Seul ou collision ?', 'Alone or a collision?')}</h2>
    {LANE_LABELS.map((label, lane) => {
      const occupants = ids.filter(id => mg.lanePicks?.[id] === lane);
      return <div className={`card lane-result ${occupants.length === 1 ? 'lane-winner' : ''}`} key={lane}>
        <h3>{['🏕️', '🛤️', '💎'][lane]} {say(label.fr, label.en)}</h3>
        <p>{occupants.length === 0 ? say('Personne', 'Nobody') : occupants.map(id => game.players[id]?.name).join(' · ')}</p>
        <strong>{occupants.length === 1 ? `+${awards[occupants[0]] ?? 0}` : occupants.length > 1 ? say('Collision · 0 point', 'Collision · 0 points') : '—'}</strong>
      </div>;
    })}
    {ids.some(id => mg.lanePicks?.[id] === undefined) && <p className="muted">{say('Sans choix : ', 'No pick: ')}{ids.filter(id => mg.lanePicks?.[id] === undefined).map(id => game.players[id]?.name).join(', ')}</p>}
  </>}>
    <div className="card"><h2>{say('Choisis ta voie en secret', 'Choose your lane in secret')}</h2>
      <p>{say('Tu marques seulement si tu es seul dans ta voie. Plus la récompense est grande, plus elle attire !', 'You score only if you are alone in your lane. Bigger rewards draw a bigger crowd!')}</p></div>
    <div className="lane-options">{LANE_LABELS.map((label, lane) => <button key={lane}
      className={`btn btn-category lane-option ${mine === lane ? 'voted' : ''}`} disabled={mine !== undefined || !ids.includes(myPlayerId)}
      onClick={() => setMyEntry('lanePicks', lane)}>
      <span className="lane-icon">{['🏕️', '🛤️', '💎'][lane]}</span><span>{say(label.fr, label.en)}</span>
      <strong>{Math.round(payoutCap(game) * [0.5, 0.75, 1][lane] * 10) / 10} {say('points', 'points')}</strong>
    </button>)}</div>
    {mine !== undefined && <p role="status">🔒 {say('Choix verrouillé. Les autres ne le voient pas.', 'Pick locked. The others cannot see it.')}</p>}
    <TallyLine done={ids.filter(id => mg.lanePicks?.[id] !== undefined).length} total={ids.length} label={say('ont choisi', 'have chosen')} />
  </PartyFrame>;
}
