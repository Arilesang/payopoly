import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
import { MISSIONS } from '../data/partyGames';
import { TallyLine } from '../components/MgHeader';
import PartyFrame from './PartyFrame';

export default function MissionImpossible() {
  const { game, myPlayerId, setMyEntry } = useGame();
  const { say } = useLang();
  const [revealed, setRevealed] = useState(false);
  const [verdict, setVerdict] = useState([null, null]);
  const mg = game.currentMinigame;
  const mission = MISSIONS[mg.missionIndex ?? 0];
  const language = mg.contentLanguage === 'en' ? 'en' : 'fr';
  const actors = [mg.tPlayerId, mg.pPlayerId];
  const actorIndex = actors.indexOf(myPlayerId);
  const audience = (mg.participantIds ?? []).filter(id => !actors.includes(id));
  const isJudge = audience.includes(myPlayerId);
  const voted = mg.missionVotes?.[myPlayerId] !== undefined;
  const shownVerdict = mg.missionVotes?.[myPlayerId] ?? verdict;
  const publicReveal = ['judging', 'results'].includes(mg.phase);
  return <PartyFrame results={<>
    <div className="card"><h2>{say('Les missions révélées', 'The missions revealed')}</h2><p>{mission.scene[language]}</p>
      {actors.map((id, i) => <div className="mission-result" key={id}>
        <h3>{game.players[id]?.name} · {mission.roles[i][language]}</h3><p>{mission.objectives[i][language]}</p>
        <strong>{mg.winnerIds?.includes(id) ? say('✅ Mission accomplie', '✅ Mission accomplished') : say('❌ Mission non validée', '❌ Mission not confirmed')}</strong>
        <p className="muted">{audience.filter(judge => mg.missionVotes?.[judge]?.[i] === true).length}/{audience.filter(judge => mg.missionVotes?.[judge] !== undefined).length} {say('oui', 'yes')}</p>
      </div>)}
      {!Object.keys(mg.missionVotes ?? {}).length && <p>{say('Aucun vote : aucun point.', 'No votes: no points.')}</p>}
    </div>
  </>}>
    <div className="card"><p className="label">{say('La scène', 'The scene')}</p><h2>{mission.scene[language]}</h2>
      <p>{actors.map((id, i) => `${game.players[id]?.name} : ${mission.roles[i][language]}`).join(' · ')}</p></div>
    {!publicReveal && actorIndex >= 0 && <div className="card secret-mission">
      <button className="btn btn-ghost" aria-expanded={revealed} onClick={() => setRevealed(!revealed)}>{revealed ? say('Masquer ma mission', 'Hide my mission') : say('Voir ma mission secrète', 'Show my secret mission')}</button>
      {revealed && <p>{mission.objectives[actorIndex][language]}</p>}
      {mg.phase === 'mission_prep' && <button className="btn btn-success" disabled={!revealed || mg.missionReady?.[myPlayerId]} onClick={() => setMyEntry('missionReady', true)}>{mg.missionReady?.[myPlayerId] ? say('Prêt !', 'Ready!') : say('J’ai lu ma mission · prêt', 'I read my mission · ready')}</button>}
    </div>}
    {mg.phase === 'mission_prep' && <p role="status">{say('Les acteurs découvrent leurs missions. La scène commence quand ils sont prêts, ou après 15 secondes.', 'The actors are reading their missions. The scene starts when both are ready, or after 15 seconds.')}</p>}
    {mg.phase === 'performing' && <div className="card performance-cue"><h2>🎭 {say('Action !', 'Action!')}</h2><p>{say('Improvisez la scène à voix haute. Réussissez votre mission sans la dévoiler ! Public : observez bien.', 'Act out the scene aloud. Complete your mission without giving it away! Audience: watch closely.')}</p></div>}
    {mg.phase === 'judging' && <>
      <h2>{say('Qui a accompli sa mission ?', 'Who accomplished their mission?')}</h2>
      {actors.map((id, i) => <div className="card" key={id}><h3>{game.players[id]?.name}</h3><p>{mission.objectives[i][language]}</p>
        {isJudge && <div className="mission-verdict">{[true, false].map(v => <button key={String(v)} className={`btn ${shownVerdict[i] === v ? 'btn-primary' : 'btn-ghost'}`} disabled={voted}
          aria-label={`${game.players[id]?.name}: ${v ? say('Oui', 'Yes') : say('Non', 'No')}`} aria-pressed={shownVerdict[i] === v}
          onClick={() => setVerdict(old => old.map((entry, index) => index === i ? v : entry))}>{v ? say('Oui', 'Yes') : say('Non', 'No')}</button>)}</div>}
      </div>)}
      {isJudge ? <button className="btn btn-success" disabled={voted || verdict.some(v => v === null)} onClick={() => setMyEntry('missionVotes', verdict)}>{voted ? say('Vote enregistré', 'Vote recorded') : say('Valider les deux missions', 'Confirm both verdicts')}</button>
        : <p>{say('Le public vote en secret. Les acteurs ne votent pas.', 'The audience votes in secret. Actors do not vote.')}</p>}
      <TallyLine done={audience.filter(id => mg.missionVotes?.[id] !== undefined).length} total={audience.length} label={say('ont voté', 'have voted')} />
    </>}
  </PartyFrame>;
}
