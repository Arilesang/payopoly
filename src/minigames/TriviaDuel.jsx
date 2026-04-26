// Duel — Trivia (AI-generated MCQ)
// Phases: dice → category_select → ready_check → playing → results → complete
import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';

export default function TriviaDuel() {
  const { game, myPlayerId, isTPlayer, isPPlayer, isSpectator,
          updateMinigame, setMinigameReady, submitTriviaAnswer, completeMinigame } = useGame();
  const mg      = game?.currentMinigame;
  const players = game?.players ?? {};
  const [loadingAI, setLoadingAI] = useState(false);
  const [currentQ, setCurrentQ]   = useState(0);

  const participantIds = [mg?.tPlayerId, mg?.pPlayerId].filter(Boolean);
  const tName = players[mg?.tPlayerId]?.name;
  const pName = players[mg?.pPlayerId]?.name;
  const isParticipant = isTPlayer || isPPlayer;

  // ── TPlayer: fetch trivia once both ready ─────────────────────────────
  useEffect(() => {
    if (mg?.phase !== 'ready_check' || !isTPlayer) return;
    const bothReady = participantIds.every(id => mg.readyPlayers?.[id]);
    if (!bothReady || mg.triviaQuestions || loadingAI) return;
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

  // ── TPlayer: advance to playing once questions fetched ────────────────
  useEffect(() => {
    if (mg?.phase !== 'ready_check' || !isTPlayer || !mg.triviaQuestions) return;
    const bothReady = participantIds.every(id => mg.readyPlayers?.[id]);
    if (!bothReady) return;
    updateMinigame({ phase: 'playing' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.triviaQuestions]);

  // ── TPlayer: compute results when both players answered all questions ──
  useEffect(() => {
    if (mg?.phase !== 'playing' || !isTPlayer || !mg.triviaQuestions) return;
    const allDone = participantIds.every(id =>
      (mg.triviaAnswers?.[id] ?? []).length >= mg.triviaQuestions.length
    );
    if (!allDone) return;

    const qs = mg.triviaQuestions;
    let tScore = 0, pScore = 0, tTime = 0, pTime = 0;
    qs.forEach((q, i) => {
      const tAns = (mg.triviaAnswers?.[mg.tPlayerId] ?? []).find(a => a.questionIndex === i);
      const pAns = (mg.triviaAnswers?.[mg.pPlayerId] ?? []).find(a => a.questionIndex === i);
      if (tAns?.answerIndex === q.answer) { tScore++; tTime += tAns.timestamp; }
      if (pAns?.answerIndex === q.answer) { pScore++; pTime += pAns.timestamp; }
    });

    let winnerId;
    if (tScore > pScore)      winnerId = mg.tPlayerId;
    else if (pScore > tScore) winnerId = mg.pPlayerId;
    else                      winnerId = tTime <= pTime ? mg.tPlayerId : mg.pPlayerId;

    updateMinigame({ phase: 'results', winnerId, tScore, pScore });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.triviaAnswers, mg?.phase]);

  async function handleAnswer(answerIndex) {
    const alreadyAnswered = (mg.triviaAnswers?.[myPlayerId] ?? []).find(a => a.questionIndex === currentQ);
    if (alreadyAnswered) return;
    await submitTriviaAnswer(currentQ, answerIndex);
    const total = mg.triviaQuestions?.length ?? 3;
    if (currentQ < total - 1) setCurrentQ(q => q + 1);
  }

  if (!mg) return <div className="page page-center"><div className="spinner" /></div>;

  // ── DICE ──────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Trivia" subtitle={`${tName} ⚔️ ${pName}`} />
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
    const myReady = mg.readyPlayers?.[myPlayerId];
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Trivia" subtitle={mg.category} />
        <div className="card" style={{ textAlign: 'center' }}>
          <p>Difficulté : <strong>{mg.difficulty}/6</strong></p>
        </div>
        {isParticipant && !myReady && (
          <button className="btn btn-success btn-large" onClick={setMinigameReady}>Prêt !</button>
        )}
        {(myReady || isSpectator) && (
          <p className="muted" style={{ textAlign: 'center' }}>
            {loadingAI ? '⏳ Génération des questions...' : 'En attente...'}
          </p>
        )}
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────
  if (mg.phase === 'playing') {
    const qs    = mg.triviaQuestions ?? [];
    const q     = qs[currentQ];
    const myAns = (mg.triviaAnswers?.[myPlayerId] ?? []).find(a => a.questionIndex === currentQ);
    const allDone = (mg.triviaAnswers?.[myPlayerId] ?? []).length >= qs.length;

    if (!q) return <div className="page page-center"><div className="spinner" /></div>;

    if (isSpectator) {
      return (
        <div className="page page-minigame">
          <MgHeader title="Trivia" subtitle={`${tName} ⚔️ ${pName}`} />
          {qs.map((question, qi) => (
            <div key={qi} className="card trivia-question" style={{ marginBottom: 8 }}>
              <p className="label" style={{ marginBottom: 4 }}>Q{qi + 1}</p>
              <p className="trivia-q-text">{question.q}</p>
              <div className="trivia-options" style={{ pointerEvents: 'none', opacity: 0.7 }}>
                {question.options.map((opt, i) => (
                  <div key={i} className="btn btn-category" style={{ cursor: 'default' }}>
                    <span className="opt-letter">{['A', 'B', 'C', 'D'][i]}</span> {opt}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="muted" style={{ textAlign: 'center' }}>En attente des réponses...</p>
        </div>
      );
    }

    return (
      <div className="page page-minigame">
        <MgHeader title="Trivia" subtitle={`Q${currentQ + 1}/${qs.length}`} />
        <div className="card trivia-question">
          <p className="trivia-q-text">{q.q}</p>
        </div>
        {isParticipant && !allDone && (
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
          <p className="muted" style={{ textAlign: 'center' }}>En attente des réponses...</p>
        )}
      </div>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────
  if (mg.phase === 'results') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Résultats" />
        <div className="result-banner card">
          <p className="result-winner">🏆 {players[mg.winnerId]?.name}</p>
          <p className="muted">+{mg.diceValue} points</p>
        </div>
        <div className="score-row card">
          <span>{tName} : {mg.tScore ?? 0}/3</span>
          <span>{pName} : {mg.pScore ?? 0}/3</span>
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
