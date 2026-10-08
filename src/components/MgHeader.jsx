// Shared stage header for every minigame and phase.

export default function MgHeader({ title, subtitle }) {
  return (
    <div className="mg-header">
      <p className="mg-brand">PayoPoly</p>
      <h1 className="mg-title">{title}</h1>
      {subtitle && <p className="mg-subtitle">{subtitle}</p>}
    </div>
  );
}

export function Waiting({ text }) {
  return <p className="muted" style={{ textAlign: 'center' }}>{text}</p>;
}

// Progress line used while a phase waits on everyone — "4/7 ont répondu"
export function TallyLine({ done, total, label }) {
  return (
    <p className="muted" style={{ textAlign: 'center' }}>
      {done}/{total} {label}
    </p>
  );
}
