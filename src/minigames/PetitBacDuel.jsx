// Duel — Petit Bac
// Phases: dice → letter → playing → voting → complete
import { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';
import SlotMachineLetter from '../components/SlotMachineLetter';
import Countdown from '../components/Countdown';
import { shuffle } from '../utils';

export default function PetitBacDuel() {
  const { game, myPlayerId, isTPlayer, isPPlayer, isSpectator,
          updateMinigame, setMinigameReady, castVote, completeMinigame,
          getLobbyPool } = useGame();
  const mg      = game?.currentMinigame;
  const players = game?.players ?? {};

  const participantIds = [mg?.tPlayerId, mg?.pPlayerId].filter(Boolean);
  const spectatorIds   = Object.keys(players).filter(id => !participantIds.includes(id));

  // ── TPlayer: advance letter → playing once both participants are ready ──
  useEffect(() => {
    if (mg?.phase !== 'letter' || !isTPlayer) return;
    const bothReady = participantIds.every(id => mg.readyPlayers?.[id]);
    if (!bothReady) return;
    const cats = shuffle(getLobbyPool()).slice(0, 7);
    updateMinigame({ gameCategories: cats, phase: 'playing', countdownStartedAt: Date.now() });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.readyPlayers, mg?.phase]);

  // ── TPlayer: tally votes → complete ────────────────────────────────────
  useEffect(() => {
    if (mg?.phase !== 'voting' || !isTPlayer) return;
    const votes = mg.votes ?? {};
    if (Object.keys(votes).length < spectatorIds.length) return;
    const tally = {};
    Object.values(votes).forEach(v => { tally[v] = (tally[v] ?? 0) + 1; });
    const winnerId = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    updateMinigame({ phase: 'complete', winnerId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.votes, mg?.phase]);

  if (!mg) return <div className="page page-center"><div className="spinner" /></div>;

  const tName = players[mg.tPlayerId]?.name;
  const pName = players[mg.pPlayerId]?.name;

  // ── DICE ───────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Petit Bac" subtitle={`${tName} ⚔️ ${pName}`} />
        {isTPlayer
          ? <DiceRoll onResult={val => {
              const letters = 'ABCDEFGHIJLMNOPQRSTU'.split('');
              const letter  = letters[Math.floor(Math.random() * letters.length)];
              updateMinigame({ diceValue: val, pointsValue: val, letter, phase: 'letter' });
            }} />
          : <Waiting text="En attente du lancer de dé..." />}
      </div>
    );
  }

  // ── LETTER ─────────────────────────────────────────────────────────────
  if (mg.phase === 'letter') {
    const myReady = mg.readyPlayers?.[myPlayerId];
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Petit Bac" subtitle={`${mg.diceValue} point${mg.diceValue > 1 ? 's' : ''}`} />
        <SlotMachineLetter targetLetter={mg.letter} />
        {(isTPlayer || isPPlayer) && !myReady && (
          <button className="btn btn-success btn-large" onClick={setMinigameReady}>Prêt !</button>
        )}
        {myReady && <p className="muted">En attente de l'autre joueur...</p>}
        {isSpectator && <Waiting text="Les joueurs se préparent..." />}
      </div>
    );
  }

  // ── PLAYING ────────────────────────────────────────────────────────────
  if (mg.phase === 'playing') {
    return (
      <div className="page page-minigame">
        <MgHeader title="Petit Bac" subtitle={`Lettre : ${mg.letter}`} />
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Countdown startedAt={mg.countdownStartedAt} />
        </div>
        <div className="card">
          <p className="label">7 catégories</p>
          <div className="category-grid">
            {(mg.gameCategories ?? []).map((c, i) => <div key={i} className="cat-chip">{c}</div>)}
          </div>
        </div>
        {isTPlayer && (
          <button className="btn btn-primary" onClick={() => updateMinigame({ phase: 'voting' })}>
            Temps écoulé → Voter
          </button>
        )}
      </div>
    );
  }

  // ── VOTING ─────────────────────────────────────────────────────────────
  if (mg.phase === 'voting') {
    return (
      <div className="page page-minigame">
        <MgHeader title="Vote" subtitle="Qui a gagné ?" />
        <div className="vote-pick card">
          {[mg.tPlayerId, mg.pPlayerId].map(id => {
            const count  = Object.values(mg.votes ?? {}).filter(v => v === id).length;
            const myVote = mg.votes?.[myPlayerId];
            return (
              <button key={id}
                className={`btn btn-category ${myVote === id ? 'voted' : ''}`}
                onClick={() => isSpectator && !myVote && castVote(id)}
                disabled={!isSpectator || !!myVote}
              >
                {players[id]?.name} {count > 0 ? `— ${count} vote${count > 1 ? 's' : ''}` : ''}
              </button>
            );
          })}
        </div>
        <p className="muted" style={{ textAlign: 'center' }}>
          {Object.keys(mg.votes ?? {}).length}/{spectatorIds.length} votes
        </p>
        {!isSpectator && <p className="muted" style={{ textAlign: 'center' }}>Tu ne peux pas voter dans ce duel.</p>}
      </div>
    );
  }

  // ── COMPLETE ───────────────────────────────────────────────────────────
  if (mg.phase === 'complete') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Résultat" />
        <div className="result-banner card">
          <p className="result-winner">🏆 {players[mg.winnerId]?.name ?? '—'}</p>
          <p className="muted">+{mg.diceValue} point{mg.diceValue > 1 ? 's' : ''}</p>
        </div>
        {isTPlayer && (
          <button className="btn btn-large btn-primary" onClick={() => completeMinigame(mg.winnerId)}>
            Continuer
          </button>
        )}
      </div>
    );
  }

  return null;
}

function MgHeader({ title, subtitle }) {
  return (
    <div className="mg-header">
      <h1 className="mg-title">{title}</h1>
      {subtitle && <p className="mg-subtitle">{subtitle}</p>}
    </div>
  );
}
function Waiting({ text }) {
  return <p className="muted" style={{ textAlign: 'center' }}>{text}</p>;
}
