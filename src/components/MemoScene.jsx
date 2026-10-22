// Vector artwork keeps every answer tied to a precise, repeatable visual detail.
export default function MemoScene({ scene, label }) {
  const colors = ['#ff72ad', '#ffd65c', '#68b8ff'];
  return <svg className="memo-scene" viewBox="0 0 600 420" role="img" aria-label={label}>
    <rect width="600" height="420" rx="24" fill="#b6e8ef" />
    <path d="M0 260 Q140 180 300 270 Q450 210 600 260 V420 H0Z" fill="#78bf94" />
    <path d="M0 335 Q180 275 400 330 Q520 290 600 320 V420 H0Z" fill="#a8d28d" />
    <g fill="#fff" opacity=".85"><ellipse cx="90" cy="70" rx="47" ry="16"/><ellipse cx="120" cy="60" rx="32" ry="25"/><ellipse cx="290" cy="100" rx="42" ry="15"/></g>
    {scene.moon ? <path d="M490 30 A35 35 0 1 0 525 85 A32 32 0 0 1 490 30" fill="#fff7c9" stroke="#d8b663" strokeWidth="3" />
      : <g transform="translate(500 60)"><circle r="28" fill="#bc91dc"/><ellipse rx="48" ry="11" transform="rotate(-25)" fill="none" stroke="#f6cf7b" strokeWidth="8"/></g>}
    <g stroke="#36534b" strokeWidth="2">{Array.from({ length: scene.balloons }, (_, i) => <g key={i}>
      <path d={`M${330 + i * 37} ${65 + (i % 2) * 24} Q${310 + i * 37} 140 365 230`} fill="none" />
      <ellipse cx={330 + i * 37} cy={52 + (i % 2) * 24} rx="16" ry="22" fill={['#ff8a70', '#bc91dc', '#ffd65c', '#ff72ad'][i]} />
    </g>)}</g>
    <ellipse cx="142" cy="346" rx="65" ry="12" fill="#487f6e" opacity=".3" />
    <g transform="translate(140 258)">
      <path d="M-22 66 L-39 89 L-5 89 L3 69 M20 66 L11 89 L44 89 L35 65" fill="#f29c46" stroke="#304652" strokeWidth="3" />
      <ellipse rx="52" ry="79" fill="#294350"/><ellipse cy="13" rx="35" ry="57" fill="#fff7e6" />
      <ellipse cx="-15" cy="-37" rx="14" ry="19" fill="#fff7e6"/><ellipse cx="15" cy="-37" rx="14" ry="19" fill="#fff7e6"/>
      <circle cx="-13" cy="-39" r="4"/><circle cx="13" cy="-39" r="4"/>
      <path d="M-11 -25 L0 -11 L13 -25Z" fill="#f29c46" />
      <path d="M-46 -49 L46 -49 L30 -58 L23 -98 L-23 -98 L-30 -58Z" fill={colors[scene.hat]} stroke="#304652" strokeWidth="3" />
      <path d="M-25 -65 H26" stroke="#fff7e6" strokeWidth="8" />
      <path d="M-41 -5 Q-91 30 -55 47 M42 -5 Q74 9 63 33" fill="none" stroke="#294350" strokeWidth="16" strokeLinecap="round" />
      <path d="M-25 2 L0 14 L24 1 L25 26 L0 14 L-24 28Z" fill="#e57970"/>
    </g>
    <g transform="translate(441 248)" stroke="#304652" strokeWidth="4" strokeLinejoin="round">
      <path d="M-22 59 V90 H-39 M22 59 V90 H39" fill="none" strokeWidth="12" />
      <rect x="-37" y="-9" width="74" height="76" rx="12" fill="#a2b2c2" />
      <rect x="-44" y="-69" width="88" height="61" rx="14" fill="#d9e4e6" />
      <path d="M0 -69 V-86"/><circle cy="-91" r="7" fill="#f29c46" />
      <circle cx="-20" cy="-43" r="8" fill="#73c8cf"/><circle cx="20" cy="-43" r="8" fill="#73c8cf"/>
      <path d="M-18 -22 H18 M-37 13 L-65 -8 M37 14 L62 -3" fill="none" strokeLinecap="round" strokeWidth="9" />
      <rect x="-18" y="12" width="36" height="29" rx="5" fill="#73c8cf"/><circle cy="53" r="4" fill="#e57970" />
      <path d="M61 -7 V-125" fill="none" strokeWidth="5"/>
      <path d="M-1 -123 Q61 -208 123 -123 Q107 -133 92 -120 Q76 -134 61 -120 Q46 -134 30 -120 Q14 -133 -1 -123Z" fill={colors[scene.umbrella]}/>
    </g>
    <g transform="translate(278 290)" stroke="#785b48" strokeWidth="5">
      <path d="M-44 10 L-53 62 M44 10 L53 62 M-63 0 H63"/>
      <rect x="-62" y="-3" width="124" height="12" rx="4" fill="#dca978"/>
      {scene.cake ? <g strokeWidth="2"><rect x="-29" y="-33" width="58" height="28" rx="6" fill="#ed9ba6"/><path d="M-29 -28 Q-15 -17 0 -28 Q15 -17 29 -28" fill="none" stroke="#fff7e6" strokeWidth="7"/><path d="M0 -34 V-48"/><path d="M0 -49 Q-10 -57 0 -64 Q10 -57 0 -49" fill="#ffd65c" stroke="none"/></g>
        : <g strokeWidth="2"><ellipse cx="-3" cy="-20" rx="30" ry="13" fill="#6aafc8"/><path d="M24 -20 L44 -34 V-6Z" fill="#6aafc8"/><circle cx="-20" cy="-23" r="3" fill="#304652"/><path d="M-34 -5 H45" stroke="#fff7e6" strokeWidth="5"/></g>}
    </g>
    {Array.from({ length: scene.ducks }, (_, i) => <g key={i} transform={`translate(${260 + i * 55} ${385 - (i % 2) * 12})`} stroke="#ac793d" strokeWidth="2">
      <ellipse rx="20" ry="12" fill="#ffe083"/><circle cx="13" cy="-14" r="12" fill="#ffe083"/><path d="M22 -17 L34 -12 L22 -8" fill="#ef9648"/><circle cx="15" cy="-17" r="2" fill="#304652"/><path d="M-10 -3 Q0 10 10 -2" fill="none"/>
    </g>)}
    <g fill="#f5f0d0">{[35, 72, 532, 565].map((x, i) => <g key={x} transform={`translate(${x} ${350 + (i % 2) * 40})`}><circle cx="-4" r="4"/><circle cx="4" r="4"/><circle cy="-4" r="4"/><circle cy="4" r="4"/><circle r="3" fill="#e6b75f"/></g>)}</g>
  </svg>;
}
