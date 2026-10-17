import MgHeader from '../components/MgHeader';
import { useText } from '../context/useText';
// Solo — Mot Melangés (AI-generated jumbled word)
// Phases: dice → category_display → playing → voting → complete
import { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';
import Countdown from '../components/Countdown';
import { shuffle } from '../utils';

export default function MotMelanges() {
  const tr = useText();
  const { game, myPlayerId, isTPlayer, isSpectator,
          updateMinigame, setMinigameReady, castVote, completeMinigame,
          getLobbyPool,  isController, fetchContent,} = useGame();
  const mg      = game?.currentMinigame;
  const players = game?.players ?? {};
  const loadingAI = Boolean(mg?.loadingContent);
  const setLoadingAI = value => updateMinigame({ loadingContent: value });
  const spectatorIds = Object.keys(players).filter(id => id !== mg?.tPlayerId);
  const tName = players[mg?.tPlayerId]?.name;

  // ── TPlayer: fetch AI jumble then advance to playing ─────────────────
  useEffect(() => {
    if (mg?.phase !== 'category_display' || !isController) return;
    if (!mg.readyPlayers?.[mg.tPlayerId]) return;
    if (mg.jumbledWord) {
      // Word already fetched — advance to playing
      updateMinigame({ phase: 'playing', countdownStartedAt: Date.now() });
      return;
    }
    // Fetch from AI
    setLoadingAI(true);
    fetchContent('/api/jumble', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: mg.category, difficulty: mg.difficulty }),
    })

      .then(data => updateMinigame({ jumbledWord: data.jumbled, originalWord: data.original }))
      .catch(err => console.error('Jumble API error', err))
      .finally(() => setLoadingAI(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.readyPlayers, mg?.jumbledWord, mg?.phase, isController]);

  // ── Once word is fetched, advance to playing ─────────────────────────
  useEffect(() => {
    if (mg?.phase !== 'category_display' || !isController) return;
    if (!mg.readyPlayers?.[mg.tPlayerId] || !mg.jumbledWord) return;
    updateMinigame({ phase: 'playing', countdownStartedAt: Date.now() });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.jumbledWord, isController]);

  // ── TPlayer: tally votes → complete ──────────────────────────────────
  useEffect(() => {
    if (mg?.phase !== 'voting' || !isController) return;
    const votes = mg.votes ?? {};
    if (Object.keys(votes).length < spectatorIds.length) return;
    const yes = Object.values(votes).filter(v => v === 'yes').length;
    const won = yes > spectatorIds.length / 2;
    updateMinigame({ phase: 'complete', winnerId: won ? mg.tPlayerId : null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.votes, mg?.phase, isController]);

  if (!mg) return <div className="page page-center"><div className="spinner" /></div>;

  // ── DICE ──────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Mot Melangés")} subtitle={tName} />
        {isTPlayer
          ? <DiceRoll onResult={val => {
              const cat = shuffle(getLobbyPool())[0] ?? '?';
              updateMinigame({ diceValue: val, pointsValue: val, difficulty: val, category: cat, phase: 'category_display' });
            }} />
          : <p className="muted" style={{ textAlign: 'center' }}>{tr("En attente du lancer de dé...")}</p>}
      </div>
    );
  }

  // ── CATEGORY DISPLAY ─────────────────────────────────────────────────
  if (mg.phase === 'category_display') {
    const myReady = mg.readyPlayers?.[mg.tPlayerId];
    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Mot Melangés")} subtitle={tr("Difficulté {0}/6", [mg.difficulty])} />
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="label">{tr("Catégorie")}</p>
          <p className="mg-category">{mg.category}</p>
        </div>
        {isTPlayer && !myReady && (
          <button className="btn btn-success btn-large" onClick={setMinigameReady}> {tr("Prêt !")} </button>
        )}
        {(myReady || !isTPlayer) && (
          <p className="muted" style={{ textAlign: 'center' }}>
            {loadingAI ? tr("⏳ Génération du mot...") : tr("Préparation...")}
          </p>
        )}
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────
  if (mg.phase === 'playing') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Mot Melangés")} subtitle={mg.category} />
        <Countdown startedAt={mg.countdownStartedAt} />
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="label">{tr("Trouve le mot")}</p>
          <p className="jumbled-word">{mg.jumbledWord}</p>
        </div>
        {isTPlayer && (
          <button className="btn btn-primary" onClick={() => updateMinigame({ phase: 'voting' })}> {tr("Temps écoulé → Voter")} </button>
        )}
      </div>
    );
  }

  // ── VOTING ────────────────────────────────────────────────────────────
  if (mg.phase === 'voting') {
    return (
      <div className="page page-minigame">
        <MgHeader title="Vote" subtitle={tr("{0} a-t-il/elle trouvé ?", [tName])} />
        <div className="vote-yesno">
          {['yes', 'no'].map(choice => {
            const myVote = mg.votes?.[myPlayerId];
            return (
              <button key={choice}
                className={`btn ${choice === 'yes' ? 'btn-vote-yes' : 'btn-vote-no'} ${myVote === choice ? 'voted' : ''}`}
                onClick={() => isSpectator && !myVote && castVote(choice)}
                disabled={!isSpectator || !!myVote}
              >
                {choice === 'yes' ? tr("✅ Oui") : tr("❌ Non")}
              </button>
            );
          })}
        </div>
        <p className="muted" style={{ textAlign: 'center' }}>
          {Object.keys(mg.votes ?? {}).length}/{spectatorIds.length} votes
        </p>
        <div className="card" style={{ textAlign: 'center', marginTop: 8 }}>
          <p className="label">{tr("Réponse")}</p>
          <p style={{ fontWeight: 700, fontSize: 20 }}>{mg.originalWord}</p>
        </div>
      </div>
    );
  }

  // ── COMPLETE ──────────────────────────────────────────────────────────
  if (mg.phase === 'complete') {
    const won = !!mg.winnerId;
    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Résultat")} />
        <div className="result-banner card" style={{ textAlign: 'center' }}>
          {won
            ? <p className="result-winner">🏆 {tName} +{mg.diceValue} pts</p>
            : <p className="result-winner">{tr("😬 Raté !")}</p>}
          <p className="muted">{tr("Le mot était :")} <strong>{mg.originalWord}</strong></p>
        </div>
        {isController && (
          <button className="btn btn-large btn-primary" onClick={() => completeMinigame(mg.winnerId)}> {tr("Continuer")} </button>
        )}
      </div>
    );
  }

  return null;
}
