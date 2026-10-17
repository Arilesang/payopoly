import { useText } from '../context/useText';
// ALL (mêlée) — Bluff
// A true statement with the answer cut out. Everyone writes a fake, then
// everyone hunts for the truth among the lies.
// Phases: dice → category_select → writing → picking → results
import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';
import Countdown from '../components/Countdown';
import MgHeader, { Waiting, TallyLine } from '../components/MgHeader';
import { shuffle, normalize, caps } from '../utils';

const WRITE_SECONDS = 45;
const PICK_SECONDS  = 30;
const TRUTH_ID      = 'truth';

// Fold the written fakes into a pick list.
//
// Three things have to happen here or the round breaks: a player whose "fake"
// is actually the right answer must not put the truth in the pool twice, two
// players who wrote the same lie must share one option, and a player who wrote
// nothing must not contribute a blank button.
function buildOptions(submissions, trueAnswer) {
  const truthKey     = normalize(trueAnswer);
  const byText       = new Map();
  const truthMatchers = [];

  Object.entries(submissions ?? {}).forEach(([playerId, raw]) => {
    const text = (raw ?? '').trim();
    if (!text) return;
    const key = normalize(text);
    if (!key) return;
    if (key === truthKey) { truthMatchers.push(playerId); return; }
    if (byText.has(key)) byText.get(key).authorIds.push(playerId);
    else byText.set(key, { text: caps(text), authorIds: [playerId] });
  });

  const options = shuffle([
    { id: TRUTH_ID, text: caps(trueAnswer), authorIds: null },
    ...[...byText.values()].map((o, i) => ({ id: `fake${i}`, text: o.text, authorIds: o.authorIds })),
  ]);

  return { options, truthMatchers };
}

export default function Bluff() {
  const tr = useText();
  const { game, myPlayerId, isTPlayer, updateMinigame, setMyEntry, completeMinigame,  isController, fetchContent,} = useGame();

  const mg        = game?.currentMinigame;
  const players   = game?.players ?? {};
  const playerIds = game?.playerOrder?.filter(id => players[id]) ?? Object.keys(players);
  const tName     = players[mg?.tPlayerId]?.name;
  const myCategories = players[myPlayerId]?.categories ?? [];

  const submissions   = mg?.submissions ?? {};
  const picks         = mg?.picks ?? {};
  const options       = mg?.options ?? [];
  const truthMatchers = mg?.truthMatchers ?? [];
  // Players who wrote the truth already know it, so they sit the pick out.
  const pickerIds     = playerIds.filter(id => !truthMatchers.includes(id));

  const [selecting, setSelecting] = useState(false);
  const [draft, setDraft] = useState('');

  // ── TPlayer: all fakes in (or time up) → build the pick list ────────────
  useEffect(() => {
    if (mg?.phase !== 'writing' || !isController || !mg.trueAnswer) return;
    if (Object.keys(submissions).length < playerIds.length) return;
    openPicking();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.submissions, mg?.phase, isController]);

  // ── TPlayer: everyone picked → score ───────────────────────────────────
  useEffect(() => {
    if (mg?.phase !== 'picking' || !isController) return;
    if (Object.keys(picks).length < pickerIds.length) return;
    score();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.picks, mg?.phase, isController]);

  function openPicking() {
    const { options: opts, truthMatchers: matchers } = buildOptions(submissions, mg.trueAnswer);
    updateMinigame({
      options: opts,
      truthMatchers: matchers.length ? matchers : null,
      phase: 'picking',
      countdownStartedAt: Date.now(),
    });
  }

  function score() {
    const points = mg.pointsValue ?? 0;
    const opts   = mg.options ?? [];
    const awards = {};
    const detail = {};

    const add = (id, n) => { awards[id] = (awards[id] ?? 0) + n; };

    playerIds.forEach(id => {
      detail[id] = { foundTruth: false, fooled: 0 };
    });

    // Writing the truth by accident counts as finding it.
    truthMatchers.forEach(id => {
      if (!detail[id]) return;
      detail[id].foundTruth = true;
      add(id, points);
    });

    Object.entries(picks).forEach(([voterId, optionId]) => {
      if (optionId === TRUTH_ID) {
        if (detail[voterId]) detail[voterId].foundTruth = true;
        add(voterId, points);
        return;
      }
      const opt = opts.find(o => o.id === optionId);
      (opt?.authorIds ?? []).forEach(authorId => {
        if (authorId === voterId) return;      // cannot fool yourself
        if (detail[authorId]) detail[authorId].fooled += 1;
        add(authorId, points);
      });
    });

    updateMinigame({ phase: 'results', scores: detail, awards });
  }

  if (!mg) return <div className="page page-center"><div className="spinner" /></div>;

  // ── DICE ────────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Bluff" subtitle={tr("Tout le monde ment !")} />
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
        <MgHeader title="Bluff" subtitle={tr("Difficulté {0}/6", [mg.difficulty])} />
        {isTPlayer ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p className="label" style={{ textAlign: 'center' }}>{tr("Choisis une catégorie")}</p>
            {myCategories.map(cat => (
              <button
                key={cat}
                className="btn btn-category"
                disabled={selecting}
                onClick={() => {
                  if (selecting) return;
                  setSelecting(true);
                  updateMinigame({
                    category: cat, phase: 'writing', countdownStartedAt: Date.now(),
                  });
                  fetchContent('/api/bluff', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category: cat, difficulty: mg.diceValue }),
                  })

                    .then(data => updateMinigame({
                      promptText: data.prompt ?? '___',
                      trueAnswer: data.answer ?? '?',
                    }))
                    .catch(() => updateMinigame({
                      promptText: `${cat} : la réponse est ___`, trueAnswer: '?',
                    }));
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

  // ── WRITING ─────────────────────────────────────────────────────────────
  if (mg.phase === 'writing') {
    const mine = submissions[myPlayerId];
    const done = Object.keys(submissions).length;

    if (!mg.promptText) {
      return (
        <div className="page page-minigame page-center">
          <MgHeader title="Bluff" subtitle={mg.category} />
          <div className="spinner" />
          <Waiting text={tr("Génération de l'affirmation...")} />
        </div>
      );
    }

    return (
      <div className="page page-minigame">
        <MgHeader title="Bluff" subtitle={tr("Invente une fausse réponse")} />

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Countdown
            startedAt={mg.countdownStartedAt}
            total={WRITE_SECONDS}
            onExpire={() => { if (isController) openPicking(); }}
          />
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <p className="label">{tr("Affirmation")}</p>
          <p className="prompt-text">{mg.promptText}</p>
        </div>

        {!mine ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p className="muted" style={{ fontSize: 13 }}> {tr("Écris une réponse crédible mais fausse. Si quelqu'un y croit, tu marques.")} </p>
            <input
              className="input"
              placeholder={tr("Ta fausse réponse...")}
              value={draft}
              onChange={e => setDraft(caps(e.target.value))}
              onKeyDown={e => e.key === 'Enter' && draft.trim() && setMyEntry('submissions', draft.trim())}
              maxLength={60}
              autoFocus
              autoComplete="off"
            />
            <button
              className="btn btn-success"
              onClick={() => setMyEntry('submissions', draft.trim())}
              disabled={!draft.trim()}
            > {tr("Envoyer mon bluff")} </button>
          </div>
        ) : (
          <Waiting text={tr("Bluff envoyé. En attente des autres...")} />
        )}

        <TallyLine done={done} total={playerIds.length} label={tr("ont bluffé")} />
      </div>
    );
  }

  // ── PICKING ─────────────────────────────────────────────────────────────
  if (mg.phase === 'picking') {
    const myPick   = picks[myPlayerId];
    const amPicker = pickerIds.includes(myPlayerId);
    const done     = Object.keys(picks).length;

    return (
      <div className="page page-minigame">
        <MgHeader title="Bluff" subtitle={tr("Où est la vérité ?")} />

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Countdown
            startedAt={mg.countdownStartedAt}
            total={PICK_SECONDS}
            onExpire={() => { if (isController) score(); }}
          />
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <p className="prompt-text" style={{ fontSize: 17 }}>{mg.promptText}</p>
        </div>

        {!amPicker && (
          <div className="card" style={{ textAlign: 'center' }}>
            <p className="result-winner" style={{ fontSize: 18 }}>{tr("🎯 Tu avais écrit la vérité !")}</p>
            <p className="muted">+{mg.pointsValue} {tr("pts — tu ne votes pas ce tour.")}</p>
          </div>
        )}

        <div className="category-select-list">
          {options.map(opt => {
            const isMine = opt.authorIds?.includes(myPlayerId);
            return (
              <button
                key={opt.id}
                className={`btn btn-category ${myPick === opt.id ? 'voted' : ''}`}
                onClick={() => amPicker && !myPick && !isMine && setMyEntry('picks', opt.id)}
                disabled={!amPicker || !!myPick || isMine}
                title={isMine ? tr("Ton propre bluff") : undefined}
              >
                {opt.text}{isMine ? tr(" — ton bluff") : ''}
              </button>
            );
          })}
        </div>

        <TallyLine done={done} total={pickerIds.length} label={tr("ont choisi")} />
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

        <div className="result-banner card" style={{ textAlign: 'center' }}>
          <p className="label">{tr("La vérité était")}</p>
          <p className="mg-category" style={{ color: 'var(--accent)' }}>{caps(mg.trueAnswer)}</p>
        </div>

        <div className="card">
          <p className="label">{tr("Les réponses")}</p>
          {options.map(opt => {
            const pickedBy = Object.entries(picks)
              .filter(([, o]) => o === opt.id)
              .map(([id]) => players[id]?.name)
              .filter(Boolean);
            const authors = (opt.authorIds ?? [])
              .map(id => players[id]?.name).filter(Boolean);
            return (
              <div key={opt.id} className="bluff-row">
                <div className="bluff-row-head">
                  <strong>{opt.text}</strong>
                  {opt.id === TRUTH_ID
                    ? <span className="bluff-badge bluff-true">{tr("VÉRITÉ")}</span>
                    : <span className="bluff-badge">{authors.join(', ')}</span>}
                </div>
                <p className="muted" style={{ fontSize: 13 }}>
                  {pickedBy.length ? tr("Choisi par {0}", [pickedBy.join(', ')]) : tr("Personne n'a mordu")}
                </p>
              </div>
            );
          })}
        </div>

        <div className="card">
          <p className="label">Points</p>
          {playerIds.map(id => {
            const d = detail[id] ?? {};
            return (
              <div key={id} className="mg-row">
                <span>{players[id]?.name}</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  {d.foundTruth ? tr("🎯 vérité") : ''}{d.foundTruth && d.fooled ? ' · ' : ''}
                  {d.fooled ? tr("🎭 {0} dupé{1}", [d.fooled, d.fooled > 1 ? 's' : '']) : ''}
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
