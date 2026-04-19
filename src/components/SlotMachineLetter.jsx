import { useState, useEffect } from 'react';
import { PETIT_BAC_LETTERS } from '../context/GameContext';

export default function SlotMachineLetter({ targetLetter, onDone }) {
  const [display, setDisplay] = useState('?');
  const [done, setDone]       = useState(false);

  useEffect(() => {
    if (!targetLetter) return;
    let ticks = 0;
    const max = 20;
    const id = setInterval(() => {
      ticks++;
      setDisplay(PETIT_BAC_LETTERS[Math.floor(Math.random() * PETIT_BAC_LETTERS.length)]);
      if (ticks >= max) {
        clearInterval(id);
        setDisplay(targetLetter);
        setDone(true);
        if (onDone) onDone();
      }
    }, 70);
    return () => clearInterval(id);
  }, [targetLetter]);

  return (
    <div className="slot-machine">
      <div className={`slot-letter ${done ? 'slot-done' : 'slot-spinning'}`}>
        {display}
      </div>
    </div>
  );
}
