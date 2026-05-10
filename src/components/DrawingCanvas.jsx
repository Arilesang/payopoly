import { useRef, useEffect, useState } from 'react';

const COLORS = ['#1a1a1a', '#e74c3c', '#3498db', '#27ae60', '#f39c12', '#9b59b6'];
const PEN_W    = 0.010; // normalized stroke width (fraction of canvas width)
const ERASER_W = 0.060;

function drawStroke(ctx, canvas, stroke) {
  const raw = stroke.points;
  if (!raw) return;
  const pts = Array.isArray(raw) ? raw : Object.values(raw);
  if (pts.length < 1) return;
  ctx.beginPath();
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth   = stroke.width * canvas.width;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.moveTo(pts[0].x * canvas.width, pts[0].y * canvas.height);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x * canvas.width, pts[i].y * canvas.height);
  }
  ctx.stroke();
}

export default function DrawingCanvas({ isDrawer, strokes, currentStroke, onStrokeComplete, onStrokeUpdate, onClear }) {
  const canvasRef        = useRef(null);
  const [color, setColor]     = useState(COLORS[0]);
  const [isEraser, setIsEraser] = useState(false);

  // Refs so event handlers never have stale closures
  const colorRef          = useRef(COLORS[0]);
  const isEraserRef       = useRef(false);
  const isDrawingRef      = useRef(false);
  const localPointsRef    = useRef([]);
  const throttleTimerRef  = useRef(null);
  const strokesRef        = useRef(strokes);
  const currentStrokeRef  = useRef(currentStroke);
  const redrawRef         = useRef(null);

  useEffect(() => { colorRef.current = color; },    [color]);
  useEffect(() => { isEraserRef.current = isEraser; }, [isEraser]);

  // Core redraw — reads everything from refs, safe to call anytime
  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const s of Object.values(strokesRef.current ?? {})) {
      if (s) drawStroke(ctx, canvas, s);
    }
    if (currentStrokeRef.current) drawStroke(ctx, canvas, currentStrokeRef.current);
    if (localPointsRef.current.length > 0) {
      drawStroke(ctx, canvas, {
        color: isEraserRef.current ? '#ffffff' : colorRef.current,
        width: isEraserRef.current ? ERASER_W : PEN_W,
        points: localPointsRef.current,
      });
    }
  }
  redrawRef.current = redraw;

  useEffect(() => { strokesRef.current = strokes;              redrawRef.current(); }, [strokes]);
  useEffect(() => { currentStrokeRef.current = currentStroke; redrawRef.current(); }, [currentStroke]);

  // Keep canvas pixel buffer matching its CSS size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sync = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (width && height) { canvas.width = width; canvas.height = height; }
      redrawRef.current();
    };
    const observer = new ResizeObserver(sync);
    observer.observe(canvas);
    sync();
    return () => observer.disconnect();
  }, []);

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const src    = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) / rect.width, y: (src.clientY - rect.top) / rect.height };
  }

  function handleStart(e) {
    if (!isDrawer) return;
    e.preventDefault();
    isDrawingRef.current = true;
    localPointsRef.current = [getPos(e)];
    redrawRef.current();
  }

  function handleMove(e) {
    if (!isDrawer || !isDrawingRef.current) return;
    e.preventDefault();
    localPointsRef.current.push(getPos(e));
    redrawRef.current();

    if (!throttleTimerRef.current) {
      throttleTimerRef.current = setTimeout(() => {
        throttleTimerRef.current = null;
        if (localPointsRef.current.length > 0) {
          onStrokeUpdate?.({
            color: isEraserRef.current ? '#ffffff' : colorRef.current,
            width: isEraserRef.current ? ERASER_W : PEN_W,
            points: [...localPointsRef.current],
          });
        }
      }, 150);
    }
  }

  function handleEnd(e) {
    if (!isDrawer || !isDrawingRef.current) return;
    e.preventDefault();
    isDrawingRef.current = false;
    clearTimeout(throttleTimerRef.current);
    throttleTimerRef.current = null;

    const pts = localPointsRef.current;
    if (pts.length > 0) {
      onStrokeComplete?.({
        color: isEraserRef.current ? '#ffffff' : colorRef.current,
        width: isEraserRef.current ? ERASER_W : PEN_W,
        points: pts,
      });
    }
    onStrokeUpdate?.(null);
    localPointsRef.current = [];
  }

  return (
    <div className="drawing-canvas-wrap">
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        style={{ cursor: isDrawer ? (isEraser ? 'cell' : 'crosshair') : 'default', touchAction: 'none' }}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
      {isDrawer && (
        <div className="drawing-toolbar">
          <div className="color-palette">
            {COLORS.map(c => (
              <button
                key={c}
                className={`color-btn${color === c && !isEraser ? ' active' : ''}`}
                style={{ background: c }}
                onClick={() => { setColor(c); setIsEraser(false); }}
              />
            ))}
            <button
              className={`color-btn eraser-btn${isEraser ? ' active' : ''}`}
              onClick={() => setIsEraser(true)}
              title="Gomme"
            >⌫</button>
          </div>
          <button className="btn btn-ghost btn-small" style={{ width: 'auto' }} onClick={onClear}>
            Effacer
          </button>
        </div>
      )}
    </div>
  );
}
