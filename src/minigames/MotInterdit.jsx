// ALL (showcase → race) — Le Mot Interdit
// The turn player describes a word out loud without saying five forbidden ones.
// Everyone else races to type it. First correct guess ends the round — no vote.
// Phases: dice → category_select → word_reveal → playing → complete
import { useEffect, useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';
import Countdown from '../components/Countdown';
import MgHeader, { Waiting } from '../components/MgHeader';
import { isMatch } from '../utils';

const ROUND_SECONDS = 90;

export default function MotInterdit() {
  const { game, myPlayerId, isTPlayer, updateMinigame, pushEntry, completeMinigame } = useGame();

  const mg      = game?.currentMinigame;
  const players = game?.players ?? {};
  const tName   = players[mg?.tPlayerId]?.name;
  const myCategories = players[myPlayerId]?.categories ?? [];

  const [selecting, setSelecting] = useState(false);
  const [draft, setDraft] = useState('');
  const feedRef = useRef(null);

  // Guesses arrive as a push-keyed map; the feed wants them oldest-first.
  const guesses = Object.entries(mg?.guesses ?? {})
    .map(([key, g]) => ({ key, ...g }))
    .sort((a, b) => (a.at ?? 0) - (b.at ?? 0));

  // ── TPlayer judges: only they hold the word, so only they can score it ───
  useEffect(() => {
    if (mg?.phase !== 'playing' || !isTPlayer || !mg.tabooWord || mg.foundBy) return;
    const hit = guesses.find(g => isMatch(g.text, mg.tabooWord));
    if (!hit) return;
    updateMinigame({ foundBy: hit.playerId, foundAt: hit.at ?? Date.now(), phase: 'complete' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.guesses, mg?.phase]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [guesses.length]);

  function submitGuess() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    pushEntry('guesses', { playerId: myPlayerId, text, at: Date.now() });
  }

  if (!mg) return <div className="page page-center"><div className="spinner" /></div>;

  // ── DICE ────────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Mot Interdit" subtitle={tName} />
        {isTPlayer
          ? <DiceRoll onResult={val => updateMinigame({
              diceValue: val, pointsValue: val, difficulty: val, phase: 'category_select',
            })} />
          : <Waiting text="En attente du lancer de dé..." />}
      </div>
    );
  }

  // ── CATEGORY SELECT ─────────────────────────────────────────────────────
  if (mg.phase === 'category_select') {
    return (
      <div className="page page-minigame">
        <MgHeader title="Mot Interdit" subtitle={`Difficulté ${mg.difficulty}/6`} />
        {isTPlayer ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p className="label" style={{ textAlign: 'center' }}>Choisis une catégorie à faire deviner</p>
            {myCategories.map(cat => (
              <button
                key={cat}
                className="btn btn-category"
                disabled={selecting}
                onClick={() => {
                  if (selecting) return;
                  setSelecting(true);
                  updateMinigame({ category: cat, phase: 'word_reveal' });
                  fetch('/api/taboo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category: cat, difficulty: mg.diceValue }),
                  })
                    .then(r => r.json())
                    .then(data => updateMinigame({
                      tabooWord: data.word ?? '?',
                      forbiddenWords: data.forbidden ?? [],
                    }))
                    .catch(() => updateMinigame({ tabooWord: '?', forbiddenWords: [] }));
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        ) : (
          <Waiting text={`${tName} choisit une catégorie...`} />
        )}
      </div>
    );
  }

  // ── WORD REVEAL ─────────────────────────────────────────────────────────
  if (mg.phase === 'word_reveal') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Mot Interdit" subtitle={`${mg.diceValue} pt${mg.diceValue > 1 ? 's' : ''}`} />
        {isTPlayer ? (
          <>
            <div className="card" style={{ textAlign: 'center' }}>
              <p className="label">Catégorie</p>
              <p className="mg-category">{mg.category}</p>
              <p className="label" style={{ marginTop: 12 }}>Mot à faire deviner</p>
              {!mg.tabooWord
                ? <div className="spinner" style={{ margin: '8px auto' }} />
                : <p className="mg-category" style={{ color: 'var(--accent)' }}>{mg.tabooWord}</p>}

              {mg.forbiddenWords?.length > 0 && (
                <>
                  <p className="label" style={{ marginTop: 14 }}>Mots interdits</p>
                  <div className="taboo-list">
                    {mg.forbiddenWords.map(w => <span key={w} className="taboo-chip">{w}</span>)}
                  </div>
                </>
              )}

              <hr style={{ margin: '16px 0', opacity: 0.15 }} />
              <p className="muted" style={{ fontSize: 13, textAlign: 'left', lineHeight: 1.6 }}>
                📋 <strong>Règles :</strong> décris le mot à voix haute sans jamais prononcer le mot
                lui-même ni aucun des mots interdits. Les autres tapent leurs réponses.
                Le premier qui trouve marque autant de points que toi. <strong>90 secondes.</strong>
              </p>
            </div>
            {mg.tabooWord && (
              <button
                className="btn btn-success btn-large"
                onClick={() => updateMinigame({ phase: 'playing', countdownStartedAt: Date.now() })}
              >
                C'est parti !
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

  // ── PLAYING ─────────────────────────────────────────────────────────────
  if (mg.phase === 'playing') {
    return (
      <div className="page page-minigame">
        <div className="pictionary-header">
          <MgHeader
            title="Mot Interdit"
            subtitle={isTPlayer ? mg.tabooWord : `${mg.category} — Devinez !`}
          />
          <Countdown
            startedAt={mg.countdownStartedAt}
            total={ROUND_SECONDS}
            onExpire={() => { if (isTPlayer) updateMinigame({ phase: 'complete' }); }}
          />
        </div>

        {isTPlayer && mg.forbiddenWords?.length > 0 && (
          <div className="taboo-list" style={{ justifyContent: 'center' }}>
            {mg.forbiddenWords.map(w => <span key={w} className="taboo-chip taboo-chip-live">{w}</span>)}
          </div>
        )}

        <div className="guess-feed" ref={feedRef}>
          {guesses.length === 0 && (
            <p className="muted" style={{ textAlign: 'center', padding: 12 }}>
              {isTPlayer ? 'Décris le mot — les réponses arrivent ici.' : 'Tape ta réponse !'}
            </p>
          )}
          {guesses.map(g => (
            <div key={g.key} className="guess-line">
              <span className="guess-author">{players[g.playerId]?.name}</span>
              <span className="guess-text">{g.text}</span>
            </div>
          ))}
        </div>

        {!isTPlayer && (
          <div className="guess-input-row">
            <input
              className="input"
              placeholder="Ta réponse..."
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitGuess()}
              autoFocus
              autoComplete="off"
            />
            <button className="btn btn-primary" onClick={submitGuess} disabled={!draft.trim()}>
              Envoyer
            </button>
          </div>
        )}

        {isTPlayer && (
          <button className="btn btn-ghost" onClick={() => updateMinigame({ phase: 'complete' })}>
            Abandonner le mot
          </button>
        )}
      </div>
    );
  }

  // ── COMPLETE ────────────────────────────────────────────────────────────
  if (mg.phase === 'complete') {
    const points     = mg.pointsValue ?? 0;
    const finderName = mg.foundBy ? players[mg.foundBy]?.name : null;
    const awards     = mg.foundBy ? { [mg.tPlayerId]: points, [mg.foundBy]: points } : {};

    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Résultat" />
        <div className="result-banner card">
          {finderName
            ? <>
                <p className="result-winner">🏆 {finderName} a trouvé !</p>
                <p className="muted">{finderName} +{points} pts · {tName} +{points} pts</p>
              </>
            : <p className="result-winner">😬 Personne n'a trouvé !</p>}
          <p className="muted" style={{ marginTop: 8 }}>
            Le mot était : <strong>{mg.tabooWord}</strong>
          </p>
        </div>
        {isTPlayer
          ? <button className="btn btn-large btn-primary" onClick={() => completeMinigame(awards)}>
              Continuer
            </button>
          : <Waiting text={`${tName} va continuer...`} />}
      </div>
    );
  }

  return null;
}
