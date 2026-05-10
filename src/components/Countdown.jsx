import { useState, useEffect } from 'react';

export default function Countdown({ startedAt, onExpire, total = 30 }) {
  const [remaining, setRemaining] = useState(total);
  const [expired, setExpired]     = useState(false);

  useEffect(() => {
    if (!startedAt) return;
    function tick() {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left    = Math.max(0, total - elapsed);
      setRemaining(left);
      if (left === 0 && !expired) {
        setExpired(true);
        if (onExpire) onExpire();
      }
    }
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt]);

  const pct     = (remaining / total) * 100;
  const urgent  = remaining <= 10;
  const color   = remaining > (total * 0.5) ? '#27ae60' : remaining > (total * 0.25) ? '#f39c12' : '#e74c3c';

  return (
    <div className="countdown-wrap">
      <svg className="countdown-ring" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <circle
          cx="30" cy="30" r="26" fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={`${2 * Math.PI * 26}`}
          strokeDashoffset={`${2 * Math.PI * 26 * (1 - pct / 100)}`}
          strokeLinecap="round"
          transform="rotate(-90 30 30)"
          style={{ transition: 'stroke-dashoffset 0.4s linear, stroke 0.5s' }}
        />
        <text x="30" y="35" textAnchor="middle" fill={urgent ? color : '#fff'}
          fontSize="16" fontWeight="bold" className={urgent ? 'countdown-urgent' : ''}>
          {remaining}
        </text>
      </svg>
    </div>
  );
}
