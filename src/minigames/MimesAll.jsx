// ALL — Mimes
// Phases: dice → category_reveal → playing → voting → bonus_pick → complete
import { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';
import Countdown from '../components/Countdown';
import { shuffle } from '../utils';

export default function MimesAll() {
  const { game, myPlayerId, isTPlayer, isSpectator,
          updateMinigame, setMinigameReady, castVote, completeMinigame,
          getLobbyPool } = useGame();
  const mg      = game?.currentMinigame;
  const players = game?.players ?? {};
  const spectatorIds = Object.keys(players).filter(id => id !== mg?.tPlayerId);
  const tName = players[mg?.tPlayerId]?.name;

  // ── TPlayer: category_reveal → playing once ready ───────────────────
  useEffect(() => {
    if (mg?.phase !== 'category_reveal' || !isTPlayer) return;
    if (!mg.readyPlayers?.[mg.tPlayerId]) return;
    updateMinigame({ phase: 'playing', countdownStartedAt: Date.now() });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.readyPlayers, mg?.phase]);

  // ── TPlayer: tally votes → bonus_pick or complete ───────────────────
  useEffect(() => {
    if (mg?.phase !== 'voting' || !isTPlayer) return;
    const votes = mg.votes ?? {};
    if (Object.keys(votes).length < spectatorIds.length) return;
    const yes = Object.values(votes).filter(v => v === 'yes').length;
    const won = yes > spectatorIds.length / 2;
    if (won) updateMinigame({ phase: 'bonus_pick', winnerId: mg.tPlayerId });
    else     updateMinigame({ phase: 'complete',   winnerId: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.votes, mg?.phase]);

  if (!mg) return <div className="page page-center"><div className="spinner" /></div>;

  // ── DICE ─────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Mimes" subtitle={tName} />
        {isTPlayer
          ? <DiceRoll onResult={val => {
              const cat = shuffle(getLobbyPool())[0] ?? '?';
              updateMinigame({ diceValue: val, category: cat, phase: 'category_reveal' });
            }} />
          : <p className="muted" style={{ textAlign: 'center' }}>En attente du lancer de dé...</p>}
      </div>
    );
  }

  // ── CATEGORY REVEAL ───────────────────────────────────────────────────
  if (mg.phase === 'category_reveal') {
    const myReady = mg.readyPlayers?.[mg.tPlayerId];
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Mimes" subtitle={`${mg.diceValue} pt${mg.diceValue > 1 ? 's' : ''}`} />
        {isTPlayer ? (
          <>
            <div className="card" style={{ textAlign: 'center' }}>
              <p className="label">Ta catégorie (secrète)</p>
              <p className="mg-category">{mg.category}</p>
            </div>
            {!myReady && (
              <button className="btn btn-success btn-large" onClick={setMinigameReady}>Prêt !</button>
            )}
            {myReady && <p className="muted">Préparation...</p>}
          </>
        ) : (
          <p className="muted" style={{ textAlign: 'center' }}>Le joueur prend connaissance de sa catégorie...</p>
        )}
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────
  if (mg.phase === 'playing') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Mimes" subtitle={isTPlayer ? mg.category : '🙊 Catégorie cachée'} />
        <Countdown startedAt={mg.countdownStartedAt} />
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
        <MgHeader title="Vote" subtitle={`${tName} a-t-il/elle réussi le mime ?`} />
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
        {isTPlayer && <p className="muted" style={{ textAlign: 'center' }}>Tu ne peux pas voter.</p>}
      </div>
    );
  }

  // ── BONUS PICK ────────────────────────────────────────────────────────
  if (mg.phase === 'bonus_pick') {
    const others = Object.entries(players).filter(([id]) => id !== mg.tPlayerId);
    return (
      <div className="page page-minigame">
        <MgHeader title="Bonus" subtitle="Qui a deviné le premier ?" />
        {isTPlayer ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {others.map(([id, p]) => (
              <button key={id} className="btn btn-category"
                onClick={() => updateMinigame({ bonusWinnerId: id, phase: 'complete' })}>
                {p.name}
              </button>
            ))}
            <button className="btn btn-ghost"
              onClick={() => updateMinigame({ bonusWinnerId: null, phase: 'complete' })}>
              Personne
            </button>
          </div>
        ) : (
          <p className="muted" style={{ textAlign: 'center', marginTop: 40 }}>{tName} choisit un bonus...</p>
        )}
      </div>
    );
  }

  // ── COMPLETE ──────────────────────────────────────────────────────────
  if (mg.phase === 'complete') {
    const bonusName = mg.bonusWinnerId ? players[mg.bonusWinnerId]?.name : null;
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Résultat" />
        <div className="result-banner card">
          {mg.winnerId
            ? <p className="result-winner">🏆 {tName} +{mg.diceValue} pts</p>
            : <p className="result-winner">😬 Raté !</p>}
          {bonusName && <p className="muted">🎉 {bonusName} +{mg.diceValue} pts (bonus)</p>}
        </div>
        {isTPlayer && (
          <button className="btn btn-large btn-primary"
            onClick={() => completeMinigame(mg.winnerId, mg.bonusWinnerId)}>
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
