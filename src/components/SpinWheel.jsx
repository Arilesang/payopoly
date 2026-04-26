import { useRef, useEffect, useState } from 'react';

const COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#c0392b',
  '#2980b9', '#27ae60', '#d35400', '#8e44ad',
];

export default function SpinWheel({ items, onResult, t }) {
  const canvasRef = useRef(null);
  const angleRef = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    drawWheel(angleRef.current);
  }, [items]);

  function drawWheel(angle) {
    const canvas = canvasRef.current;
    if (!canvas || items.length === 0) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = cx - 8;
    const slice = (2 * Math.PI) / items.length;

    ctx.clearRect(0, 0, size, size);

    items.forEach((item, i) => {
      const start = angle + i * slice;
      const end = start + slice;

      // Segment
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + slice / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${items.length > 8 ? 10 : 12}px sans-serif`;
      const label = item.length > 14 ? item.slice(0, 13) + '…' : item;
      ctx.fillText(label, radius - 10, 4);
      ctx.restore();
    });

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Pointer triangle at top center (drawn on-canvas for exact alignment)
    ctx.beginPath();
    ctx.moveTo(cx - 12, 0);
    ctx.lineTo(cx + 12, 0);
    ctx.lineTo(cx, 18);
    ctx.closePath();
    ctx.fillStyle = '#e67e22';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function spin() {
    if (spinning || done) return;
    setSpinning(true);

    const winIndex = Math.floor(Math.random() * items.length);
    const slice = (2 * Math.PI) / items.length;

    // Pointer is at top (-PI/2). Calculate rotation so winIndex lands there.
    const winCenter = winIndex * slice + slice / 2;
    const target = -Math.PI / 2 - winCenter;
    const current = angleRef.current % (2 * Math.PI);
    let delta = target - current;
    while (delta < 0) delta += 2 * Math.PI;

    const extraSpins = (5 + Math.random() * 3) * 2 * Math.PI;
    const totalRotation = extraSpins + delta;

    const duration = 4000;
    const startTime = performance.now();
    const startAngle = angleRef.current;

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4); // quartic ease-out
      const angle = startAngle + totalRotation * eased;
      angleRef.current = angle;
      drawWheel(angle);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setDone(true);
        setResult(items[winIndex]);
        onResult(items[winIndex]);
      }
    }

    requestAnimationFrame(animate);
  }

  return (
    <div className="spin-wheel-container">
      <div className="wheel-wrapper">
        <canvas ref={canvasRef} width={280} height={280} className="wheel-canvas" />
      </div>
      {result && <p className="wheel-result">{result}</p>}
      <button
        className="btn btn-accent"
        onClick={spin}
        disabled={spinning || done}
      >
        {spinning ? t('game.spinning') : t('game.spin')}
      </button>
    </div>
  );
}
