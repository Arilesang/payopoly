import { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
import PartyFrame from './PartyFrame';

export default function CodeCommun() {
  const { game, myPlayerId, setMyEntry } = useGame();
  const { say } = useLang();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const mg = game.currentMinigame;
  const attempts = mg.codeAttempts ?? [];
  const canPlay = mg.participantIds?.includes(myPlayerId);
  async function submit(event) {
    event.preventDefault();
    if (sending || draft.length !== mg.code.length) return;
    setSending(true);
    try { await setMyEntry('codeAttempts', draft); setDraft(''); }
    finally { setSending(false); }
  }
  return <PartyFrame results={<div className="card">
    <h2>{mg.codeSolved ? say('🔓 Code trouvé ensemble !', '🔓 You cracked it together!') : say('🔒 Le coffre reste fermé', '🔒 The vault stays locked')}</h2>
    <p>{say('Le code était', 'The code was')}</p><p className="shared-code">{mg.code}</p>
    <p>{mg.codeSolved ? say('Toute l’équipe marque les points du dé.', 'The whole team earns the die value.') : say('Aucun point cette fois.', 'No points this time.')}</p>
    {Object.entries(mg.codeClues ?? {}).map(([id, clues]) => <p key={id}>{game.players[id]?.name} : {clues.map(clue => `${clue.position} → ${clue.value} − 2 = ${clue.value - 2}`).join(' · ')}</p>)}
  </div>}>
    <div className="card"><h2>{say('Un coffre, un code, toute l’équipe', 'One vault, one code, one team')}</h2>
      <p>{say(`Trouvez le code à ${mg.code?.length ?? 4} chiffres. Chacun possède une partie des indices : parlez-vous !`, `Find the ${mg.code?.length ?? 4}-digit code. Everyone holds part of the clues: talk to each other!`)}</p>
      <p>{say('Trois essais partagés. N’importe qui peut saisir la réponse du groupe. Un zéro au début compte.', 'Three shared attempts. Anyone can enter the group’s answer. A leading zero counts.')}</p></div>
    <div className="card private-clues"><h3>🔎 {say('Tes indices', 'Your clues')}</h3>
      {(mg.codeClues?.[myPlayerId] ?? []).map(clue => <p key={clue.position}>{say(`Le chiffre en position ${clue.position}, augmenté de 2, vaut ${clue.value}.`, `The digit in position ${clue.position}, plus 2, equals ${clue.value}.`)}</p>)}
      {!canPlay && <p>{say('Tu observeras ce tour et joueras au suivant.', 'You will watch this round and play in the next one.')}</p>}
    </div>
    <form className="card code-terminal" onSubmit={submit}>
      <label htmlFor="team-code">{say('Le code du groupe', 'The team’s code')}</label>
      <input id="team-code" className="input shared-code" value={draft} inputMode="numeric" autoComplete="off" maxLength={mg.code?.length ?? 4} disabled={!canPlay || sending}
        onChange={event => setDraft(event.target.value.replace(/\D/g, ''))} />
      <button className="btn btn-success" disabled={!canPlay || sending || draft.length !== mg.code?.length || attempts.length >= 3 || attempts.some(a => a.code === draft)}>{say('Essayer le code', 'Try the code')}</button>
    </form>
    <div className="card" aria-live="polite"><h3>{say('Essais partagés', 'Shared attempts')} · {attempts.length}/3</h3>
      {attempts.map((attempt, i) => <p key={i}>{game.players[attempt.by]?.name} : <strong>{attempt.code}</strong> {attempt.code === mg.code ? '✅' : '❌'}</p>)}
    </div>
  </PartyFrame>;
}
