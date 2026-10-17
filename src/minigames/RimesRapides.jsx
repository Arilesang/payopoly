import { useText } from '../context/useText';
import { now } from '../lib/clock';
// DUEL — Rimes Rapides
// Two players alternate typing rhymes against a shot clock that shortens every
// exchange. First to time out, repeat, or miss loses.
// Phases: dice → seed_reveal → playing → complete
import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';
import MgHeader, { Waiting } from '../components/MgHeader';
import { shuffle, normalize, matchesAny, caps } from '../utils';
import { useFeedScroll } from '../lib/useFeedScroll';
import { roundAwards } from '../lib/session';

const START_MS = 7000;
const STEP_MS  = 500;
const FLOOR_MS = 3000;

const clockFor = n => Math.max(FLOOR_MS, START_MS - STEP_MS * n);

// Live shot clock — the round turns on tenths, so this ticks faster than the
// shared Countdown and reads from an absolute deadline rather than a duration.
function ShotClock({ deadline }) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => setLeft(Math.max(0, deadline - now()));
    tick();
    const id = setInterval(tick, 80);
    return () => clearInterval(id);
  }, [deadline]);

  const seconds = (left / 1000).toFixed(1);
  const pct     = Math.min(100, (left / START_MS) * 100);
  const urgent  = left < 2000;

  return (
    <div className="shot-clock">
      <div className="shot-clock-bar">
        <span
          className={`shot-clock-fill ${urgent ? 'urgent' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`shot-clock-num ${urgent ? 'urgent' : ''}`}>{seconds}s</span>
    </div>
  );
}

export default function RimesRapides() {
  const tr = useText();
  const {
    game, myPlayerId, isTPlayer, isPPlayer,
    updateMinigame, completeMinigame,
   isController, fetchContent,} = useGame();

  const mg      = game?.currentMinigame;
  const players = game?.players ?? {};
  const tName   = players[mg?.tPlayerId]?.name;
  const pName   = players[mg?.pPlayerId]?.name;

  const [draft, setDraft] = useState('');
  const [flash, setFlash] = useState(null);

  const chain = Object.entries(mg?.chain ?? {})
    .map(([key, c]) => ({ key, ...c }))
    .sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
  const [feedRef, anchorRef] = useFeedScroll(chain.length);

  const amDuellist = isTPlayer || isPPlayer;
  const myTurn     = mg?.activePlayerId === myPlayerId;
  const opponentId = myPlayerId === mg?.tPlayerId ? mg?.pPlayerId : mg?.tPlayerId;

  // ── TPlayer holds the whistle: if the shot clock runs out, end the round ─
  useEffect(() => {
    if (mg?.phase !== 'playing' || !isController || !mg.turnDeadline) return;
    const id = setInterval(() => {
      if (now() < mg.turnDeadline) return;
      clearInterval(id);
      updateMinigame({
        phase: 'complete',
        winnerId: mg.activePlayerId === mg.tPlayerId ? mg.pPlayerId : mg.tPlayerId,
        loseReason: 'temps',
      });
    }, 120);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.turnDeadline, mg?.phase, mg?.activePlayerId, isController]);

  // The player who just answered writes the whole handover — word, next player
  // and next deadline — in one update. Bouncing it through the turn player's
  // client would cost a round trip the shot clock cannot spare.
  //
  // `now` is passed in from the event handler rather than read here, so the
  // key, the timestamp and the next deadline all agree on one instant.
  function submit(now) {
    const word = draft.trim();
    if (!word || !myTurn) return;
    setDraft('');

    const key  = normalize(word);
    const used = chain.map(c => normalize(c.word));

    // Repeats must match exactly — two real rhymes can sit one edit apart
    // (GAGNE / BAGNE), so a fuzzy repeat check would reject a valid word.
    if (used.includes(key)) return fail('déjà dit');
    if (!matchesAny(word, mg.rhymePool)) return fail('ne rime pas');

    updateMinigame({
      [`chain/${now}_${myPlayerId}`]: { playerId: myPlayerId, word: word.toUpperCase(), at: now },
      activePlayerId: opponentId,
      turnDeadline: now + clockFor(chain.length + 1),
    });
  }

  function fail(reason) {
    setFlash(reason);
    setTimeout(() => setFlash(null), 1200);
    updateMinigame({ phase: 'complete', winnerId: opponentId, loseReason: reason });
  }

  if (!mg) return <div className="page page-center"><div className="spinner" /></div>;

  // ── DICE ────────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Rimes Rapides")} subtitle={`${tName} ⚔️ ${pName}`} />
        {isTPlayer
          ? <DiceRoll onResult={val => {
              const cats = players[mg.tPlayerId]?.categories ?? [];
              const cat  = shuffle(cats)[0] ?? 'Général';
              updateMinigame({
                diceValue: val, pointsValue: val, difficulty: val,
                category: cat, phase: 'seed_reveal',
              });
              fetchContent('/api/rhymes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: cat, difficulty: val }),
              })

                .then(data => updateMinigame({
                  seedWord: data.seed ?? 'CHATEAU',
                  rhymePool: data.valid ?? [],
                }))
                .catch(() => updateMinigame({
                  seedWord: 'CHATEAU',
                  rhymePool: ['BATEAU', 'GATEAU', 'CADEAU', 'MANTEAU', 'RIDEAU', 'MARTEAU', 'PLATEAU'],
                }));
            }} />
          : <Waiting text={tr("En attente du lancer de dé...")} />}
      </div>
    );
  }

  // ── SEED REVEAL ─────────────────────────────────────────────────────────
  if (mg.phase === 'seed_reveal') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Rimes Rapides")} subtitle={`${tName} ⚔️ ${pName}`} />
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="label">{tr("Trouvez des rimes avec")}</p>
          {!mg.seedWord
            ? <div className="spinner" style={{ margin: '8px auto' }} />
            : <p className="mg-category" style={{ color: 'var(--accent)' }}>{mg.seedWord}</p>}
          <hr style={{ margin: '16px 0', opacity: 0.15 }} />
          <p className="muted" style={{ fontSize: 13, textAlign: 'left', lineHeight: 1.6 }}>
            📋 <strong>{tr("Règles :")}</strong> {tr("à tour de rôle, tapez un mot qui rime. Interdit de répéter. Le chrono raccourcit à chaque échange — 7 secondes au début, 3 à la fin. Le premier qui cale a perdu.")} {tr("{0} commence.", [pName])} </p>
        </div>
        {isTPlayer && mg.seedWord && (
          <button
            className="btn btn-success btn-large"
            // The challenged player opens: the first move has the longest clock,
            // which offsets the challenger's choice of matchup.
            onClick={() => updateMinigame({
              phase: 'playing',
              activePlayerId: mg.pPlayerId,
              turnDeadline: now() + clockFor(0),
            })}
          > {tr("C'est parti !")} </button>
        )}
        {!isTPlayer && <Waiting text={tr("Préparation...")} />}
      </div>
    );
  }

  // ── PLAYING ─────────────────────────────────────────────────────────────
  if (mg.phase === 'playing') {
    const activeName = players[mg.activePlayerId]?.name;

    return (
      <div className="page page-minigame">
        <MgHeader title={tr("Rimes Rapides")} subtitle={tr("Rime avec {0}", [mg.seedWord])} />

        <ShotClock deadline={mg.turnDeadline} />

        <p className="rime-turn">
          {myTurn ? tr("👉 À toi !") : tr("Au tour de {0}", [activeName])}
        </p>

        <div className="guess-feed" ref={feedRef}>
          {chain.length === 0 && (
            <p className="muted" style={{ textAlign: 'center', padding: 12 }}> {tr("Premier mot...")} </p>
          )}
          {chain.map(c => (
            <div key={c.key} className="guess-line">
              <span className="guess-author">{players[c.playerId]?.name}</span>
              <span className="guess-text">{c.word}</span>
            </div>
          ))}
        </div>

        {flash && <p className="rime-flash">❌ {tr(flash)}</p>}

        {amDuellist && (
          <div className="guess-input-row" ref={anchorRef}>
            <input
              className="input"
              placeholder={myTurn ? tr("Ta rime...") : tr("Attends ton tour")}
              value={draft}
              onChange={e => setDraft(caps(e.target.value))}
              onKeyDown={e => { if (e.key === "Enter") submit(now()); }}
              disabled={!myTurn}
              autoFocus
              autoComplete="off"
            />
            <button className="btn btn-primary" onClick={() => submit(now())} disabled={!myTurn || !draft.trim()}>
              Go
            </button>
          </div>
        )}
        {!amDuellist && <Waiting text={tr("Les duellistes s'affrontent...")} />}
      </div>
    );
  }

  // ── COMPLETE ────────────────────────────────────────────────────────────
  if (mg.phase === 'complete') {
    const points = roundAwards(game)[mg.winnerId] ?? 0;
    const loserName = players[mg.winnerId === mg.tPlayerId ? mg.pPlayerId : mg.tPlayerId]?.name;

    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Résultat")} />
        <div className="result-banner card">
          <p className="result-winner">🏆 {players[mg.winnerId]?.name ?? '—'}</p>
          <p className="muted">+{points} pt{points > 1 ? 's' : ''}</p>
          {mg.loseReason && (
            <p className="muted" style={{ marginTop: 6 }}>
              {loserName} {tr("a calé —")} <strong>{tr(mg.loseReason)}</strong>
            </p>
          )}
          <p className="muted" style={{ marginTop: 8 }}>
            {chain.length} {tr("rime")}{chain.length > 1 ? 's' : ''} {tr("trouvée")}{chain.length > 1 ? 's' : ''}
          </p>
        </div>
        {isController
          ? <button className="btn btn-large btn-primary" onClick={() => completeMinigame()}> {tr("Continuer")} </button>
          : <Waiting text={tr("{0} va continuer...", [tName])} />}
      </div>
    );
  }

  return null;
}
