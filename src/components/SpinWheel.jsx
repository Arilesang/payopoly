import { now as sharedNow } from '../lib/clock';
import { useText } from '../context/useText';
import { useLang } from '../context/LangContext';
import { useRef, useEffect, useState } from 'react';

const COLORS = [
  '#b9431b', '#e9ae58', '#f3e9d5', '#e6d9be', '#933619', '#d39853',
];
const INK = '#582b2d';
const PAPER = '#fff1d9';

export default function SpinWheel({ items, onResult, t, forcedResult = null, disabled = false, autoSpin = false, sharedSpin, onStart, isActor = true }) {
  const tr = useText();
  const { lang } = useLang();
  const spinStartedRef = useRef(false);
  const canvasRef = useRef(null);
  const angleRef = useRef(0);
  const animationRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    drawWheel(angleRef.current);
  }, [items, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoSpin && !sharedSpin) spin();
    return () => {
      cancelAnimationFrame(animationRef.current);
      spinStartedRef.current = false;
    };
  }, [autoSpin, sharedSpin?.startedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  function drawWheel(angle) {
    const canvas = canvasRef.current;
    if (!canvas || items.length === 0) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = cx - 16;
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
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + slice / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = i % COLORS.length === 0 || i % COLORS.length === 4 ? PAPER : INK;
      ctx.font = `bold ${items.length > 8 ? 10 : 12}px sans-serif`;
      const translated = tr(item);
      const label = translated.length > 14 ? translated.slice(0, 13) + '…' : translated;
      ctx.fillText(label, radius - 10, 4);
      ctx.restore();
    });

    // Burgundy stage rim with warm marquee bulbs.
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 5, 0, 2 * Math.PI);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 10;
    ctx.stroke();
    for (let i = 0; i < 24; i++) {
      const bulbAngle = i * Math.PI / 12;
      ctx.beginPath();
      ctx.arc(cx + (radius + 5) * Math.cos(bulbAngle), cy + (radius + 5) * Math.sin(bulbAngle), 2, 0, 2 * Math.PI);
      ctx.fillStyle = '#e9ae58';
      ctx.fill();
    }

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, 2 * Math.PI);
    ctx.fillStyle = PAPER;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = 'bold 18px serif';
    ctx.textAlign = 'center';
    ctx.fillText('P', cx, cy + 6);

    // Pointer triangle at top center (drawn on-canvas for exact alignment)
    ctx.beginPath();
    ctx.moveTo(cx - 12, 0);
    ctx.lineTo(cx + 12, 0);
    ctx.lineTo(cx, 18);
    ctx.closePath();
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function spin() {
    if (spinStartedRef.current || spinning || done || disabled || items.length === 0) return;
    spinStartedRef.current = true;
    setSpinning(true);

    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : autoSpin ? 1600 : 4000;
    onStart(forcedResult, duration);
  }

  useEffect(() => {
    if (!sharedSpin) return;
    const winIndex = items.indexOf(sharedSpin.value);
    if (winIndex < 0) return;
    let completionTimer;
    const slice = (2 * Math.PI) / items.length;

    // Pointer is at top (-PI/2). Calculate rotation so winIndex lands there.
    const winCenter = winIndex * slice + slice / 2;
    const target = -Math.PI / 2 - winCenter;
    const current = angleRef.current % (2 * Math.PI);
    let delta = target - current;
    while (delta < 0) delta += 2 * Math.PI;

    const extraSpins = 6 * 2 * Math.PI;
    const totalRotation = extraSpins + delta;

    const duration = sharedSpin.duration;
    const startTime = sharedSpin.startedAt;
    const startAngle = angleRef.current;

    function animate() {
      setSpinning(true);
      const elapsed = Math.max(0, sharedNow() - startTime);
      const progress = duration === 0 ? 1 : Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4); // quartic ease-out
      const angle = startAngle + totalRotation * eased;
      angleRef.current = angle;
      drawWheel(angle);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setDone(true);
        setResult(items[winIndex]);
        if (isActor) completionTimer = setTimeout(() => onResult(items[winIndex]), Math.max(0, startTime + duration + 600 - sharedNow()));
      }
    }

    animationRef.current = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(animationRef.current); clearTimeout(completionTimer); };
  }, [sharedSpin?.startedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="spin-wheel-container">
      <div className={`wheel-wrapper ${spinning ? 'is-spinning' : ''}`}>
        <canvas ref={canvasRef} width={280} height={280} className="wheel-canvas" role="img" aria-label={items.map(item => tr(item)).join(', ')} />
      </div>
      {result && <p className="wheel-result" aria-live="polite">{tr(result)}</p>}
      {isActor && <button
        className="btn btn-accent"
        onClick={spin}
        disabled={spinning || done || disabled}
      >
        {spinning ? t('game.spinning') : t('game.spin')}
      </button>}
    </div>
  );
}
