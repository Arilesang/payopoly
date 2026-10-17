// Duel staging shared by every duel minigame: the face-off card on the intro,
// the compact duel bar during play, spectator predictions and emoji reactions.
// Spectators always have something to do or watch here, whatever the duel.
import { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
import { PREDICTION_DUELS, PRE_PLAY_PHASES, BOUNTY_SHARE } from '../gameConfig';
import { headToHead, soleWinner } from '../lib/session';
import { rankingRows } from '../lib/rankings';
import { now } from '../lib/clock';

const REACTIONS = ['👏', '🔥', '😂', '😱', '🍿'];
const REACTION_MS = 3500;
const REACTION_COOLDOWN_MS = 1200;

function useDuel() {
  const { game } = useGame();
  const mg = game.currentMinigame;
  const players = game.players ?? {};
  const ids = [mg.tPlayerId, mg.pPlayerId];
  const spectatorIds = Object.keys(players).filter(id => !ids.includes(id));
  return { game, mg, players, ids, spectatorIds };
}

export function FaceOff() {
  const { game, mg, players, ids: [tId, pId] } = useDuel();
  const { say } = useLang();
  const rows = Object.fromEntries(rankingRows(game).map(row => [row.id, row]));
  const record = headToHead(game.history, tId, pId);
  const played = record[tId] + record[pId];
  const side = (id, role) => (
    <div className="faceoff-side">
      <strong className="faceoff-name">{players[id]?.name}</strong>
      <span className="faceoff-score">#{rows[id]?.rank} · {rows[id]?.points ?? 0} pts</span>
      <span className="label">{role}</span>
    </div>
  );
  return (
    <div className="card faceoff">
      <div className="faceoff-row">
        {side(tId, say('Challenger', 'Challenger'))}
        <div className="faceoff-mid">
          <span className="faceoff-vs">VS</span>
          <span className="faceoff-h2h">{played ? `${record[tId]} – ${record[pId]}` : say('Premier duel', 'First duel')}</span>
        </div>
        {side(pId, say('Défié', 'Challenged'))}
      </div>
      {mg.bounty && <p className="duel-bounty">🎯 {say(
        `Prime au leader : si ${players[tId]?.name} gagne, +${BOUNTY_SHARE * 100} % des points du dé.`,
        `Leader bounty: if ${players[tId]?.name} wins, +${BOUNTY_SHARE * 100}% of the die's points.`)}</p>}
      <Predictions />
    </div>
  );
}

export function DuelBar() {
  const { mg, players, ids } = useDuel();
  const { isSpectator } = useGame();
  const { say } = useLang();
  const winner = ['complete', 'results'].includes(mg.phase) ? soleWinner(mg) : null;
  return (
    <>
      <section className="duel-bar" aria-label={say('Duel en cours', 'Duel in progress')}>
        <div className="duel-bar-players">
          {ids.map((id, i) => (
            <span key={id} className={`duel-bar-player ${winner === id ? 'duel-bar-winner' : ''}`}>
              {i === 1 && <span className="duel-vs" aria-hidden="true">VS</span>}
              <strong>{players[id]?.name}</strong> <small>{players[id]?.points ?? 0} pts</small>
            </span>
          ))}
        </div>
        {(mg.diceValue || mg.bounty) && <p className="duel-bar-meta">
          {mg.diceValue ? `🎲 ${mg.diceValue} pts` : ''}
          {mg.bounty && <span className="duel-bounty"> 🎯 {say('Prime au leader', 'Leader bounty')} +{BOUNTY_SHARE * 100}%</span>}
        </p>}
        <Predictions />
        {isSpectator && !winner && <ReactionPicker />}
      </section>
      <ReactionLayer />
    </>
  );
}

function Predictions() {
  const { mg, players, ids, spectatorIds } = useDuel();
  const { myPlayerId, isSpectator, placeBet } = useGame();
  const { say } = useLang();
  if (!PREDICTION_DUELS.includes(mg.name) || !spectatorIds.length) return null;
  const bets = mg.bets ?? {};
  const mine = bets[myPlayerId];
  const placed = spectatorIds.filter(id => bets[id]).length;

  // Picks stay hidden until play starts, so nobody just follows the crowd.
  if (PRE_PLAY_PHASES.includes(mg.phase)) {
    if (isSpectator && !mine) {
      return (
        <div className="duel-predictions">
          <p className="label">🔮 {say('Ton pronostic : qui gagne ?', 'Your prediction: who wins?')}</p>
          <div className="duel-bet-row">
            {ids.map(id => <button key={id} className="btn btn-category" onClick={() => placeBet(id)}>{players[id]?.name}</button>)}
          </div>
          <p className="muted duel-note">{say('Juste : ½ dé. Juste contre la majorité : le dé entier.', 'Right: half the die. Right against the majority: the full die.')}</p>
        </div>
      );
    }
    return (
      <p className="muted duel-note">
        🔮 {mine && say(`Ton pronostic : ${players[mine]?.name} · `, `Your prediction: ${players[mine]?.name} · `)}
        {say(`${placed}/${spectatorIds.length} pronostics · révélés au coup d’envoi`, `${placed}/${spectatorIds.length} predictions · revealed at kick-off`)}
      </p>
    );
  }

  const tally = ids.map(id => `${players[id]?.name} ${Object.values(bets).filter(pick => pick === id).length}`).join(' · ');
  return <p className="duel-note duel-tally">🔮 {say(`Pronostics : ${tally}`, `Predictions: ${tally}`)}</p>;
}

function ReactionPicker() {
  const { sendReaction } = useGame();
  const { say } = useLang();
  const lastSent = useRef(0);
  function send(emoji) {
    const at = now();
    if (at - lastSent.current < REACTION_COOLDOWN_MS) return;
    lastSent.current = at;
    sendReaction(emoji).catch(() => {});
  }
  return (
    <div className="reaction-picker" role="group" aria-label={say('Réagir', 'React')}>
      {REACTIONS.map(emoji => <button key={emoji} className="reaction-btn" onClick={() => send(emoji)}>{emoji}</button>)}
    </div>
  );
}

// Every screen, duellists included, sees the room react in real time.
function ReactionLayer() {
  const { mg, players } = useDuel();
  const [time, setTime] = useState(now);
  useEffect(() => {
    const id = setInterval(() => setTime(now()), 500);
    return () => clearInterval(id);
  }, []);
  const recent = Object.entries(mg.reactions ?? {})
    .filter(([, r]) => time - r.at < REACTION_MS)
    .sort((a, b) => a[1].at - b[1].at)
    .slice(-12);
  return (
    <div className="reaction-layer" aria-hidden="true">
      {recent.map(([key, r]) => (
        <span key={key} className="reaction-float" style={{ right: `${4 + ([...key].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 18)}%` }}>
          {r.emoji}<small>{players[r.by]?.name}</small>
        </span>
      ))}
    </div>
  );
}
