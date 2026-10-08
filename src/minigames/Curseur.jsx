import { useText } from '../context/useText';
// ALL (mêlée) — Le Curseur
// A category becomes a spectrum. The turn player sees a hidden point on it and
// gives a one-word clue; everyone else drags a slider to guess where.
// Phases: dice → clue → guessing → results
import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';
import Countdown from '../components/Countdown';
import SpectrumSlider from '../components/SpectrumSlider';
import MgHeader, { Waiting, TallyLine } from '../components/MgHeader';
import { shuffle } from '../utils';

const GUESS_SECONDS = 45;
const CLOSE_BAND    = 8;   // within this many points → full value
const NEAR_BAND     = 20;  // within this → half, rounded up

function payoutFor(distance, points) {
  if (distance <= CLOSE_BAND) return points;
  if (distance <= NEAR_BAND)  return points / 2;
  return 0;
}

export default function Curseur() {
  const tr = useText();
  const { game, myPlayerId, isTPlayer, updateMinigame, setMyEntry, completeMinigame, getLobbyPool,  isController, fetchContent,} = useGame();

  const mg        = game?.currentMinigame;
  const players   = game?.players ?? {};
  const playerIds = game?.playerOrder?.filter(id => players[id]) ?? Object.keys(players);
  const tName     = players[mg?.tPlayerId]?.name;
  const guesserIds = playerIds.filter(id => id !== mg?.tPlayerId);
  const guesses   = mg?.guesses ?? {};

  const [clueDraft, setClueDraft] = useState('');
  const [myGuess, setMyGuess]     = useState(50);

  function score() {
    const points = mg.pointsValue ?? 0;
    const awards = {};
    const detail = {};

    guesserIds.forEach(id => {
      const guess = guesses[id];
      if (guess === undefined || guess === null) {
        detail[id] = { distance: null, payout: 0 };
        return;
      }
      const distance = Math.abs(guess - mg.target);
      const payout   = payoutFor(distance, points);
      detail[id] = { distance, payout };
      if (payout > 0) awards[id] = payout;
    });

    // A good clue pays: the clue-giver earns the average of what it earned
    // everyone else.
    const payouts = guesserIds.map(id => detail[id]?.payout ?? 0);
    const cluePay = payouts.length
      ? Math.round(payouts.reduce((a, b) => a + b, 0) / payouts.length)
      : 0;
    detail[mg.tPlayerId] = { distance: null, payout: cluePay, isClue: true };
    if (cluePay > 0) awards[mg.tPlayerId] = cluePay;

    updateMinigame({ phase: 'results', scores: detail, awards });
  }

  // ── TPlayer: everyone guessed → score ──────────────────────────────────
  useEffect(() => {
    if (mg?.phase !== 'guessing' || !isController) return;
    if (Object.keys(guesses).length < guesserIds.length) return;
    score();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.guesses, mg?.phase, isController]);

  if (!mg) return <div className="page page-center"><div className="spinner" /></div>;

  // ── DICE ────────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Le Curseur")} subtitle={tName} />
        {isTPlayer
          ? <DiceRoll onResult={val => {
              const cat = shuffle(getLobbyPool())[0] ?? 'Général';
              // 6-94 keeps the target off the rails, where a clue is unguessable.
              const target = 6 + Math.floor(Math.random() * 89);
              updateMinigame({
                diceValue: val, pointsValue: val, category: cat, target, phase: 'clue',
              });
              fetchContent('/api/spectrum', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: cat }),
              })

                .then(data => updateMinigame({
                  spectrum: { left: data.left ?? 'peu', right: data.right ?? 'beaucoup' },
                }))
                .catch(() => updateMinigame({ spectrum: { left: 'peu', right: 'beaucoup' } }));
            }} />
          : <Waiting text={tr("En attente du lancer de dé...")} />}
      </div>
    );
  }

  // ── CLUE ────────────────────────────────────────────────────────────────
  if (mg.phase === 'clue') {
    if (!mg.spectrum) {
      return (
        <div className="page page-minigame page-center">
          <MgHeader title={tr("Le Curseur")} subtitle={mg.category} />
          <div className="spinner" />
          <Waiting text={tr("Génération du spectre...")} />
        </div>
      );
    }

    return (
      <div className="page page-minigame">
        <MgHeader title={tr("Le Curseur")} subtitle={mg.category} />

        {isTPlayer ? (
          <>
            <div className="card">
              <p className="label" style={{ textAlign: 'center' }}> {tr("Ta cible — personne d'autre ne la voit")} </p>
              <SpectrumSlider
                left={mg.spectrum.left}
                right={mg.spectrum.right}
                target={mg.target}
                value={mg.target}
              />
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p className="muted" style={{ fontSize: 13 }}> {tr("Donne")} <strong>{tr("un seul mot")}</strong> {tr("qui se place exactement là sur ce spectre. Plus les autres tombent près, plus tu marques.")} </p>
              <input
                className="input"
                placeholder={tr("Ton indice (un mot)")}
                value={clueDraft}
                onChange={e => setClueDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && clueDraft.trim() && updateMinigame({
                  clue: clueDraft.trim(), phase: 'guessing', countdownStartedAt: Date.now(),
                })}
                maxLength={30}
                autoFocus
                autoComplete="off"
              />
              <button
                className="btn btn-success"
                onClick={() => updateMinigame({
                  clue: clueDraft.trim(), phase: 'guessing', countdownStartedAt: Date.now(),
                })}
                disabled={!clueDraft.trim()}
              > {tr("Donner l'indice")} </button>
            </div>
          </>
        ) : (
          <>
            <div className="card">
              <SpectrumSlider left={mg.spectrum.left} right={mg.spectrum.right} value={50} />
            </div>
            <Waiting text={tr("{0} cherche son indice...", [tName])} />
          </>
        )}
      </div>
    );
  }

  // ── GUESSING ────────────────────────────────────────────────────────────
  if (mg.phase === 'guessing') {
    const submitted = guesses[myPlayerId];
    const done      = Object.keys(guesses).length;

    return (
      <div className="page page-minigame">
        <MgHeader title={tr("Le Curseur")} subtitle={mg.category} />

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Countdown
            startedAt={mg.countdownStartedAt}
            total={GUESS_SECONDS}
            onExpire={() => { if (isController) score(); }}
          />
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <p className="label">{tr("L'indice de")} {tName}</p>
          <p className="mg-category" style={{ color: 'var(--accent)' }}>{mg.clue}</p>
        </div>

        <div className="card">
          <SpectrumSlider
            left={mg.spectrum?.left}
            right={mg.spectrum?.right}
            value={submitted ?? myGuess}
            onChange={isTPlayer || submitted !== undefined ? undefined : setMyGuess}
            disabled={isTPlayer || submitted !== undefined}
            target={isTPlayer ? mg.target : null}
          />
        </div>

        {!isTPlayer && submitted === undefined && (
          <button className="btn btn-success btn-large" onClick={() => setMyEntry('guesses', myGuess)}> {tr("Valider —")} {myGuess}
          </button>
        )}
        {submitted !== undefined && <Waiting text={tr("Réponse enregistrée. En attente des autres...")} />}
        {isTPlayer && <Waiting text={tr("Tu ne joues pas ce tour — tu as donné l'indice.")} />}

        <TallyLine done={done} total={guesserIds.length} label={tr("ont placé leur curseur")} />
      </div>
    );
  }

  // ── RESULTS ─────────────────────────────────────────────────────────────
  if (mg.phase === 'results') {
    const detail = mg.scores ?? {};
    const awards = mg.awards ?? {};
    const pins   = guesserIds
      .filter(id => guesses[id] !== undefined && guesses[id] !== null)
      .map(id => ({ id, name: players[id]?.name ?? '?', value: guesses[id] }));

    return (
      <div className="page page-minigame">
        <MgHeader title={tr("Résultats")} subtitle={tr("Indice : {0}", [mg.clue])} />

        <div className="card">
          <SpectrumSlider
            left={mg.spectrum?.left}
            right={mg.spectrum?.right}
            target={mg.target}
            pins={pins}
            value={mg.target}
          />
          <p className="muted" style={{ textAlign: 'center', marginTop: 28, fontSize: 13 }}> {tr("La cible était à")} <strong>{mg.target}</strong>
          </p>
        </div>

        <div className="card">
          <p className="label">Points</p>
          {playerIds.map(id => {
            const d = detail[id] ?? {};
            return (
              <div key={id} className="mg-row">
                <span>{players[id]?.name}{d.isClue ? tr(" (indice)") : ''}</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  {d.distance === null || d.distance === undefined ? '—' : tr("à {0}", [d.distance])}
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
