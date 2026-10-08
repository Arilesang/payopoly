import { useText } from '../context/useText';
import { useGame } from '../context/GameContext';
import { useState, useEffect, useRef } from 'react';

const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function DiceRoll({ onResult, autoRoll: autoRollProp }) {
  const tr = useText();
  const { game } = useGame();
  const autoRoll = autoRollProp ?? game?.settings?.preset === 'quick';
  const rollStartedRef = useRef(false);
  const [face, setFace]       = useState('🎲');
  const [rolling, setRolling] = useState(false);
  const [result, setResult]   = useState(null);

  useEffect(() => {
    if (autoRoll) roll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function roll() {
    if (rollStartedRef.current || rolling || result) return;
    rollStartedRef.current = true;
    setRolling(true);
    const value = Math.floor(Math.random() * 6) + 1; // 1-6
    let ticks = 0;
    const max = 14;
    const id = setInterval(() => {
      ticks++;
      setFace(FACES[Math.floor(Math.random() * 6)]);
      if (ticks >= max) {
        clearInterval(id);
        setFace(FACES[value - 1]);
        setRolling(false);
        setResult(value);
        onResult(value);
      }
    }, 80);
  }

  return (
    <div className="dice-container">
      <div className={`dice-face ${rolling ? 'dice-rolling' : ''} ${result ? 'dice-done' : ''}`}>
        {face}
      </div>
      {result && (
        <p className="dice-result-text">{result} point{result > 1 ? 's' : ''}</p>
      )}
      {!result && !rolling && (
        <button className="btn btn-primary" onClick={roll}>{tr("Lancer le dé")}</button>
      )}
    </div>
  );
}
