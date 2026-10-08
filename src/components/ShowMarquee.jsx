import { useLang } from '../context/LangContext';

export default function ShowMarquee() {
  const { t } = useLang();
  return (
    <div className="show-marquee" aria-hidden="true">
      <svg viewBox="0 0 280 190" focusable="false">
        <path d="M38 30H242V150H38Z" className="marquee-frame" />
        <path d="M47 39H233V141H47Z" className="marquee-inset" />
        {Array.from({ length: 9 }, (_, i) => (
          <g key={i} className="marquee-bulb">
            <circle cx={51 + i * 22} cy="30" r="3" />
            <circle cx={51 + i * 22} cy="150" r="3" />
          </g>
        ))}
        <text x="140" y="77" className="marquee-line">{t('home.marqueeLine')}</text>
        <text x="140" y="122" className="marquee-title">{t('home.marqueeTitle')}</text>
        <path d="M140 150V170M100 170H180" className="marquee-stand" />
        <path d="m23 50 3 9 10-3-6 8 6 8-10-3-3 9-3-9-10 3 6-8-6-8 10 3zM255 89l3 9 10-3-6 8 6 8-10-3-3 9-3-9-10 3 6-8-6-8 10 3z" className="marquee-star" />
      </svg>
    </div>
  );
}
