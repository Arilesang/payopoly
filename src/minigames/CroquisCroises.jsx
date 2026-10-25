import { useText } from '../context/useText';
// ALL (mêlée) — Croquis Croisés
// Everyone draws a different word at once, then a few drawings go up one at a
// time: everyone invents a fake title, then everyone votes on the real one.
// Phases: dice → drawing → titling → picking → results
import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';
import Countdown from '../components/Countdown';
import DrawingCanvas from '../components/DrawingCanvas';
import MgHeader, { Waiting, TallyLine } from '../components/MgHeader';
import { shuffle, normalize } from '../utils';

const DRAW_SECONDS  = 60;
const TITLE_SECONDS = 45;
const PICK_SECONDS  = 30;
// The reveal loop is linear in player count. At ten players a full pass would
// run past the pace of the board game, so everyone draws and three go on show.
const MAX_REVEALS   = 3;
const TRUTH_ID      = 'truth';

export default function CroquisCroises() {
  const tr = useText();
  const {
    game, myPlayerId, isTPlayer, updateMinigame, setMyEntry, completeMinigame,
    pushMyStroke, updateMyCurrentStroke, clearMyDrawing, getLobbyPool,
   isController, fetchContent,} = useGame();

  const mg        = game?.currentMinigame;
  const players   = game?.players ?? {};
  const playerIds = game?.playerOrder?.filter(id => players[id]) ?? Object.keys(players);
  const tName     = players[mg?.tPlayerId]?.name;

  const [loading, setLoading] = useState(false);

  const idx        = mg?.revealIndex ?? 0;
  const round      = `r${idx}`;
  const artistId   = mg?.revealOrder?.[idx];
  const others     = playerIds.filter(id => id !== artistId);
  const titles     = mg?.submissions?.[round] ?? {};
  const options    = mg?.options?.[round] ?? [];
  const picks      = mg?.picks?.[round] ?? {};

  // ── TPlayer: all titles in → build the pick list ───────────────────────
  useEffect(() => {
    if (mg?.phase !== 'titling' || !isController || !artistId) return;
    if (Object.keys(titles).length < others.length) return;
    openPicking();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.submissions, mg?.phase, mg?.revealIndex, isController]);

  // ── TPlayer: all picks in → score this drawing and move on ─────────────
  useEffect(() => {
    if (mg?.phase !== 'picking' || !isController || !artistId) return;
    if (Object.keys(picks).length < others.length) return;
    scoreRound();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.picks, mg?.phase, mg?.revealIndex, isController]);

  function startReveals() {
    const shown = game.showcaseCounts ?? {};
    const order = shuffle(playerIds).sort((a, b) => (shown[a] ?? 0) - (shown[b] ?? 0)).slice(0, Math.min(MAX_REVEALS, playerIds.length));
    updateMinigame({
      revealOrder: order,
      revealIndex: 0,
      phase: 'titling',
      countdownStartedAt: Date.now(),
    });
  }

  function openPicking() {
    const truth  = (mg.drawWords?.[artistId] ?? '?').toUpperCase();
    const byText = new Map();

    Object.entries(titles).forEach(([playerId, raw]) => {
      const text = (raw ?? '').trim().toUpperCase();
      if (!text) return;
      const key = normalize(text);
      // A fake that lands on the real word would put the truth in twice.
      if (!key || key === normalize(truth)) return;
      if (byText.has(key)) byText.get(key).authorIds.push(playerId);
      else byText.set(key, { text, authorIds: [playerId] });
    });

    const opts = shuffle([
      { id: TRUTH_ID, text: truth, authorIds: null },
      ...[...byText.values()].map((o, i) => ({ id: `f${i}`, text: o.text, authorIds: o.authorIds })),
    ]);

    updateMinigame({
      [`options/${round}`]: opts,
      phase: 'picking',
      countdownStartedAt: Date.now(),
    });
  }

  function scoreRound() {
    const points  = mg.pointsValue ?? 0;
    const opts    = mg.options?.[round] ?? [];
    const awards  = { ...(mg.awards ?? {}) };
    const add     = (id, n) => { awards[id] = (awards[id] ?? 0) + n; };

    let foundTruth = 0;
    const fooled   = {};

    Object.entries(picks).forEach(([voterId, optionId]) => {
      if (optionId === TRUTH_ID) {
        foundTruth += 1;
        add(artistId, points);          // the artist scores when they're understood
        add(voterId, points);           // and so does the player who saw it
        return;
      }
      const opt = opts.find(o => o.id === optionId);
      (opt?.authorIds ?? []).forEach(authorId => {
        if (authorId === voterId) return;
        fooled[authorId] = (fooled[authorId] ?? 0) + 1;
        add(authorId, points);
      });
    });

    const log = [...(mg.roundLog ?? []), {
      artistId,
      word: (mg.drawWords?.[artistId] ?? '?').toUpperCase(),
      foundTruth,
      voters: Object.keys(picks).length,
    }];

    const next = idx + 1;
    const done = next >= (mg.revealOrder?.length ?? 0);

    updateMinigame({
      awards,
      roundLog: log,
      revealIndex: next,
      phase: done ? 'results' : 'titling',
      countdownStartedAt: Date.now(),
    });
  }

  if (!mg) return <div className="page page-center"><div className="spinner" /></div>;

  // ── DICE ────────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Croquis Croisés")} subtitle={tr("Tout le monde dessine !")} />
        {isTPlayer ? (
          loading
            ? <><div className="spinner" /><Waiting text={tr("Distribution des mots...")} /></>
            : <DiceRoll onResult={val => {
                setLoading(true);
                const pool = getLobbyPool();
                // One word per player, fetched in parallel — a serial pass at
                // ten players would stall the table for half a minute.
                Promise.all(playerIds.map((id, i) => {
                  const cat = pool.length ? pool[(i * 7 + val) % pool.length] : 'Général';
                  return fetchContent('/api/pictionary-word', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category: cat, difficulty: val, variation: id }),
                  })

                    .then(d => [id, d.word ?? '?'])
                    .catch(() => [id, '?']);
                }))
                  .then(pairs => updateMinigame({
                    diceValue: val, pointsValue: val,
                    drawWords: Object.fromEntries(pairs),
                    phase: 'drawing',
                    countdownStartedAt: Date.now(),
                  }))
                  .finally(() => setLoading(false));
              }} />
        ) : (
          <Waiting text={tr("En attente du lancer de dé...")} />
        )}
      </div>
    );
  }

  // ── DRAWING — everyone at once, on their own canvas ─────────────────────
  if (mg.phase === 'drawing') {
    const myWord = (mg.drawWords?.[myPlayerId] ?? '...').toUpperCase();
    const mine   = mg.drawings?.[myPlayerId] ?? {};

    return (
      <div className="page page-pictionary">
        <div className="pictionary-header">
          <MgHeader title={tr("Dessine !")} subtitle={myWord} />
          <Countdown
            startedAt={mg.countdownStartedAt}
            total={DRAW_SECONDS}
            onExpire={() => { if (isController) startReveals(); }}
          />
        </div>
        <DrawingCanvas
          isDrawer
          strokes={mine.strokes ?? {}}
          currentStroke={mine.currentStroke ?? null}
          onStrokeComplete={pushMyStroke}
          onStrokeUpdate={updateMyCurrentStroke}
          onClear={clearMyDrawing}
        />
      </div>
    );
  }

  // ── TITLING ─────────────────────────────────────────────────────────────
  if (mg.phase === 'titling') {
    const amArtist = myPlayerId === artistId;
    const mine     = titles[myPlayerId];
    const art      = mg.drawings?.[artistId] ?? {};

    return (
      <div className="page page-minigame">
        <div className="pictionary-header">
          <MgHeader
            title={tr("Dessin {0}/{1}", [idx + 1, mg.revealOrder?.length ?? 1])}
            subtitle={amArtist ? tr("Ton dessin !") : tr("de {0}", [players[artistId]?.name])}
          />
          <Countdown
            startedAt={mg.countdownStartedAt}
            total={TITLE_SECONDS}
            onExpire={() => { if (isController) openPicking(); }}
          />
        </div>

        <DrawingCanvas isDrawer={false} strokes={art.strokes ?? {}} currentStroke={null} />

        {amArtist ? (
          <Waiting text={tr("Les autres inventent un faux titre. Ton mot : {0}", [mg.drawWords?.[artistId]?.toUpperCase()])} />
        ) : mine ? (
          <Waiting text={tr("Titre envoyé. En attente des autres...")} />
        ) : (
          // Keyed by round so a new drawing gets a genuinely empty box
          <TitleInput key={round} onSubmit={text => setMyEntry(`submissions/${round}`, text)} />
        )}

        <TallyLine done={Object.keys(titles).length} total={others.length} label={tr("ont proposé")} />
      </div>
    );
  }

  // ── PICKING ─────────────────────────────────────────────────────────────
  if (mg.phase === 'picking') {
    const amArtist = myPlayerId === artistId;
    const myPick   = picks[myPlayerId];
    const art      = mg.drawings?.[artistId] ?? {};

    return (
      <div className="page page-minigame">
        <div className="pictionary-header">
          <MgHeader
            title={tr("Dessin {0}/{1}", [idx + 1, mg.revealOrder?.length ?? 1])}
            subtitle={tr("C'était quoi ?")}
          />
          <Countdown
            startedAt={mg.countdownStartedAt}
            total={PICK_SECONDS}
            onExpire={() => { if (isController) scoreRound(); }}
          />
        </div>

        <DrawingCanvas isDrawer={false} strokes={art.strokes ?? {}} currentStroke={null} />

        <div className="category-select-list">
          {options.map(opt => {
            const isMine = opt.authorIds?.includes(myPlayerId);
            return (
              <button
                key={opt.id}
                className={`btn btn-category ${myPick === opt.id ? 'voted' : ''}`}
                onClick={() => !amArtist && !myPick && !isMine && setMyEntry(`picks/${round}`, opt.id)}
                disabled={amArtist || !!myPick || isMine}
              >
                {opt.text.toUpperCase()}{isMine ? tr(" — ton titre") : ''}
              </button>
            );
          })}
        </div>

        {amArtist && <Waiting text={tr("Tu regardes — c'est ton dessin.")} />}
        <TallyLine done={Object.keys(picks).length} total={others.length} label={tr("ont choisi")} />
      </div>
    );
  }

  // ── RESULTS ─────────────────────────────────────────────────────────────
  if (mg.phase === 'results') {
    const awards = mg.awards ?? {};
    const log    = mg.roundLog ?? [];

    return (
      <div className="page page-minigame">
        <MgHeader title={tr("Résultats")} />

        <div className="card">
          <p className="label">{tr("Les dessins")}</p>
          {log.map((r, i) => (
            <div key={i} className="bluff-row">
              <div className="bluff-row-head">
                <strong>{r.word.toUpperCase()}</strong>
                <span className="bluff-badge">{players[r.artistId]?.name}</span>
              </div>
              <p className="muted" style={{ fontSize: 13 }}>
                {r.foundTruth}/{r.voters} {tr("l'ont reconnu")} </p>
            </div>
          ))}
        </div>

        <div className="card">
          <p className="label">Points</p>
          {playerIds
            .slice()
            .sort((a, b) => (awards[b] ?? 0) - (awards[a] ?? 0))
            .map(id => (
              <div key={id} className="mg-row">
                <span>{players[id]?.name}</span>
                <strong>+{awards[id] ?? 0}</strong>
              </div>
            ))}
        </div>

        {isController
          ? <button className="btn btn-large btn-primary" onClick={() => completeMinigame(awards)}> {tr("Continuer")} </button>
          : <Waiting text={tr("{0} va continuer...", [tName])} />}
      </div>
    );
  }

  return null;
}

// Its own component so that remounting it on a new round is what clears the
// text, instead of an effect reaching in to reset state.
function TitleInput({ onSubmit }) {
  const tr = useText();
  const [draft, setDraft] = useState('');
  const send = () => draft.trim() && onSubmit(draft.trim());

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p className="muted" style={{ fontSize: 13 }}> {tr("Invente un titre crédible. Si quelqu'un le choisit, tu marques.")} </p>
      <input
        className="input"
        placeholder={tr("Ton faux titre...")}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && send()}
        maxLength={40}
        autoFocus
        autoComplete="off"
      />
      <button className="btn btn-success" onClick={send} disabled={!draft.trim()}> {tr("Envoyer")} </button>
    </div>
  );
}
