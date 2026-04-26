// Solo — Petit Bac
// Phases: dice → letter → playing → voting → complete
import { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';
import SlotMachineLetter from '../components/SlotMachineLetter';
import Countdown from '../components/Countdown';
import { shuffle } from '../utils';

export default function PetitBacSolo() {
  const { game, myPlayerId, isTPlayer, isSpectator,
          updateMinigame, setMinigameReady, castVote, completeMinigame,
          getLobbyPool } = useGame();
  const mg      = game?.currentMinigame;
  const players = game?.players ?? {};
  const spectatorIds = Object.keys(players).filter(id => id !== mg?.tPlayerId);
  const tName = players[mg?.tPlayerId]?.name;

  // ── TPlayer: advance letter → playing once ready ────────────────────
  useEffect(() => {
    if (mg?.phase !== 'letter' || !isTPlayer) return;
    if (!mg.readyPlayers?.[mg.tPlayerId]) return;
    const cats = shuffle(getLobbyPool()).slice(0, 7);
    updateMinigame({ gameCategories: cats, phase: 'playing', countdownStartedAt: Date.now() });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.readyPlayers, mg?.phase]);

  // ── TPlayer: tally votes → complete ────────────────────────────────
  useEffect(() => {
    if (mg?.phase !== 'voting' || !isTPlayer) return;
    const votes = mg.votes ?? {};
    if (Object.keys(votes).length < spectatorIds.length) return;
    const yes = Object.values(votes).filter(v => v === 'yes').length;
    const won = yes > spectatorIds.length / 2;
    updateMinigame({ phase: 'complete', winnerId: won ? mg.tPlayerId : null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.votes, mg?.phase]);

  if (!mg) return <div className="page page-center"><div className="spinner" /></div>;

  // ── DICE ─────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Petit Bac" subtitle={tName} />
        {isTPlayer
          ? <DiceRoll onResult={val => {
              const letters = 'ABCDEFGHIJLMNOPQRSTU'.split('');
              const letter  = letters[Math.floor(Math.random() * letters.length)];
              updateMinigame({ diceValue: val, pointsValue: val, letter, phase: 'letter' });
            }} />
          : <p className="muted" style={{ textAlign: 'center' }}>En attente du lancer de dé...</p>}
      </div>
    );
  }

  // ── LETTER ────────────────────────────────────────────────────────────
  if (mg.phase === 'letter') {
    const myReady = mg.readyPlayers?.[myPlayerId];
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Petit Bac" subtitle={`${mg.diceValue} pt${mg.diceValue > 1 ? 's' : ''}`} />
        <SlotMachineLetter targetLetter={mg.letter} />
        {isTPlayer && !myReady && (
          <button className="btn btn-success btn-large" onClick={setMinigameReady}>Prêt !</button>
        )}
        {(myReady || !isTPlayer) && <p className="muted" style={{ textAlign: 'center' }}>Préparez-vous...</p>}
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────
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

  // ── VOTING ────────────────────────────────────────────────────────────
  if (mg.phase === 'voting') {
    return (
      <div className="page page-minigame">
        <MgHeader title="Vote" subtitle={`${tName} a-t-il/elle réussi ?`} />
        <div className="vote-yesno">
          {['yes', 'no'].map(choice => {
            const count  = Object.values(mg.votes ?? {}).filter(v => v === choice).length;
            const myVote = mg.votes?.[myPlayerId];
            return (
              <button key={choice}
                className={`btn ${choice === 'yes' ? 'btn-vote-yes' : 'btn-vote-no'} ${myVote === choice ? 'voted' : ''}`}
                onClick={() => isSpectator && !myVote && castVote(choice)}
                disabled={!isSpectator || !!myVote}
              >
                {choice === 'yes' ? '✅ Oui' : '❌ Non'} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>
        <p className="muted" style={{ textAlign: 'center' }}>
          {Object.keys(mg.votes ?? {}).length}/{spectatorIds.length} votes
        </p>
        {isTPlayer && <p className="muted" style={{ textAlign: 'center' }}>Tu ne peux pas voter sur toi-même.</p>}
      </div>
    );
  }

  // ── COMPLETE ──────────────────────────────────────────────────────────
  if (mg.phase === 'complete') {
    const won = !!mg.winnerId;
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Résultat" />
        <div className="result-banner card">
          <p className="result-winner">{won ? `🏆 ${tName}` : '😬 Raté !'}</p>
          {won && <p className="muted">+{mg.diceValue} point{mg.diceValue > 1 ? 's' : ''}</p>}
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
