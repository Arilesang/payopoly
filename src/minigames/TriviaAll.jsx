import MgHeader from '../components/MgHeader';
import { useText } from '../context/useText';
import { triviaResult } from '../lib/session';
import Countdown from '../components/Countdown';
// ALL — Trivia (AI-generated MCQ, everyone plays simultaneously)
// Phases: dice → category_select → ready_check → playing → results
import { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';
import TriviaAnswerMatrix from '../components/TriviaAnswerMatrix';

export default function TriviaAll() {
  const tr = useText();
  const { game, myPlayerId, isTPlayer, updateMinigame, setMinigameReady, submitTriviaAnswer, completeMinigame,  isController, fetchContent,} = useGame();
  const mg      = game?.currentMinigame;
  const players = game?.players ?? {};
  const loadingAI = Boolean(mg?.loadingContent);
  const setLoadingAI = value => updateMinigame({ loadingContent: value });
  const persistedAnswers = Object.values(mg?.triviaAnswers?.[myPlayerId] ?? {});
  const questionCount = mg?.triviaQuestions?.length ?? 3;
  const currentQ = Math.min(questionCount - 1, persistedAnswers.length);

  const playerIds  = Object.keys(players);
  const tName      = players[mg?.tPlayerId]?.name;
  const qs         = mg?.triviaQuestions ?? [];
  const myAnswers  = Object.values(mg?.triviaAnswers?.[myPlayerId] ?? {});
  const allDone    = myAnswers.length >= qs.length;

  // ── TPlayer: fetch trivia once ALL players are ready ──────────────────
  useEffect(() => {
    if (mg?.phase !== 'ready_check' || !isController) return;
    const allReady = playerIds.every(id => mg.readyPlayers?.[id]);
    if (!allReady || mg.triviaQuestions) return;
    setLoadingAI(true);
    fetchContent('/api/trivia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: mg.category, difficulty: mg.difficulty }),
    })

      .then(data => updateMinigame({ triviaQuestions: data.questions }))
      .catch(err => console.error('Trivia API error', err))
      .finally(() => setLoadingAI(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.readyPlayers, mg?.phase, isController]);

  // ── TPlayer: advance to playing once questions are fetched ────────────
  useEffect(() => {
    if (mg?.phase !== 'ready_check' || !isController || !mg.triviaQuestions) return;
    const allReady = playerIds.every(id => mg.readyPlayers?.[id]);
    if (!allReady) return;
    updateMinigame({ phase: 'playing' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.triviaQuestions, isController]);

  // ── TPlayer: compute results when ALL players have answered ───────────
  useEffect(() => {
    if (mg?.phase !== 'playing' || !isController || !mg.triviaQuestions) return;
    const everyoneDone = playerIds.every(id =>
      (Object.values(mg.triviaAnswers?.[id] ?? {})).length >= mg.triviaQuestions.length
    );
    if (!everyoneDone) return;

    updateMinigame({ ...triviaResult(mg, playerIds), phase: 'results' });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.triviaAnswers, mg?.phase, isController]);

  async function handleAnswer(answerIndex) {
    if (myAnswers.find(a => a.questionIndex === currentQ)) return;
    await submitTriviaAnswer(currentQ, answerIndex);

  }

  if (!mg) return <div className="page page-center"><div className="spinner" /></div>;

  // ── DICE ──────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Trivia" subtitle={tr("Tout le monde joue !")} />
        {isTPlayer
          ? <DiceRoll onResult={val => updateMinigame({ diceValue: val, pointsValue: val, difficulty: val, phase: 'category_select' })} />
          : <p className="muted" style={{ textAlign: 'center' }}>{tr("En attente du lancer de dé...")}</p>}
      </div>
    );
  }

  // ── CATEGORY SELECT ───────────────────────────────────────────────────
  if (mg.phase === 'category_select') {
    const myCategories = players[mg.tPlayerId]?.categories ?? [];
    return (
      <div className="page page-minigame">
        <MgHeader title="Trivia" subtitle={tr("Difficulté {0}/6", [mg.difficulty])} />
        {isTPlayer ? (
          <>
            <p className="label" style={{ paddingLeft: 4 }}>{tr("Choisis une catégorie")}</p>
            <div className="category-select-list">
              {myCategories.map((cat, i) => (
                <button key={i} className="btn btn-category"
                  onClick={() => updateMinigame({ category: cat, phase: 'ready_check' })}>
                  {cat}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="muted" style={{ textAlign: 'center', marginTop: 40 }}>
            {tName} {tr("choisit une catégorie...")} </p>
        )}
      </div>
    );
  }

  // ── READY CHECK ───────────────────────────────────────────────────────
  if (mg.phase === 'ready_check') {
    const myReady    = mg.readyPlayers?.[myPlayerId];
    const readyCount = Object.keys(mg.readyPlayers ?? {}).length;
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Trivia" subtitle={mg.category} />
        <div className="card" style={{ textAlign: 'center' }}>
          <p>{tr("Difficulté :")} <strong>{mg.difficulty}/6</strong></p>
          <p className="muted">{readyCount}/{playerIds.length} {tr("prêts")}</p>
        </div>
        {!myReady && (
          <button className="btn btn-success btn-large" onClick={setMinigameReady}>{tr("Prêt !")}</button>
        )}
        {myReady && (
          <p className="muted" style={{ textAlign: 'center' }}>
            {loadingAI ? tr("⏳ Génération des questions...") : tr("En attente des autres joueurs...")}
          </p>
        )}
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────
  if (mg.phase === 'playing') {
    const q             = qs[currentQ];
    const myAns         = myAnswers.find(a => a.questionIndex === currentQ);
    const finishedCount = playerIds.filter(id => (Object.values(mg.triviaAnswers?.[id] ?? {})).length >= qs.length).length;

    if (!q) return <div className="page page-center"><div className="spinner" /></div>;

    return (
      <div className="page page-minigame">
        <MgHeader title="Trivia" subtitle={`Q${currentQ + 1}/${qs.length}`} />
        <Countdown startedAt={mg.countdownStartedAt} total={60} />
        <div className="card trivia-question">
          <p className="trivia-q-text">{q.q}</p>
        </div>
        {!allDone && (
          <div className="trivia-options">
            {q.options.map((opt, i) => (
              <button key={i}
                className={`btn btn-category ${myAns?.answerIndex === i ? 'voted' : ''}`}
                onClick={() => !myAns && handleAnswer(i)}
                disabled={!!myAns}
              >
                <span className="opt-letter">{['A', 'B', 'C', 'D'][i]}</span> {opt}
              </button>
            ))}
          </div>
        )}
        {allDone && (
          <p className="muted" style={{ textAlign: 'center' }}> {tr("En attente... (")}{finishedCount}/{playerIds.length} {tr("terminés)")} </p>
        )}
      </div>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────
  if (mg.phase === 'results') {
    const scores = mg.scores ?? {};
    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Résultats")} />
        <div className="result-banner card">
          <p className="result-winner">{mg.winnerId ? `🏆 ${players[mg.winnerId]?.name}` : mg.winnerIds?.length > 1 ? tr('Égalité') : tr('Aucune bonne réponse')}</p>
          <p className="muted">{mg.winnerId || mg.winnerIds?.length ? `+${mg.diceValue} ${tr('points')}` : `0 ${tr('points')}`}</p>
        </div>
        <div className="card" style={{ width: '100%' }}>
          {sorted.map(([id, score], i) => (
            <div key={id} style={{
              display: 'flex', justifyContent: 'space-between', padding: '6px 0',
              borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span>{players[id]?.name}</span>
              <span className="muted">{score}/{qs.length}</span>
            </div>
          ))}
        </div>
        <div className="card">{(mg.triviaQuestions ?? []).map((q, i) => <p key={i}><strong>{q.q}</strong><br />{q.options[q.answer]}</p>)}</div>
        <TriviaAnswerMatrix minigame={mg} players={players} playerIds={playerIds} />
        {isController && (
          <button className="btn btn-large btn-primary" onClick={() => completeMinigame(mg.winnerId)}> {tr("Continuer")} </button>
        )}
      </div>
    );
  }

  return null;
}
