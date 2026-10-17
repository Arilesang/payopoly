import MgHeader from '../components/MgHeader';
import { useText } from '../context/useText';
import { triviaResult, roundAwards } from '../lib/session';
import Countdown from '../components/Countdown';
// Duel — Trivia (AI-generated MCQ)
// Phases: dice → category_select → category_pick → ready_check → playing → results → complete
// The challenger offers two of their categories and the opponent picks one,
// so neither side gets to choose its own favourite subject outright.
import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';

export default function TriviaDuel() {
  const tr = useText();
  const { game, myPlayerId, isTPlayer, isPPlayer, isSpectator,
          updateMinigame, setMinigameReady, submitTriviaAnswer, completeMinigame,  isController, fetchContent,} = useGame();
  const mg      = game?.currentMinigame;
  const players = game?.players ?? {};
  const loadingAI = Boolean(mg?.loadingContent);
  const setLoadingAI = value => updateMinigame({ loadingContent: value });
  const persistedAnswers = Object.values(mg?.triviaAnswers?.[myPlayerId] ?? {});
  const questionCount = mg?.triviaQuestions?.length ?? 3;
  const currentQ = Math.min(questionCount - 1, persistedAnswers.length);

  const participantIds = [mg?.tPlayerId, mg?.pPlayerId].filter(Boolean);
  const tName = players[mg?.tPlayerId]?.name;
  const pName = players[mg?.pPlayerId]?.name;
  const isParticipant = isTPlayer || isPPlayer;
  const [offer, setOffer] = useState([]);

  // ── TPlayer: fetch trivia once both ready ─────────────────────────────
  useEffect(() => {
    if (mg?.phase !== 'ready_check' || !isController) return;
    const bothReady = participantIds.every(id => mg.readyPlayers?.[id]);
    if (!bothReady || mg.triviaQuestions) return;
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

  // ── TPlayer: advance to playing once questions fetched ────────────────
  useEffect(() => {
    if (mg?.phase !== 'ready_check' || !isController || !mg.triviaQuestions) return;
    const bothReady = participantIds.every(id => mg.readyPlayers?.[id]);
    if (!bothReady) return;
    updateMinigame({ phase: 'playing' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.triviaQuestions, isController]);

  // ── TPlayer: compute results when both players answered all questions ──
  useEffect(() => {
    if (mg?.phase !== 'playing' || !isController || !mg.triviaQuestions) return;
    const allDone = participantIds.every(id =>
      (Object.values(mg.triviaAnswers?.[id] ?? {})).length >= mg.triviaQuestions.length
    );
    if (!allDone) return;

    updateMinigame({ ...triviaResult(mg, participantIds), phase: 'results' });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.triviaAnswers, mg?.phase, isController]);

  async function handleAnswer(answerIndex) {
    const alreadyAnswered = (Object.values(mg.triviaAnswers?.[myPlayerId] ?? {})).find(a => a.questionIndex === currentQ);
    if (alreadyAnswered) return;
    await submitTriviaAnswer(currentQ, answerIndex);

  }

  if (!mg) return <div className="page page-center"><div className="spinner" /></div>;

  // ── DICE ──────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Trivia" subtitle={`${tName} ⚔️ ${pName}`} />
        {isTPlayer
          ? <DiceRoll onResult={val => updateMinigame({ diceValue: val, pointsValue: val, difficulty: val, phase: 'category_select' })} />
          : <p className="muted" style={{ textAlign: 'center' }}>{tr("En attente du lancer de dé...")}</p>}
      </div>
    );
  }

  // ── CATEGORY SELECT — the challenger offers two ───────────────────────
  if (mg.phase === 'category_select') {
    const myCategories = players[mg.tPlayerId]?.categories ?? [];
    const single = myCategories.length < 2;
    const toggle = cat => setOffer(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : prev.length < 2 ? [...prev, cat] : prev);
    return (
      <div className="page page-minigame">
        <MgHeader title="Trivia" subtitle={tr("Difficulté {0}/6", [mg.difficulty])} />
        {isTPlayer ? (
          <>
            <p className="label" style={{ paddingLeft: 4 }}>{single ? tr("Choisis une catégorie") : tr("Propose deux catégories : {0} choisira", [pName])}</p>
            <div className="category-select-list">
              {myCategories.map((cat, i) => (
                <button key={i} className={`btn btn-category ${offer.includes(cat) ? 'voted' : ''}`} aria-pressed={offer.includes(cat)}
                  onClick={() => single ? updateMinigame({ category: cat, phase: 'ready_check' }) : toggle(cat)}>
                  {cat}
                </button>
              ))}
            </div>
            {!single && (
              <button className="btn btn-primary" disabled={offer.length !== 2}
                onClick={() => updateMinigame({ offeredCategories: offer, phase: 'category_pick' })}>
                {tr("Proposer ces deux catégories")}
              </button>
            )}
          </>
        ) : (
          <p className="muted" style={{ textAlign: 'center', marginTop: 40 }}>
            {tName} {tr("choisit deux catégories...")} </p>
        )}
      </div>
    );
  }

  // ── CATEGORY PICK — the opponent chooses one of the two ───────────────
  if (mg.phase === 'category_pick') {
    const offered = mg.offeredCategories ?? [];
    return (
      <div className="page page-minigame">
        <MgHeader title="Trivia" subtitle={tr("Difficulté {0}/6", [mg.difficulty])} />
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Countdown startedAt={mg.phaseStartedAt} total={20} />
        </div>
        {isPPlayer ? (
          <>
            <p className="label" style={{ paddingLeft: 4 }}>{tr("{0} te propose : choisis la catégorie", [tName])}</p>
            <div className="category-select-list">
              {offered.map(cat => (
                <button key={cat} className="btn btn-category" onClick={() => updateMinigame({ category: cat, phase: 'ready_check' })}>{cat}</button>
              ))}
            </div>
          </>
        ) : (
          <p className="muted" style={{ textAlign: 'center' }}>
            {tr("{0} propose {1} ou {2} — {3} choisit...", [tName, offered[0], offered[1], pName])}
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
          <p>{tr("Difficulté :")} <strong>{mg.difficulty}/6</strong></p>
        </div>
        {isParticipant && !myReady && (
          <button className="btn btn-success btn-large" onClick={setMinigameReady}>{tr("Prêt !")}</button>
        )}
        {(myReady || isSpectator) && (
          <p className="muted" style={{ textAlign: 'center' }}>
            {loadingAI ? tr("⏳ Génération des questions...") : tr("En attente...")}
          </p>
        )}
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────
  if (mg.phase === 'playing') {
    const qs    = mg.triviaQuestions ?? [];
    const q     = qs[currentQ];
    const myAns = (Object.values(mg.triviaAnswers?.[myPlayerId] ?? {})).find(a => a.questionIndex === currentQ);
    const allDone = (Object.values(mg.triviaAnswers?.[myPlayerId] ?? {})).length >= qs.length;

    if (!q) return <div className="page page-center"><div className="spinner" /></div>;

    // Spectators follow the duel live: each question is revealed — both picks
    // and the right answer — as soon as both duellists have locked it in.
    if (isSpectator) {
      const pickFor = (id, qi) => Object.values(mg.triviaAnswers?.[id] ?? {}).find(a => a.questionIndex === qi);
      const revealed = qi => participantIds.every(id => pickFor(id, qi));
      const running = id => qs.filter((question, qi) => revealed(qi) && pickFor(id, qi).answerIndex === question.answer).length;
      return (
        <div className="page page-minigame">
          <MgHeader title="Trivia" subtitle={`${tName} ${running(mg.tPlayerId)} – ${running(mg.pPlayerId)} ${pName}`} />
          <Countdown startedAt={mg.countdownStartedAt} total={60} />
          {qs.map((question, qi) => (
            <div key={qi} className="card trivia-question" style={{ marginBottom: 8 }}>
              <p className="label" style={{ marginBottom: 4 }}>Q{qi + 1}</p>
              <p className="trivia-q-text">{question.q}</p>
              <div className="trivia-options" style={{ pointerEvents: 'none' }}>
                {question.options.map((opt, i) => {
                  const pickers = revealed(qi) ? participantIds.filter(id => pickFor(id, qi).answerIndex === i) : [];
                  return (
                    <div key={i} className={`btn btn-category ${revealed(qi) && i === question.answer ? 'trivia-correct' : ''}`} style={{ cursor: 'default', opacity: revealed(qi) ? 1 : 0.7 }}>
                      <span className="opt-letter">{['A', 'B', 'C', 'D'][i]}</span> {opt}
                      {pickers.map(id => <span key={id} className="trivia-picker">{players[id]?.name}</span>)}
                    </div>
                  );
                })}
              </div>
              {!revealed(qi) && (
                <p className="muted duel-note">
                  {participantIds.map(id => `${players[id]?.name} ${pickFor(id, qi) ? '🔒' : '⏳'}`).join(' · ')}
                </p>
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="page page-minigame">
        <MgHeader title="Trivia" subtitle={`Q${currentQ + 1}/${qs.length}`} />
        <Countdown startedAt={mg.countdownStartedAt} total={60} />
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
          <p className="muted" style={{ textAlign: 'center' }}>{tr("En attente des réponses...")}</p>
        )}
      </div>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────
  if (mg.phase === 'results') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Résultats")} />
        <div className="result-banner card">
          <p className="result-winner">{mg.winnerId ? `🏆 ${players[mg.winnerId]?.name}` : mg.winnerIds?.length > 1 ? tr('Égalité') : tr('Aucune bonne réponse')}</p>
          <p className="muted">{mg.winnerId ? `+${roundAwards(game)[mg.winnerId] ?? 0} ${tr('points')}` : mg.winnerIds?.length > 1 ? tr('Points partagés') : `0 ${tr('points')}`}</p>
        </div>
        <div className="score-row card">
          <span>{tName} : {mg.tScore ?? 0}/3</span>
          <span>{pName} : {mg.pScore ?? 0}/3</span>
        </div>
        <div className="card">{(mg.triviaQuestions ?? []).map((q, i) => <p key={i}><strong>{q.q}</strong><br />{q.options[q.answer]}</p>)}</div>
        {isController && (
          <button className="btn btn-large btn-primary" onClick={() => completeMinigame(mg.winnerId)}> {tr("Continuer")} </button>
        )}
      </div>
    );
  }

  return null;
}
