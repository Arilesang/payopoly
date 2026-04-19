// Solo — Mot Melangés (AI-generated jumbled word)
// Phases: dice → category_display → playing → voting → complete
import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';
import Countdown from '../components/Countdown';
import { shuffle } from '../utils';

export default function MotMelanges() {
  const { game, myPlayerId, isTPlayer, isSpectator,
          updateMinigame, setMinigameReady, castVote, completeMinigame,
          getLobbyPool } = useGame();
  const mg      = game?.currentMinigame;
  const players = game?.players ?? {};
  const [loadingAI, setLoadingAI] = useState(false);
  const spectatorIds = Object.keys(players).filter(id => id !== mg?.tPlayerId);
  const tName = players[mg?.tPlayerId]?.name;

  // ── TPlayer: fetch AI jumble then advance to playing ─────────────────
  useEffect(() => {
    if (mg?.phase !== 'category_display' || !isTPlayer) return;
    if (!mg.readyPlayers?.[mg.tPlayerId]) return;
    if (mg.jumbledWord) {
      // Word already fetched — advance to playing
      updateMinigame({ phase: 'playing', countdownStartedAt: Date.now() });
      return;
    }
    // Fetch from AI
    if (loadingAI) return;
    setLoadingAI(true);
    fetch('/api/jumble', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: mg.category, difficulty: mg.difficulty }),
    })
      .then(r => r.json())
      .then(data => updateMinigame({ jumbledWord: data.jumbled, originalWord: data.original }))
      .catch(err => console.error('Jumble API error', err))
      .finally(() => setLoadingAI(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.readyPlayers, mg?.jumbledWord, mg?.phase]);

  // ── Once word is fetched, advance to playing ─────────────────────────
  useEffect(() => {
    if (mg?.phase !== 'category_display' || !isTPlayer) return;
    if (!mg.readyPlayers?.[mg.tPlayerId] || !mg.jumbledWord) return;
    updateMinigame({ phase: 'playing', countdownStartedAt: Date.now() });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.jumbledWord]);

  // ── TPlayer: tally votes → complete ──────────────────────────────────
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

  // ── DICE ──────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Mot Melangés" subtitle={tName} />
        {isTPlayer
          ? <DiceRoll onResult={val => {
              const cat = shuffle(getLobbyPool())[0] ?? '?';
              updateMinigame({ diceValue: val, difficulty: val, category: cat, phase: 'category_display' });
            }} />
          : <p className="muted" style={{ textAlign: 'center' }}>En attente du lancer de dé...</p>}
      </div>
    );
  }

  // ── CATEGORY DISPLAY ─────────────────────────────────────────────────
  if (mg.phase === 'category_display') {
    const myReady = mg.readyPlayers?.[mg.tPlayerId];
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Mot Melangés" subtitle={`Difficulté ${mg.difficulty}/6`} />
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="label">Catégorie</p>
          <p className="mg-category">{mg.category}</p>
        </div>
        {isTPlayer && !myReady && (
          <button className="btn btn-success btn-large" onClick={setMinigameReady}>
            Prêt !
          </button>
        )}
        {(myReady || !isTPlayer) && (
          <p className="muted" style={{ textAlign: 'center' }}>
            {loadingAI ? '⏳ Génération du mot...' : 'Préparation...'}
          </p>
        )}
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────
  if (mg.phase === 'playing') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Mot Melangés" subtitle={mg.category} />
        <Countdown startedAt={mg.countdownStartedAt} />
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="label">Trouve le mot</p>
          <p className="jumbled-word">{mg.jumbledWord}</p>
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
        <MgHeader title="Vote" subtitle={`${tName} a-t-il/elle trouvé ?`} />
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
        {isTPlayer && (
          <div className="card" style={{ textAlign: 'center', marginTop: 8 }}>
            <p className="label">Réponse</p>
            <p style={{ fontWeight: 700, fontSize: 20 }}>{mg.originalWord}</p>
          </div>
        )}
      </div>
    );
  }

  // ── COMPLETE ──────────────────────────────────────────────────────────
  if (mg.phase === 'complete') {
    const won = !!mg.winnerId;
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Résultat" />
        <div className="result-banner card" style={{ textAlign: 'center' }}>
          {won
            ? <p className="result-winner">🏆 {tName} +{mg.diceValue} pts</p>
            : <p className="result-winner">😬 Raté !</p>}
          <p className="muted">Le mot était : <strong>{mg.originalWord}</strong></p>
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
