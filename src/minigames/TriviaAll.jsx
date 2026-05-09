// ALL — Trivia (AI-generated MCQ, everyone plays simultaneously)
// Phases: dice → category_select → ready_check → playing → results
import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';

export default function TriviaAll() {
  const { game, myPlayerId, isTPlayer, updateMinigame, setMinigameReady, submitTriviaAnswer, completeMinigame } = useGame();
  const mg      = game?.currentMinigame;
  const players = game?.players ?? {};
  const [loadingAI, setLoadingAI] = useState(false);
  const [currentQ, setCurrentQ]   = useState(0);

  const playerIds  = Object.keys(players);
  const tName      = players[mg?.tPlayerId]?.name;
  const qs         = mg?.triviaQuestions ?? [];
  const myAnswers  = mg?.triviaAnswers?.[myPlayerId] ?? [];
  const allDone    = myAnswers.length >= qs.length;

  // ── TPlayer: fetch trivia once ALL players are ready ──────────────────
  useEffect(() => {
    if (mg?.phase !== 'ready_check' || !isTPlayer) return;
    const allReady = playerIds.every(id => mg.readyPlayers?.[id]);
    if (!allReady || mg.triviaQuestions || loadingAI) return;
    setLoadingAI(true);
    fetch('/api/trivia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: mg.category, difficulty: mg.difficulty }),
    })
      .then(r => r.json())
      .then(data => updateMinigame({ triviaQuestions: data.questions }))
      .catch(err => console.error('Trivia API error', err))
      .finally(() => setLoadingAI(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.readyPlayers, mg?.phase]);

  // ── TPlayer: advance to playing once questions are fetched ────────────
  useEffect(() => {
    if (mg?.phase !== 'ready_check' || !isTPlayer || !mg.triviaQuestions) return;
    const allReady = playerIds.every(id => mg.readyPlayers?.[id]);
    if (!allReady) return;
    updateMinigame({ phase: 'playing' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.triviaQuestions]);

  // ── TPlayer: compute results when ALL players have answered ───────────
  useEffect(() => {
    if (mg?.phase !== 'playing' || !isTPlayer || !mg.triviaQuestions) return;
    const everyoneDone = playerIds.every(id =>
      (mg.triviaAnswers?.[id] ?? []).length >= mg.triviaQuestions.length
    );
    if (!everyoneDone) return;

    const results = playerIds.map(id => {
      const answers = mg.triviaAnswers?.[id] ?? [];
      const score   = mg.triviaQuestions.reduce((acc, q, i) => {
        const ans = answers.find(a => a.questionIndex === i);
        return acc + (ans?.answerIndex === q.answer ? 1 : 0);
      }, 0);
      const time = answers.reduce((sum, a) => sum + a.timestamp, 0);
      return { id, score, time };
    });
    results.sort((a, b) => b.score - a.score || a.time - b.time);
    const scores = Object.fromEntries(results.map(r => [r.id, r.score]));

    updateMinigame({ phase: 'results', winnerId: results[0].id, scores });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.triviaAnswers, mg?.phase]);

  async function handleAnswer(answerIndex) {
    if (myAnswers.find(a => a.questionIndex === currentQ)) return;
    await submitTriviaAnswer(currentQ, answerIndex);
    if (currentQ < qs.length - 1) setCurrentQ(q => q + 1);
  }

  if (!mg) return <div className="page page-center"><div className="spinner" /></div>;

  // ── DICE ──────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Trivia" subtitle="Tout le monde joue !" />
        {isTPlayer
          ? <DiceRoll onResult={val => updateMinigame({ diceValue: val, pointsValue: val, difficulty: val, phase: 'category_select' })} />
          : <p className="muted" style={{ textAlign: 'center' }}>En attente du lancer de dé...</p>}
      </div>
    );
  }

  // ── CATEGORY SELECT ───────────────────────────────────────────────────
  if (mg.phase === 'category_select') {
    const myCategories = players[mg.tPlayerId]?.categories ?? [];
    return (
      <div className="page page-minigame">
        <MgHeader title="Trivia" subtitle={`Difficulté ${mg.difficulty}/6`} />
        {isTPlayer ? (
          <>
            <p className="label" style={{ paddingLeft: 4 }}>Choisis une catégorie</p>
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
            {tName} choisit une catégorie...
          </p>
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
          <p>Difficulté : <strong>{mg.difficulty}/6</strong></p>
          <p className="muted">{readyCount}/{playerIds.length} prêts</p>
        </div>
        {!myReady && (
          <button className="btn btn-success btn-large" onClick={setMinigameReady}>Prêt !</button>
        )}
        {myReady && (
          <p className="muted" style={{ textAlign: 'center' }}>
            {loadingAI ? '⏳ Génération des questions...' : 'En attente des autres joueurs...'}
          </p>
        )}
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────
  if (mg.phase === 'playing') {
    const q             = qs[currentQ];
    const myAns         = myAnswers.find(a => a.questionIndex === currentQ);
    const finishedCount = playerIds.filter(id => (mg.triviaAnswers?.[id] ?? []).length >= qs.length).length;

    if (!q) return <div className="page page-center"><div className="spinner" /></div>;

    return (
      <div className="page page-minigame">
        <MgHeader title="Trivia" subtitle={`Q${currentQ + 1}/${qs.length}`} />
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
          <p className="muted" style={{ textAlign: 'center' }}>
            En attente... ({finishedCount}/{playerIds.length} terminés)
          </p>
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
        <MgHeader title="Résultats" />
        <div className="result-banner card">
          <p className="result-winner">🏆 {players[mg.winnerId]?.name}</p>
          <p className="muted">+{mg.diceValue} points</p>
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
        {isTPlayer && (
          <button className="btn btn-large btn-primary" onClick={() => completeMinigame(mg.winnerId)}>
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
