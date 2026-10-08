import MgHeader from '../components/MgHeader';
import { useText } from '../context/useText';
// ALL — Mimes
// Phases: dice → category_reveal → playing → voting → bonus_pick → complete
import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';
import Countdown from '../components/Countdown';
import { shuffle } from '../utils';

export default function MimesAll() {
  const tr = useText();
  const { game, myPlayerId, isTPlayer, isSpectator,
          updateMinigame, setMinigameReady, castVote, completeMinigame,
          getLobbyPool,  isController, fetchContent,} = useGame();
  const mg      = game?.currentMinigame;
  const players = game?.players ?? {};
  const spectatorIds = Object.keys(players).filter(id => id !== mg?.tPlayerId);
  const tName = players[mg?.tPlayerId]?.name;
  const [loadingWord, setLoadingWord] = useState(false);

  // ── TPlayer: category_reveal → playing once ready ───────────────────
  useEffect(() => {
    if (mg?.phase !== 'category_reveal' || !isController) return;
    if (!mg.readyPlayers?.[mg.tPlayerId] || !mg.mimeWord) return;
    updateMinigame({ phase: 'playing', countdownStartedAt: Date.now() });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.readyPlayers, mg?.phase, mg?.mimeWord, isController]);

  // ── TPlayer: tally votes → bonus_pick or complete ───────────────────
  useEffect(() => {
    if (mg?.phase !== 'voting' || !isController) return;
    const votes = mg.votes ?? {};
    if (Object.keys(votes).length < spectatorIds.length) return;
    const yes = Object.values(votes).filter(v => v === 'yes').length;
    const won = yes > spectatorIds.length / 2;
    if (won) updateMinigame({ phase: 'bonus_pick', winnerId: mg.tPlayerId });
    else     updateMinigame({ phase: 'complete',   winnerId: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.votes, mg?.phase, isController]);

  if (!mg) return <div className="page page-center"><div className="spinner" /></div>;

  // ── DICE ─────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Mimes")} subtitle={tName} />
        {isTPlayer
          ? <DiceRoll onResult={val => {
              const cat = shuffle(getLobbyPool())[0] ?? '?';
              updateMinigame({ diceValue: val, pointsValue: val, category: cat, phase: 'category_reveal' });
              setLoadingWord(true);
              fetchContent('/api/mime-word', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: cat }),
              })

                .then(data => updateMinigame({ mimeWord: data.word }))
                .catch(() => updateMinigame({ mimeWord: '?' }))
                .finally(() => setLoadingWord(false));
            }} />
          : <p className="muted" style={{ textAlign: 'center' }}>{tr("En attente du lancer de dé...")}</p>}
      </div>
    );
  }

  // ── CATEGORY REVEAL ───────────────────────────────────────────────────
  if (mg.phase === 'category_reveal') {
    const myReady = mg.readyPlayers?.[mg.tPlayerId];
    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Mimes")} subtitle={`${mg.diceValue} pt${mg.diceValue > 1 ? 's' : ''}`} />
        {isTPlayer ? (
          <>
            <div className="card" style={{ textAlign: 'center' }}>
              <p className="label">{tr("Catégorie")}</p>
              <p className="mg-category">{mg.category}</p>
              <p className="label" style={{ marginTop: 12 }}>{tr("Mot à mimer")}</p>
              {loadingWord || !mg.mimeWord
                ? <div className="spinner" style={{ margin: '8px auto' }} />
                : <p className="mg-category" style={{ color: 'var(--accent)' }}>{mg.mimeWord}</p>}
            </div>
            {!myReady && mg.mimeWord && (
              <button className="btn btn-success btn-large" onClick={setMinigameReady}>{tr("Prêt !")}</button>
            )}
            {myReady && <p className="muted">{tr("Préparation...")}</p>}
          </>
        ) : (
          <p className="muted" style={{ textAlign: 'center' }}>{tr("Le joueur prend connaissance de sa catégorie...")}</p>
        )}
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────
  if (mg.phase === 'playing') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Mimes")} subtitle={isTPlayer ? `${mg.category} — ${mg.mimeWord ?? '...'}` : tr("🙊 Catégorie cachée")} />
        <Countdown startedAt={mg.countdownStartedAt} />
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
        <MgHeader title="Vote" subtitle={tr("{0} a-t-il/elle réussi le mime ?", [tName])} />
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
        {isTPlayer && <p className="muted" style={{ textAlign: 'center' }}>{tr("Tu ne peux pas voter.")}</p>}
      </div>
    );
  }

  // ── BONUS PICK ────────────────────────────────────────────────────────
  if (mg.phase === 'bonus_pick') {
    const others = Object.entries(players).filter(([id]) => id !== mg.tPlayerId);
    return (
      <div className="page page-minigame">
        <MgHeader title="Bonus" subtitle={tr("Qui a deviné le premier ?")} />
        {isTPlayer ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {others.map(([id, p]) => (
              <button key={id} className="btn btn-category"
                onClick={() => updateMinigame({ bonusWinnerId: id, phase: 'complete' })}>
                {p.name}
              </button>
            ))}
            <button className="btn btn-ghost"
              onClick={() => updateMinigame({ bonusWinnerId: null, phase: 'complete' })}> {tr("Personne")} </button>
          </div>
        ) : (
          <p className="muted" style={{ textAlign: 'center', marginTop: 40 }}>{tName} {tr("choisit un bonus...")}</p>
        )}
      </div>
    );
  }

  // ── COMPLETE ──────────────────────────────────────────────────────────
  if (mg.phase === 'complete') {
    const bonusName = mg.bonusWinnerId ? players[mg.bonusWinnerId]?.name : null;
    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Résultat")} />
        <div className="result-banner card">
          {mg.winnerId
            ? <p className="result-winner">🏆 {tName} +{mg.diceValue} pts</p>
            : <p className="result-winner">{tr("😬 Raté !")}</p>}
          {bonusName && <p className="muted">🎉 {bonusName} +{mg.diceValue} pts (bonus)</p>}
        </div>
        {isController && (
          <button className="btn btn-large btn-primary"
            onClick={() => completeMinigame(mg.winnerId, mg.bonusWinnerId)}> {tr("Continuer")} </button>
        )}
      </div>
    );
  }

  return null;
}
