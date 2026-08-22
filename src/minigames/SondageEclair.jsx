// ALL (mêlée) — Sondage Éclair
// Everyone answers "qui est le plus susceptible de...", then everyone predicts
// what the room answered. Points for being in the majority, and for reading it.
// Phases: dice → answering → predicting → results
import { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';
import Countdown from '../components/Countdown';
import MgHeader, { Waiting, TallyLine } from '../components/MgHeader';
import { randomSurveyPrompt } from '../data/surveyPrompts';

const ANSWER_SECONDS  = 15;
const PREDICT_SECONDS = 15;

// Every option tied for the most votes counts as "the majority". A tie is rare
// but real, and splitting it arbitrarily would punish players for a coin flip.
function majorityOf(answers) {
  const tally = {};
  Object.values(answers ?? {}).forEach(v => { tally[v] = (tally[v] ?? 0) + 1; });
  const top = Math.max(0, ...Object.values(tally));
  return {
    tally,
    winners: Object.keys(tally).filter(k => tally[k] === top),
    top,
  };
}

export default function SondageEclair() {
  const { game, myPlayerId, isTPlayer, updateMinigame, setMyEntry, completeMinigame } = useGame();

  const mg        = game?.currentMinigame;
  const players   = game?.players ?? {};
  const playerIds = game?.playerOrder?.filter(id => players[id]) ?? Object.keys(players);
  const tName     = players[mg?.tPlayerId]?.name;

  const answers     = mg?.answers ?? {};
  const predictions = mg?.predictions ?? {};

  // ── TPlayer: everyone answered (or the clock ran out) → predicting ───────
  useEffect(() => {
    if (mg?.phase !== 'answering' || !isTPlayer) return;
    if (Object.keys(answers).length < playerIds.length) return;
    updateMinigame({ phase: 'predicting', countdownStartedAt: Date.now() });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.answers, mg?.phase]);

  // ── TPlayer: everyone predicted → score it ──────────────────────────────
  useEffect(() => {
    if (mg?.phase !== 'predicting' || !isTPlayer) return;
    if (Object.keys(predictions).length < playerIds.length) return;
    score();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.predictions, mg?.phase]);

  function score() {
    const { tally, winners } = majorityOf(answers);
    const points  = mg.pointsValue ?? 0;
    const awards  = {};
    const detail  = {};

    playerIds.forEach(id => {
      const withRoom  = winners.includes(answers[id]);
      const readRoom  = winners.includes(predictions[id]);
      const total     = (withRoom ? points : 0) + (readRoom ? points : 0);
      detail[id] = { withRoom, readRoom, total };
      if (total > 0) awards[id] = total;
    });

    updateMinigame({ phase: 'results', tally, scores: detail, awards });
  }

  if (!mg) return <div className="page page-center"><div className="spinner" /></div>;

  // ── DICE ────────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Sondage Éclair" subtitle="Tout le monde joue !" />
        {isTPlayer
          ? <DiceRoll onResult={val => updateMinigame({
              diceValue: val,
              pointsValue: val,
              surveyPrompt: randomSurveyPrompt(),
              phase: 'answering',
              countdownStartedAt: Date.now(),
            })} />
          : <Waiting text="En attente du lancer de dé..." />}
      </div>
    );
  }

  // ── ANSWERING / PREDICTING ──────────────────────────────────────────────
  if (mg.phase === 'answering' || mg.phase === 'predicting') {
    const isPredicting = mg.phase === 'predicting';
    const field   = isPredicting ? 'predictions' : 'answers';
    const mine    = isPredicting ? predictions[myPlayerId] : answers[myPlayerId];
    const done    = Object.keys(isPredicting ? predictions : answers).length;

    return (
      <div className="page page-minigame">
        <MgHeader
          title="Sondage Éclair"
          subtitle={isPredicting ? 'Et le groupe, il a dit quoi ?' : 'Qui est le plus susceptible de...'}
        />

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Countdown
            startedAt={mg.countdownStartedAt}
            total={isPredicting ? PREDICT_SECONDS : ANSWER_SECONDS}
            onExpire={() => {
              if (!isTPlayer) return;
              if (isPredicting) score();
              else updateMinigame({ phase: 'predicting', countdownStartedAt: Date.now() });
            }}
          />
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <p className="label">{isPredicting ? 'Rappel de la question' : 'Question'}</p>
          <p className="survey-prompt">{mg.surveyPrompt} ?</p>
          {isPredicting && (
            <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>
              Devine la réponse la plus choisie par le groupe.
            </p>
          )}
        </div>

        <div className="category-select-list">
          {playerIds.map(id => (
            <button
              key={id}
              className={`btn btn-category ${mine === id ? 'voted' : ''}`}
              onClick={() => !mine && setMyEntry(field, id)}
              disabled={!!mine}
            >
              {players[id]?.name}{id === myPlayerId ? ' (toi)' : ''}
            </button>
          ))}
        </div>

        <TallyLine done={done} total={playerIds.length} label={isPredicting ? 'ont deviné' : 'ont répondu'} />
      </div>
    );
  }

  // ── RESULTS ─────────────────────────────────────────────────────────────
  if (mg.phase === 'results') {
    const tally   = mg.tally ?? {};
    const detail  = mg.scores ?? {};
    const awards  = mg.awards ?? {};
    const max     = Math.max(1, ...Object.values(tally));
    const ranked  = playerIds
      .map(id => ({ id, count: tally[id] ?? 0 }))
      .sort((a, b) => b.count - a.count);

    return (
      <div className="page page-minigame">
        <MgHeader title="Résultats" subtitle={mg.surveyPrompt} />

        <div className="card">
          <p className="label">Le groupe a dit</p>
          <div className="bar-chart">
            {ranked.map(({ id, count }) => (
              <div key={id} className="bar-row">
                <span className="bar-name">{players[id]?.name}</span>
                <span className="bar-track">
                  <span
                    className={`bar-fill ${count === max && count > 0 ? 'bar-top' : ''}`}
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </span>
                <span className="bar-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <p className="label">Points</p>
          {playerIds.map(id => {
            const d = detail[id] ?? {};
            return (
              <div key={id} className="mg-row">
                <span>{players[id]?.name}</span>
                <span className="muted" style={{ fontSize: 13 }}>
                  {d.withRoom ? '🎯' : '—'} {d.readRoom ? '🔮' : '—'}
                </span>
                <strong>+{awards[id] ?? 0}</strong>
              </div>
            );
          })}
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            🎯 d'accord avec le groupe &nbsp;·&nbsp; 🔮 a deviné le groupe
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
