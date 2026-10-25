import { useText } from '../context/useText';
// ALL (showcase → race) — Le Mot Interdit
// The turn player describes a word out loud without saying five forbidden ones.
// Everyone else races to type it, then judges the speaker after the reveal.
// Phases: dice → category_select → word_reveal → playing → voting → complete
import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';
import Countdown from '../components/Countdown';
import MgHeader, { Waiting } from '../components/MgHeader';
import { isMatch } from '../utils';
import VotePanel from '../components/VotePanel';
import { motInterditResult } from '../lib/motInterdit';
import { roundAwards } from '../lib/session';
import { now } from '../lib/clock';

const ROUND_SECONDS = 90;

export default function MotInterdit() {
  const tr = useText();
  const { game, myPlayerId, isTPlayer, updateMinigame, pushEntry, castVote, completeMinigame, isController, fetchContent } = useGame();

  const mg      = game?.currentMinigame;
  const players = game?.players ?? {};
  const tName   = players[mg?.tPlayerId]?.name;
  const myCategories = players[myPlayerId]?.categories ?? [];

  const [selecting, setSelecting] = useState(false);
  const [draft, setDraft] = useState('');
  const feedRef = useRef(null);
  const followFeed = useRef(true);
  const voterIds = Object.keys(players).filter(id => id !== mg?.tPlayerId);

  // Guesses arrive as a push-keyed map; the feed wants them oldest-first.
  const guesses = Object.entries(mg?.guesses ?? {})
    .map(([key, g]) => ({ key, ...g }))
    .sort((a, b) => (a.at ?? 0) - (b.at ?? 0));

  // The controller stops guessing as soon as a listener finds the word.
  useEffect(() => {
    if (mg?.phase !== 'playing' || !isController || !mg.tabooWord || mg.foundBy) return;
    const hit = guesses.find(g => g.playerId !== mg.tPlayerId && players[g.playerId] && isMatch(g.text, mg.tabooWord));
    if (!hit) return;
    updateMinigame({ foundBy: hit.playerId, foundAt: hit.at ?? now(), phase: 'voting', voteDeadline: now() + 25000 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.guesses, mg?.phase, isController]);

  useEffect(() => {
    if (mg?.phase !== 'voting' || !isController) return;
    if (!voterIds.every(id => ['yes', 'no'].includes(mg.votes?.[id]))) return;
    updateMinigame(motInterditResult(mg, Object.keys(players)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.votes, mg?.phase, game?.players, isController]);

  useLayoutEffect(() => { followFeed.current = true; }, [mg?.id, mg?.phase]);
  useLayoutEffect(() => {
    if (feedRef.current && followFeed.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [guesses.length, mg?.phase]);

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
        <MgHeader title={tr("Mot Interdit")} subtitle={tName} />
        {isTPlayer
          ? <DiceRoll onResult={val => updateMinigame({
              diceValue: val, pointsValue: val, difficulty: val, phase: 'category_select',
            })} />
          : <Waiting text={tr("En attente du lancer de dé...")} />}
      </div>
    );
  }

  // ── CATEGORY SELECT ─────────────────────────────────────────────────────
  if (mg.phase === 'category_select') {
    return (
      <div className="page page-minigame">
        <MgHeader title={tr("Mot Interdit")} subtitle={tr("Difficulté {0}/6", [mg.difficulty])} />
        {isTPlayer ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p className="label" style={{ textAlign: 'center' }}>{tr("Choisis une catégorie à faire deviner")}</p>
            {myCategories.map(cat => (
              <button
                key={cat}
                className="btn btn-category"
                disabled={selecting}
                onClick={() => {
                  if (selecting) return;
                  setSelecting(true);
                  updateMinigame({ category: cat, phase: 'word_reveal' });
                  fetchContent('/api/taboo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category: cat, difficulty: mg.diceValue }),
                  })

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
          <Waiting text={tr("{0} choisit une catégorie...", [tName])} />
        )}
      </div>
    );
  }

  // ── WORD REVEAL ─────────────────────────────────────────────────────────
  if (mg.phase === 'word_reveal') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Mot Interdit")} subtitle={`${mg.diceValue} pt${mg.diceValue > 1 ? 's' : ''}`} />
        {isTPlayer ? (
          <>
            <div className="card" style={{ textAlign: 'center' }}>
              <p className="label">{tr("Catégorie")}</p>
              <p className="mg-category">{mg.category}</p>
              <p className="label" style={{ marginTop: 12 }}>{tr("Mot à faire deviner")}</p>
              {!mg.tabooWord
                ? <div className="spinner" style={{ margin: '8px auto' }} />
                : <p className="mg-category" style={{ color: 'var(--accent)' }}>{mg.tabooWord}</p>}

              {mg.forbiddenWords?.length > 0 && (
                <>
                  <p className="label" style={{ marginTop: 14 }}>{tr("Mots interdits")}</p>
                  <div className="taboo-list">
                    {mg.forbiddenWords.map(w => <span key={w} className="taboo-chip">{w}</span>)}
                  </div>
                </>
              )}

              <hr style={{ margin: '16px 0', opacity: 0.15 }} />
              <p className="muted" style={{ fontSize: 13, textAlign: 'left', lineHeight: 1.6 }}>
                📋 <strong>{tr("Règles :")}</strong> {tr("Décris le mot sans prononcer le mot lui-même ni les mots interdits. Après une bonne réponse, les autres votent : s'ils valident la manche, toi et le premier qui trouve marquez les points du dé.")} <strong>{tr("90 secondes.")}</strong>
              </p>
            </div>
            {mg.tabooWord && (
              <button
                className="btn btn-success btn-large"
                onClick={() => updateMinigame({ phase: 'playing', countdownStartedAt: Date.now() })}
              > {tr("C'est parti !")} </button>
            )}
          </>
        ) : (
          <div className="card" style={{ textAlign: 'center' }}>
            <p className="mg-category">{mg.category}</p>
            <p className="muted" style={{ marginTop: 8 }}>{tName} {tr("prend connaissance du mot...")}</p>
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
            title={tr("Mot Interdit")}
            subtitle={isTPlayer ? mg.tabooWord : tr("{0} — Devinez !", [mg.category])}
          />
          <Countdown
            startedAt={mg.countdownStartedAt}
            total={ROUND_SECONDS}
            onExpire={() => { if (isController) updateMinigame({ phase: 'complete' }); }}
          />
        </div>

        {isTPlayer && mg.forbiddenWords?.length > 0 && (
          <div className="taboo-list" style={{ justifyContent: 'center' }}>
            {mg.forbiddenWords.map(w => <span key={w} className="taboo-chip taboo-chip-live">{w}</span>)}
          </div>
        )}

        <div className="guess-feed" ref={feedRef} onScroll={e => {
          const feed = e.currentTarget;
          followFeed.current = feed.scrollHeight - feed.clientHeight - feed.scrollTop <= 2;
        }}>
          {guesses.length === 0 && (
            <p className="muted" style={{ textAlign: 'center', padding: 12 }}>
              {isTPlayer ? tr("Décris le mot — les réponses arrivent ici.") : tr("Tape ta réponse !")}
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
              placeholder={tr("Ta réponse...")}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitGuess()}
              autoFocus
              autoComplete="off"
            />
            <button className="btn btn-primary" onClick={submitGuess} disabled={!draft.trim()}> {tr("Envoyer")} </button>
          </div>
        )}

        {isTPlayer && (
          <button className="btn btn-ghost" onClick={() => updateMinigame({ phase: 'complete' })}> {tr("Abandonner le mot")} </button>
        )}
      </div>
    );
  }

  // Secret words are revealed to the listeners only after guessing ends.
  if (mg.phase === 'voting') {
    return (
      <div className="page page-minigame">
        <MgHeader title={tr("Vote")} subtitle={tr("{0} a trouvé !", [players[mg.foundBy]?.name])} />
        <Countdown startedAt={mg.phaseStartedAt} total={25} />
        <div className="card">
          <p className="label">{tr("Le mot était")}</p>
          <p className="mg-category">{mg.tabooWord}</p>
          <p className="label">{tr("Mots interdits")}</p>
          <div className="taboo-list">
            {(mg.forbiddenWords ?? []).map(w => <span key={w} className="taboo-chip">{w}</span>)}
          </div>
        </div>
        <VotePanel mode="yesno" eligibleVoterIds={voterIds} players={players} votes={mg.votes}
          onVote={castVote} myPlayerId={myPlayerId}
          label={tr("{0} a-t-il/elle évité tous les mots interdits ?", [tName])} />
      </div>
    );
  }

  // ── COMPLETE ────────────────────────────────────────────────────────────
  if (mg.phase === 'complete') {
    const points     = mg.pointsValue ?? 0;
    const finderName = mg.foundBy ? players[mg.foundBy]?.name : null;
    const awards     = roundAwards(game);

    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Résultat")} />
        <div className="result-banner card">
          {finderName
            ? <>
                <p className="result-winner">🏆 {finderName} {tr("a trouvé !")}</p>
                <p className="muted">{mg.winnerId === mg.tPlayerId
                  ? `${finderName} +${points} pts · ${tName} +${points} pts`
                  : tr("Manche non validée : aucun point.")}</p>
              </>
            : <p className="result-winner">{tr("😬 Personne n'a trouvé !")}</p>}
          <p className="muted" style={{ marginTop: 8 }}> {tr("Le mot était :")} <strong>{mg.tabooWord}</strong>
          </p>
          <div className="taboo-list">
            {(mg.forbiddenWords ?? []).map(w => <span key={w} className="taboo-chip">{w}</span>)}
          </div>
        </div>
        {isController
          ? <button className="btn btn-large btn-primary" onClick={() => completeMinigame(awards)}> {tr("Continuer")} </button>
          : <Waiting text={tr("{0} va continuer...", [tName])} />}
      </div>
    );
  }

  return null;
}
