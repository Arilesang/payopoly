// ALL — Pictionary
// Phases: dice → category_select → word_reveal → playing → voting → bonus_pick → complete
import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';
import Countdown from '../components/Countdown';
import DrawingCanvas from '../components/DrawingCanvas';

export default function PictionaryAll() {
  const {
    game, myPlayerId, isTPlayer, isSpectator,
    updateMinigame, castVote, completeMinigame,
    pushDrawingStroke, updateCurrentStroke, clearDrawing,
  } = useGame();

  const mg          = game?.currentMinigame;
  const players     = game?.players ?? {};
  const spectatorIds = Object.keys(players).filter(id => id !== mg?.tPlayerId);
  const tName       = players[mg?.tPlayerId]?.name;
  const myCategories = game?.players?.[myPlayerId]?.categories ?? [];

  const [selecting, setSelecting] = useState(false);

  // TPlayer: auto-advance to voting when 60s expire (via Countdown onExpire)
  // Handled inline in JSX with onExpire prop

  // TPlayer: tally votes → bonus_pick or complete
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

  // ── DICE ──────────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Pictionary" subtitle={tName} />
        {isTPlayer
          ? <DiceRoll onResult={val => updateMinigame({ diceValue: val, pointsValue: val, phase: 'category_select' })} />
          : <p className="muted" style={{ textAlign: 'center' }}>En attente du lancer de dé...</p>}
      </div>
    );
  }

  // ── CATEGORY SELECT ───────────────────────────────────────────────────────
  if (mg.phase === 'category_select') {
    return (
      <div className="page page-minigame">
        <MgHeader title="Pictionary" subtitle={`${mg.diceValue} pt${mg.diceValue > 1 ? 's' : ''}`} />
        {isTPlayer ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p className="label" style={{ textAlign: 'center' }}>Choisis une catégorie à dessiner</p>
            {myCategories.map(cat => (
              <button
                key={cat}
                className="btn btn-category"
                disabled={selecting}
                onClick={() => {
                  if (selecting) return;
                  setSelecting(true);
                  updateMinigame({ category: cat, phase: 'word_reveal' });
                  fetch('/api/pictionary-word', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category: cat, difficulty: mg.diceValue }),
                  })
                    .then(r => r.json())
                    .then(data => updateMinigame({ pictionaryWord: data.word }))
                    .catch(() => updateMinigame({ pictionaryWord: '?' }));
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ textAlign: 'center' }}>{tName} choisit une catégorie...</p>
        )}
      </div>
    );
  }

  // ── WORD REVEAL ───────────────────────────────────────────────────────────
  if (mg.phase === 'word_reveal') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Pictionary" subtitle={`${mg.diceValue} pt${mg.diceValue > 1 ? 's' : ''}`} />
        {isTPlayer ? (
          <>
            <div className="card" style={{ textAlign: 'center' }}>
              <p className="label">Catégorie</p>
              <p className="mg-category">{mg.category}</p>
              <p className="label" style={{ marginTop: 12 }}>Mot à dessiner</p>
              {!mg.pictionaryWord
                ? <div className="spinner" style={{ margin: '8px auto' }} />
                : <p className="mg-category" style={{ color: 'var(--accent)' }}>{mg.pictionaryWord}</p>}
              <hr style={{ margin: '16px 0', opacity: 0.15 }} />
              <p className="muted" style={{ fontSize: 13, textAlign: 'left', lineHeight: 1.6 }}>
                📋 <strong>Règles :</strong> Dessine le mot sans écrire de lettres ni parler. Les autres joueurs devinent à voix haute. Tu as <strong>60 secondes</strong> !
              </p>
            </div>
            {mg.pictionaryWord && (
              <button
                className="btn btn-success btn-large"
                onClick={() => updateMinigame({ phase: 'playing', countdownStartedAt: Date.now() })}
              >
                Prêt à dessiner !
              </button>
            )}
          </>
        ) : (
          <div className="card" style={{ textAlign: 'center' }}>
            <p className="mg-category">{mg.category}</p>
            <p className="muted" style={{ marginTop: 8 }}>{tName} prend connaissance du mot...</p>
          </div>
        )}
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────
  if (mg.phase === 'playing') {
    return (
      <div className="page page-pictionary">
        <div className="pictionary-header">
          <MgHeader
            title="Pictionary"
            subtitle={isTPlayer ? mg.pictionaryWord : `${mg.category} — Devinez !`}
          />
          <Countdown
            startedAt={mg.countdownStartedAt}
            total={60}
            onExpire={() => {
              if (isTPlayer) updateMinigame({ phase: 'voting', wordRevealed: true, currentStroke: null });
            }}
          />
        </div>
        <DrawingCanvas
          isDrawer={isTPlayer}
          strokes={mg.strokes ?? {}}
          currentStroke={mg.currentStroke ?? null}
          onStrokeComplete={stroke => pushDrawingStroke(stroke)}
          onStrokeUpdate={stroke => updateCurrentStroke(stroke)}
          onClear={clearDrawing}
        />
      </div>
    );
  }

  // ── VOTING ────────────────────────────────────────────────────────────────
  if (mg.phase === 'voting') {
    return (
      <div className="page page-minigame">
        <MgHeader title="Vote" subtitle={`${tName} a-t-il/elle réussi ?`} />
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="label">Le mot était</p>
          <p className="mg-category" style={{ color: 'var(--accent)' }}>{mg.pictionaryWord}</p>
        </div>
        <div className="vote-yesno">
          {['yes', 'no'].map(choice => {
            const count  = Object.values(mg.votes ?? {}).filter(v => v === choice).length;
            const myVote = mg.votes?.[myPlayerId];
            return (
              <button
                key={choice}
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

  // ── BONUS PICK ────────────────────────────────────────────────────────────
  if (mg.phase === 'bonus_pick') {
    const others = Object.entries(players).filter(([id]) => id !== mg.tPlayerId);
    return (
      <div className="page page-minigame">
        <MgHeader title="Bonus" subtitle="Qui a deviné le premier ?" />
        {isTPlayer ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {others.map(([id, p]) => (
              <button
                key={id}
                className="btn btn-category"
                onClick={() => updateMinigame({ bonusWinnerId: id, phase: 'complete' })}
              >
                {p.name}
              </button>
            ))}
            <button
              className="btn btn-ghost"
              onClick={() => updateMinigame({ bonusWinnerId: null, phase: 'complete' })}
            >
              Personne
            </button>
          </div>
        ) : (
          <p className="muted" style={{ textAlign: 'center', marginTop: 40 }}>{tName} choisit un bonus...</p>
        )}
      </div>
    );
  }

  // ── COMPLETE ──────────────────────────────────────────────────────────────
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
          <button
            className="btn btn-large btn-primary"
            onClick={() => completeMinigame(mg.winnerId, mg.bonusWinnerId)}
          >
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
