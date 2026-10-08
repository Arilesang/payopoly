import { useText } from '../context/useText';
// ALL (mêlée) — Qui a écrit ça ?
// Everyone answers the same prompt, then everyone tries to match each answer
// back to its author.
// Phases: dice → writing → attributing → results
import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';
import Countdown from '../components/Countdown';
import MgHeader, { Waiting, TallyLine } from '../components/MgHeader';
import { shuffle } from '../utils';

const WRITE_SECONDS   = 45;
const ATTRIB_SECONDS  = 60;
// Above this the attribution grid stops fitting on a phone, so a big lobby
// writes in full and a random subset goes up for guessing.
const MAX_ON_SHOW     = 6;

export default function QuiAEcrit() {
  const tr = useText();
  const { game, myPlayerId, isTPlayer, updateMinigame, setMyEntry, completeMinigame, getLobbyPool,  isController, fetchContent,} = useGame();

  const mg        = game?.currentMinigame;
  const players   = game?.players ?? {};
  const playerIds = game?.playerOrder?.filter(id => players[id]) ?? Object.keys(players);
  const tName     = players[mg?.tPlayerId]?.name;

  const submissions  = mg?.submissions ?? {};
  const options      = mg?.options ?? [];
  const attributions = mg?.attributions ?? {};

  const [draft, setDraft]   = useState('');
  const [assign, setAssign] = useState({});

  // ── TPlayer: everyone wrote (or time up) → put answers up for guessing ──
  useEffect(() => {
    if (mg?.phase !== 'writing' || !isController) return;
    if (Object.keys(submissions).length < playerIds.length) return;
    openAttributing();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.submissions, mg?.phase, isController]);

  // ── TPlayer: everyone attributed → score ───────────────────────────────
  useEffect(() => {
    if (mg?.phase !== 'attributing' || !isController) return;
    if (Object.keys(attributions).length < playerIds.length) return;
    score();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.attributions, mg?.phase, isController]);

  function openAttributing() {
    const written = Object.entries(submissions)
      .map(([playerId, raw]) => ({ playerId, text: (raw ?? '').trim() }))
      .filter(s => s.text);

    const opts = shuffle(written)
      .slice(0, MAX_ON_SHOW)
      .map((s, i) => ({ id: `s${i}`, text: s.text, authorId: s.playerId }));

    if (opts.length < 2) {   // nothing to guess between
      updateMinigame({ phase: 'results', options: opts, scores: {}, awards: {} });
      return;
    }
    updateMinigame({ options: opts, phase: 'attributing', countdownStartedAt: Date.now() });
  }

  function score() {
    const points = mg.pointsValue ?? 0;
    const opts   = mg.options ?? [];
    const awards = {};
    const detail = {};
    const add = (id, n) => { awards[id] = (awards[id] ?? 0) + n; };

    playerIds.forEach(id => { detail[id] = { correct: 0, unmasked: 0, hidden: false }; });

    // Points for every author you place correctly.
    Object.entries(attributions).forEach(([voterId, map]) => {
      Object.entries(map ?? {}).forEach(([subId, guessedAuthorId]) => {
        const opt = opts.find(o => o.id === subId);
        if (!opt || opt.authorId === voterId) return;   // own answer is not scored
        if (opt.authorId === guessedAuthorId) {
          if (detail[voterId]) detail[voterId].correct += 1;
          add(voterId, points);
        }
      });
    });

    // Points for staying anonymous — only for authors actually put on show.
    opts.forEach(opt => {
      const guessers = Object.entries(attributions)
        .filter(([voterId]) => voterId !== opt.authorId)
        .filter(([, map]) => map?.[opt.id] === opt.authorId);
      if (!detail[opt.authorId]) return;
      detail[opt.authorId].unmasked = guessers.length;
      if (guessers.length === 0) {
        detail[opt.authorId].hidden = true;
        add(opt.authorId, points);
      }
    });

    updateMinigame({ phase: 'results', scores: detail, awards });
  }

  if (!mg) return <div className="page page-center"><div className="spinner" /></div>;

  // ── DICE ────────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Qui a écrit ça ?")} subtitle={tr("Tout le monde joue !")} />
        {isTPlayer
          ? <DiceRoll onResult={val => {
              const cat = shuffle(getLobbyPool())[0] ?? 'Général';
              updateMinigame({
                diceValue: val, pointsValue: val, category: cat,
                phase: 'writing', countdownStartedAt: Date.now(),
              });
              fetchContent('/api/prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: cat }),
              })

                .then(data => updateMinigame({ promptText: data.prompt ?? `${cat} : raconte.` }))
                .catch(() => updateMinigame({ promptText: `${cat} : décris ça en trois mots.` }));
            }} />
          : <Waiting text={tr("En attente du lancer de dé...")} />}
      </div>
    );
  }

  // ── WRITING ─────────────────────────────────────────────────────────────
  if (mg.phase === 'writing') {
    const mine = submissions[myPlayerId];
    const done = Object.keys(submissions).length;

    if (!mg.promptText) {
      return (
        <div className="page page-minigame page-center">
          <MgHeader title={tr("Qui a écrit ça ?")} subtitle={mg.category} />
          <div className="spinner" />
          <Waiting text={tr("Génération de la question...")} />
        </div>
      );
    }

    return (
      <div className="page page-minigame">
        <MgHeader title={tr("Qui a écrit ça ?")} subtitle={mg.category} />

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Countdown
            startedAt={mg.countdownStartedAt}
            total={WRITE_SECONDS}
            onExpire={() => { if (isController) openAttributing(); }}
          />
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <p className="label">Question</p>
          <p className="prompt-text">{mg.promptText}</p>
        </div>

        {!mine ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p className="muted" style={{ fontSize: 13 }}> {tr("Écris ta réponse. Les autres devront deviner que c'est toi.")} </p>
            <input
              className="input"
              placeholder={tr("Ta réponse...")}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && draft.trim() && setMyEntry('submissions', draft.trim())}
              maxLength={90}
              autoFocus
              autoComplete="off"
            />
            <button
              className="btn btn-success"
              onClick={() => setMyEntry('submissions', draft.trim())}
              disabled={!draft.trim()}
            > {tr("Envoyer")} </button>
          </div>
        ) : (
          <Waiting text={tr("Réponse envoyée. En attente des autres...")} />
        )}

        <TallyLine done={done} total={playerIds.length} label={tr("ont répondu")} />
      </div>
    );
  }

  // ── ATTRIBUTING ─────────────────────────────────────────────────────────
  if (mg.phase === 'attributing') {
    const mySubmitted = !!attributions[myPlayerId];
    // Your own answer is not yours to guess.
    const toGuess     = options.filter(o => o.authorId !== myPlayerId);
    const allAssigned = toGuess.every(o => assign[o.id]);
    const done        = Object.keys(attributions).length;

    return (
      <div className="page page-minigame">
        <MgHeader title={tr("Qui a écrit ça ?")} subtitle={tr("Attribue chaque réponse")} />

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Countdown
            startedAt={mg.countdownStartedAt}
            total={ATTRIB_SECONDS}
            onExpire={() => { if (isController) score(); }}
          />
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <p className="prompt-text" style={{ fontSize: 16 }}>{mg.promptText}</p>
        </div>

        {mySubmitted ? (
          <Waiting text={tr("Réponses envoyées. En attente des autres...")} />
        ) : (
          <>
            {toGuess.map(opt => (
              <div key={opt.id} className="card attrib-card">
                <p className="attrib-text">{opt.text}</p>
                <div className="attrib-names">
                  {playerIds.filter(id => id !== myPlayerId).map(id => (
                    <button
                      key={id}
                      className={`btn btn-small attrib-chip ${assign[opt.id] === id ? 'voted' : ''}`}
                      onClick={() => setAssign(a => ({ ...a, [opt.id]: id }))}
                    >
                      {players[id]?.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              className="btn btn-success btn-large"
              onClick={() => setMyEntry('attributions', assign)}
              disabled={!allAssigned}
            >
              {allAssigned ? tr("Valider mes réponses") : tr("Attribue toutes les réponses")}
            </button>
          </>
        )}

        <TallyLine done={done} total={playerIds.length} label={tr("ont attribué")} />
      </div>
    );
  }

  // ── RESULTS ─────────────────────────────────────────────────────────────
  if (mg.phase === 'results') {
    const detail = mg.scores ?? {};
    const awards = mg.awards ?? {};

    return (
      <div className="page page-minigame">
        <MgHeader title={tr("Résultats")} />

        <div className="card">
          <p className="label">{tr("Les réponses")}</p>
          {options.map(opt => (
            <div key={opt.id} className="bluff-row">
              <div className="bluff-row-head">
                <strong>{opt.text}</strong>
                <span className="bluff-badge">{players[opt.authorId]?.name}</span>
              </div>
              <p className="muted" style={{ fontSize: 13 }}>
                {(detail[opt.authorId]?.unmasked ?? 0) === 0
                  ? tr("Personne ne l'a démasqué")
                  : tr("Démasqué par {0} joueur{1}", [detail[opt.authorId].unmasked, detail[opt.authorId].unmasked > 1 ? 's' : ''])}
              </p>
            </div>
          ))}
        </div>

        <div className="card">
          <p className="label">Points</p>
          {playerIds.map(id => {
            const d = detail[id] ?? {};
            return (
              <div key={id} className="mg-row">
                <span>{players[id]?.name}</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  {d.correct ? `✅ ${d.correct}` : ''}{d.correct && d.hidden ? ' · ' : ''}
                  {d.hidden ? '🕵️ incognito' : ''}
                </span>
                <strong>+{awards[id] ?? 0}</strong>
              </div>
            );
          })}
        </div>

        {isController
          ? <button className="btn btn-large btn-primary" onClick={() => completeMinigame(awards)}> {tr("Continuer")} </button>
          : <Waiting text={tr("{0} va continuer...", [tName])} />}
      </div>
    );
  }

  return null;
}
