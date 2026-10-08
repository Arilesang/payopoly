import { useText } from '../context/useText';
// DUEL — Punchline
// Both duellists get the same fill-in-the-blank. Everyone else votes on the
// funnier answer, without being told who wrote which.
// Phases: dice → writing → voting → complete
import { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import DiceRoll from '../components/DiceRoll';
import Countdown from '../components/Countdown';
import MgHeader, { Waiting, TallyLine } from '../components/MgHeader';
import { tiedLeaders } from '../lib/session';
import { shuffle, votesSettled, tallyVotes, topVote } from '../utils';

const WRITE_SECONDS = 45;
const VOTE_SECONDS  = 20;
const NO_ANSWER     = '(pas de réponse)';

export default function Punchline() {
  const tr = useText();
  const {
    game, myPlayerId, isTPlayer, isPPlayer, isSpectator,
    updateMinigame, setMyEntry, castVote, closeVoting, completeMinigame,
   isController, fetchContent,} = useGame();

  const mg      = game?.currentMinigame;
  const players = game?.players ?? {};
  const tName   = players[mg?.tPlayerId]?.name;
  const pName   = players[mg?.pPlayerId]?.name;

  const participantIds = [mg?.tPlayerId, mg?.pPlayerId].filter(Boolean);
  const spectatorIds   = Object.keys(players).filter(id => !participantIds.includes(id));
  const submissions    = mg?.submissions ?? {};

  const [draft, setDraft] = useState('');

  // ── TPlayer: both answers in (or time up) → reveal them for the vote ─────
  useEffect(() => {
    if (mg?.phase !== 'writing' || !isController) return;
    if (participantIds.some(id => submissions[id] === undefined)) return;
    openVoting();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.submissions, mg?.phase, isController]);

  // ── TPlayer: votes settled → result ─────────────────────────────────────
  useEffect(() => {
    if (mg?.phase !== 'voting' || !isController) return;
    if (!votesSettled(mg.votes, spectatorIds, mg.voteDeadline)) return;
    updateMinigame({ phase: 'complete', winnerId: topVote(mg.votes), winnerIds: tiedLeaders(mg.votes) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mg?.votes, mg?.phase, mg?.voteDeadline, isController]);

  function openVoting() {
    // Shuffled so the vote buttons carry no hint of who wrote what.
    const options = shuffle(participantIds.map(id => ({
      id,
      text: submissions[id]?.trim() || tr(NO_ANSWER),
    })));
    updateMinigame({
      options,
      phase: 'voting',
      voteDeadline: Date.now() + VOTE_SECONDS * 1000,
      countdownStartedAt: Date.now(),
    });
  }

  if (!mg) return <div className="page page-center"><div className="spinner" /></div>;

  // ── DICE ────────────────────────────────────────────────────────────────
  if (mg.phase === 'dice') {
    return (
      <div className="page page-minigame page-center">
        <MgHeader title="Punchline" subtitle={`${tName} ⚔️ ${pName}`} />
        {isTPlayer
          ? <DiceRoll onResult={val => {
              const cats = players[mg.tPlayerId]?.categories ?? [];
              const cat  = shuffle(cats)[0] ?? 'Général';
              updateMinigame({
                diceValue: val, pointsValue: val, category: cat,
                phase: 'writing', countdownStartedAt: Date.now(),
              });
              fetchContent('/api/punchline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: cat }),
              })

                .then(data => updateMinigame({ promptText: data.prompt ?? '___' }))
                .catch(() => updateMinigame({ promptText: `${cat} : le pire, c'est ___` }));
            }} />
          : <Waiting text={tr("En attente du lancer de dé...")} />}
      </div>
    );
  }

  // ── WRITING ─────────────────────────────────────────────────────────────
  if (mg.phase === 'writing') {
    const amDuellist = isTPlayer || isPPlayer;
    const mine       = submissions[myPlayerId];
    const done       = participantIds.filter(id => submissions[id] !== undefined).length;

    if (!mg.promptText) {
      return (
        <div className="page page-minigame page-center">
          <MgHeader title="Punchline" subtitle={mg.category} />
          <div className="spinner" />
          <Waiting text={tr("Génération de la question...")} />
        </div>
      );
    }

    return (
      <div className="page page-minigame">
        <MgHeader title="Punchline" subtitle={`${tName} ⚔️ ${pName}`} />

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Countdown
            startedAt={mg.countdownStartedAt}
            total={WRITE_SECONDS}
            onExpire={() => { if (isController) openVoting(); }}
          />
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <p className="label">{tr("Complète")}</p>
          <p className="prompt-text">{mg.promptText}</p>
        </div>

        {amDuellist && !mine && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              className="input"
              placeholder={tr("Ta réponse...")}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && draft.trim() && setMyEntry('submissions', draft.trim())}
              maxLength={120}
              autoFocus
              autoComplete="off"
            />
            <button
              className="btn btn-success"
              onClick={() => setMyEntry('submissions', draft.trim())}
              disabled={!draft.trim()}
            > {tr("Envoyer")} </button>
          </div>
        )}

        {amDuellist && mine && <Waiting text={tr("Réponse envoyée. En attente de l'adversaire...")} />}
        {!amDuellist && <Waiting text={tr("Les duellistes écrivent...")} />}

        <TallyLine done={done} total={participantIds.length} label={tr("ont répondu")} />
      </div>
    );
  }

  // ── VOTING ──────────────────────────────────────────────────────────────
  if (mg.phase === 'voting') {
    const options = mg.options ?? [];
    const myVote  = mg.votes?.[myPlayerId];
    const cast    = Object.keys(mg.votes ?? {}).length;

    return (
      <div className="page page-minigame">
        <MgHeader title="Punchline" subtitle={tr("Laquelle est la meilleure ?")} />

        <div className="card" style={{ textAlign: 'center' }}>
          <p className="prompt-text" style={{ fontSize: 17 }}>{mg.promptText}</p>
        </div>

        <div className="punchline-options">
          {options.map((opt, i) => (
            <button
              key={opt.id}
              className={`btn btn-punchline ${myVote === opt.id ? 'voted' : ''}`}
              onClick={() => isSpectator && !myVote && castVote(opt.id)}
              disabled={!isSpectator || !!myVote}
            >
              <span className="opt-letter">{['A', 'B'][i]}</span>
              <span className="punchline-text">{opt.text}</span>

            </button>
          ))}
        </div>

        <TallyLine done={cast} total={spectatorIds.length} label="votes" />
        {!isSpectator && <Waiting text={tr("Tu ne peux pas voter dans ton propre duel.")} />}

        {isTPlayer && cast > 0 && (
          <button className="btn btn-ghost btn-small" onClick={closeVoting}> {tr("Clore le vote")} </button>
        )}
      </div>
    );
  }

  // ── COMPLETE ────────────────────────────────────────────────────────────
  if (mg.phase === 'complete') {
    const points   = mg.pointsValue ?? 0;
    const tally    = tallyVotes(mg.votes);
    const cast     = Object.keys(mg.votes ?? {}).length;
    const winnerId = mg.winnerId;
    // A shutout — every vote cast, none for the loser — pays double.
    const shutout  = !!winnerId && cast >= 2 && (tally[winnerId] ?? 0) === cast;
    const payout   = shutout ? points * 2 : points;
    const awards   = winnerId ? { [winnerId]: payout } : {};

    return (
      <div className="page page-minigame page-center">
        <MgHeader title={tr("Résultat")} />
        <div className="result-banner card">
          {winnerId
            ? <>
                <p className="result-winner">🏆 {players[winnerId]?.name}</p>
                <p className="muted">+{payout} pts{shutout ? tr(" — carton plein, points doublés !") : ''}</p>
              </>
            : <p className="result-winner">{mg.winnerIds?.length > 1 ? tr('Égalité') : tr("Personne n'a voté !")}</p>}
        </div>

        <div className="card" style={{ width: '100%' }}>
          {(mg.options ?? []).map(opt => (
            <div key={opt.id} className="mg-row">
              <span style={{ flex: 1 }}>{opt.text}</span>
              <span className="muted">{players[opt.id]?.name}</span>
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
