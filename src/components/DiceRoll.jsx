import { useText } from '../context/useText';
import { useGame } from '../context/GameContext';
import { useState, useEffect, useRef } from 'react';
import { now } from '../lib/clock';

const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const ROLL_MS = 1120;
const HOLD_MS = 600;

export default function DiceRoll({ onResult, autoRoll: autoRollProp }) {
  const tr = useText();
  const { game, isTPlayer, startDiceRoll } = useGame();
  const event = game?.currentMinigame?.diceRoll;
  const autoRoll = autoRollProp ?? game?.settings?.preset === 'quick';
  const [tick, setTick] = useState(now);
  const completed = useRef(false);
  const callback = useRef(onResult);
  useEffect(() => { callback.current = onResult; }, [onResult]);

  useEffect(() => {
    if (autoRoll && isTPlayer && !event) startDiceRoll();
  }, [autoRoll, isTPlayer, event, startDiceRoll]);

  useEffect(() => {
    if (!event) return;
    const advance = () => {
      const time = now();
      setTick(time);
      if (time >= event.startedAt + ROLL_MS + HOLD_MS && isTPlayer && callback.current && !completed.current) {
        completed.current = true;
        callback.current(event.value);
      }
    };
    advance();
    const timer = setInterval(advance, 40);
    return () => clearInterval(timer);
  }, [event?.startedAt, event?.value, isTPlayer]); // eslint-disable-line react-hooks/exhaustive-deps

  const elapsed = event ? Math.max(0, tick - event.startedAt) : 0;
  const rolling = event && elapsed < ROLL_MS;
  const result = event && !rolling ? event.value : null;
  const face = !event ? '?' : rolling ? FACES[(Math.floor(elapsed / 80) + event.value) % 6] : FACES[result - 1];

  return (
    <div className="dice-container" role="status" aria-live="polite">
      <div className={`dice-face ${rolling ? 'dice-rolling' : ''} ${result ? 'dice-done' : ''}`}>{face}</div>
      {result && <p className="dice-result-text">{result} point{result > 1 ? 's' : ''}</p>}
      {!event && (isTPlayer
        ? <button className="btn btn-primary" onClick={startDiceRoll}>{tr('Lancer le dé')}</button>
        : <p className="muted">{tr('En attente du lancer de dé...')}</p>)}
    </div>
  );
}
