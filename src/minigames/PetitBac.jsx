import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
import { useText } from '../context/useText';
import MgHeader from '../components/MgHeader';
import DiceRoll from '../components/DiceRoll';
import SlotMachineLetter from '../components/SlotMachineLetter';
import Countdown from '../components/Countdown';
import { shuffle } from '../utils';
import { petitBacParticipants, petitBacVoters, petitBacResult, validPetitBacVote, validPetitBacWord } from '../lib/petitBac';

export default function PetitBac() {
  const tr = useText();
  const { say } = useLang();
  const { game, myPlayerId, isController, updateMinigame, setMinigameReady,
    castVote, completeMinigame, getLobbyPool } = useGame();
  const mg = game?.currentMinigame;
  const participants = petitBacParticipants(mg);
  const amParticipant = participants.includes(myPlayerId);
  const players = game?.players ?? {};
  const voters = mg ? petitBacVoters(game) : [];
  const voteCount = Object.entries(mg?.votes ?? {}).filter(([id, choice]) => validPetitBacVote(game, id, choice)).length;

  useEffect(() => {
    if (mg?.phase !== 'letter' || !isController || !participants.every(id => mg.readyPlayers?.[id])) return;
    updateMinigame({ gameCategories: shuffle(getLobbyPool()).slice(0, 7), bacOrder: shuffle(participants), phase: 'playing' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.phase, mg?.readyPlayers, isController]);

  useEffect(() => {
    if (mg?.phase === 'voting' && isController && voteCount >= voters.length) updateMinigame(petitBacResult(game));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.phase, mg?.votes, isController, voteCount, voters.length]);

  if (!mg) return null;
  const openVoting = () => { if (isController) updateMinigame({ phase: 'voting' }); };

  if (mg.phase === 'dice') return (
    <div className="page page-minigame page-center">
      <MgHeader title={tr('Petit Bac')} subtitle={participants.map(id => players[id]?.name).join(' ⚔️ ')} />
      <DiceRoll onResult={val => {
        const letters = 'ABCDEFGHIJLMNOPQRSTU';
        updateMinigame({ diceValue: val, pointsValue: val, letter: letters[Math.floor(Math.random() * letters.length)], phase: 'letter' });
      }} />
    </div>
  );

  if (mg.phase === 'letter') return (
    <div className="page page-minigame page-center">
      <MgHeader title={tr('Petit Bac')} subtitle={`${mg.diceValue} ${tr('points')}`} />
      <SlotMachineLetter targetLetter={mg.letter} />
      {amParticipant && !mg.readyPlayers?.[myPlayerId]
        ? <button className="btn btn-success btn-large" onClick={setMinigameReady}>{tr('Prêt !')}</button>
        : <p className="muted">{tr('Préparez-vous...')}</p>}
    </div>
  );

  if (mg.phase === 'playing') return (
    <div className="page page-minigame">
      <MgHeader title={tr('Petit Bac')} subtitle={tr('Lettre : {0}', [mg.letter])} />
      <Countdown startedAt={mg.countdownStartedAt} onExpire={openVoting} />
      {amParticipant ? <WordEditor key={mg.id} mg={mg} /> : <>
        <p className="muted">{say('Les réponses apparaissent en direct.', 'Entries appear live.')}</p>
        <EntrySets mg={mg} />
      </>}
    </div>
  );

  if (mg.phase === 'voting') {
    const myVote = mg.votes?.[myPlayerId];
    return (
      <div className="page page-minigame">
        <MgHeader title="Vote" subtitle={mg.type === 'duel'
          ? say('Choisis le meilleur ensemble de réponses.', 'Choose the best set of answers.')
          : tr('{0} a-t-il/elle réussi ?', [players[mg.tPlayerId]?.name])} />
        <Countdown startedAt={mg.phaseStartedAt} total={25} />
        <EntrySets mg={mg} voting={mg.type === 'duel'} />
        {mg.type === 'solo' && <div className="vote-yesno">
          {['yes', 'no'].map(choice => <button key={choice}
            className={`btn ${choice === 'yes' ? 'btn-vote-yes' : 'btn-vote-no'} ${myVote === choice ? 'voted' : ''}`}
            disabled={!voters.includes(myPlayerId) || !!myVote} onClick={() => castVote(choice)}>
            {choice === 'yes' ? tr('✅ Oui') : tr('❌ Non')}
          </button>)}
        </div>}
        <p className="muted" style={{ textAlign: 'center' }}>{voteCount}/{voters.length} votes</p>
        {myVote && <p role="status">{say('✓ Vote enregistré', '✓ Vote recorded')}</p>}
        {amParticipant && <p className="muted">{tr('Tu ne peux pas voter sur toi-même.')}</p>}
      </div>
    );
  }

  if (mg.phase === 'complete') {
    const winners = mg.winnerIds?.length ? mg.winnerIds : mg.winnerId ? [mg.winnerId] : [];
    return (
      <div className="page page-minigame">
        <MgHeader title={tr('Résultat')} />
        <div className="result-banner card">
          <p className="result-winner">{winners.length ? `🏆 ${winners.map(id => players[id]?.name).join(' & ')}` : tr('😬 Raté !')}</p>
          <p>{winners.length ? `+${mg.pointsValue / winners.length} ${tr('points')}` : `0 ${tr('points')}`}</p>
        </div>
        <EntrySets mg={mg} reveal />
        {isController && <button className="btn btn-large btn-primary" onClick={() => completeMinigame(mg.winnerId)}>{tr('Continuer')}</button>}
      </div>
    );
  }
  return null;
}

function WordEditor({ mg }) {
  const { myPlayerId, savePetitBacWord } = useGame();
  const { say } = useLang();
  const [selected, setSelected] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [saveError, setSaveError] = useState(false);
  const categories = mg.gameCategories ?? [];
  function edit(index, value) {
    setDrafts(current => ({ ...current, [index]: value }));
    // Invalid drafts never appear on spectators' screens or in the final ballot.
    const saved = !value.trim() || validPetitBacWord(value, mg.letter) ? value : '';
    savePetitBacWord(index, saved).then(ok => setSaveError(!ok)).catch(() => setSaveError(true));
  }
  return (
    <div className="card bac-editor">
      <p>{say(`Clique sur une catégorie et écris un mot commençant par ${mg.letter}. Les mots valides sont enregistrés automatiquement.`, `Click a category and type a word starting with ${mg.letter}. Valid words save automatically.`)}</p>
      <div className="bac-category-list">
        {categories.map((category, index) => {
          const value = drafts[index] ?? mg.bacEntries?.[myPlayerId]?.[index] ?? '';
          const invalid = !!value.trim() && !validPetitBacWord(value, mg.letter);
          return <div key={index} className="bac-category-entry">
            <button className="btn btn-category" aria-expanded={selected === index} aria-controls={`bac-word-${index}`} onClick={() => setSelected(index)}>
              <strong>{category}</strong><span>{value || say('Ajouter un mot', 'Add a word')}</span>
            </button>
            {selected === index && <div id={`bac-word-${index}`}>
              <input className="input" aria-label={category} aria-invalid={invalid} aria-describedby={invalid ? `bac-error-${index}` : undefined}
                value={value} maxLength={60} autoFocus autoComplete="off" onChange={e => edit(index, e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !invalid) setSelected(index + 1 < categories.length ? index + 1 : null); }} />
              {invalid && <p id={`bac-error-${index}`} className="error-msg" role="alert">{say(`Le mot doit commencer par ${mg.letter}.`, `The word must start with ${mg.letter}.`)}</p>}
            </div>}
          </div>;
        })}
      </div>
      {saveError && <p className="error-msg" role="alert">{say('Enregistrement impossible. Réessaie avant la fin du chrono.', 'Could not save. Try again before the timer ends.')}</p>}
    </div>
  );
}

function EntrySets({ mg, voting = false, reveal = false }) {
  const { game, myPlayerId, castVote } = useGame();
  const { say } = useLang();
  const order = mg.bacOrder ?? petitBacParticipants(mg);
  const myVote = mg.votes?.[myPlayerId];
  return <div className="bac-sets">
    {order.map((id, index) => {
      const label = mg.type === 'solo' ? say('Réponses', 'Answers') : say(`Ensemble ${String.fromCharCode(65 + index)}`, `Set ${String.fromCharCode(65 + index)}`);
      return <section className="card bac-set" key={id} aria-label={label}>
        <h2>{label}{reveal ? ` — ${game.players[id]?.name ?? ''}` : ''}</h2>
        <dl>{(mg.gameCategories ?? []).map((category, i) => <div className="bac-answer" key={i}>
          <dt>{category}</dt><dd>{mg.bacEntries?.[id]?.[i] || '—'}</dd>
        </div>)}</dl>
        {voting && <button className={`btn btn-category ${myVote === id ? 'voted' : ''}`}
          disabled={!!myVote || !validPetitBacVote(game, myPlayerId, id)} onClick={() => castVote(id)}>
          {say(`Voter pour ${label}`, `Vote for ${label}`)}
          {id === myPlayerId ? say(' (tes réponses)', ' (your answers)') : ''}
        </button>}
      </section>;
    })}
  </div>;
}
