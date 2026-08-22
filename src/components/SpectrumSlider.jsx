// Le Curseur — a 0-100 dial between two opposite poles.
//
// Three display modes, all driven by props: a plain slider while guessing, a
// slider with the hidden target band shown (turn player only), and a read-only
// reveal with every player's pin dropped on the line.
export default function SpectrumSlider({
  value,
  onChange,
  disabled = false,
  left,
  right,
  target = null,
  band = 8,
  pins = [],
}) {
  return (
    <div className="spectrum">
      <div className="spectrum-poles">
        <span className="spectrum-pole">{left}</span>
        <span className="spectrum-pole spectrum-pole-right">{right}</span>
      </div>

      <div className="spectrum-track-wrap">
        <div className="spectrum-track">
          {target !== null && (
            <>
              <span
                className="spectrum-band spectrum-band-wide"
                style={{ left: `${Math.max(0, target - band * 2.5)}%`, width: `${Math.min(100, band * 5)}%` }}
              />
              <span
                className="spectrum-band"
                style={{ left: `${Math.max(0, target - band)}%`, width: `${Math.min(100, band * 2)}%` }}
              />
              <span className="spectrum-target" style={{ left: `${target}%` }} />
            </>
          )}

          {pins.map(pin => (
            <span key={pin.id} className="spectrum-pin" style={{ left: `${pin.value}%` }}>
              <span className="spectrum-pin-dot" />
              <span className="spectrum-pin-name">{pin.name}</span>
            </span>
          ))}
        </div>

        {onChange && (
          <input
            className="spectrum-input"
            type="range"
            min="0"
            max="100"
            step="1"
            value={value}
            disabled={disabled}
            onChange={e => onChange(Number(e.target.value))}
            aria-label={`Curseur entre ${left} et ${right}`}
          />
        )}
      </div>
    </div>
  );
}
