import { useLang } from '../context/LangContext';

export default function GameRulesButton({ onClick, expanded = false }) {
  const { t } = useLang();
  return (
    <button type="button" className="game-rules-button" onClick={onClick}
      aria-label={t('rules.title')} title={t('rules.title')}
      aria-haspopup="dialog" aria-expanded={expanded}>
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 8h12a4 4 0 0 1 3.96 3.45l.64 4.5a2.5 2.5 0 0 1-4.24 2.1L15 15H9l-3.36 3.05a2.5 2.5 0 0 1-4.24-2.1l.64-4.5A4 4 0 0 1 6 8Z" />
        <path d="M5 12h4m-2-2v4" />
        <circle cx="16" cy="11" r=".8" fill="currentColor" stroke="none" />
        <circle cx="19" cy="13" r=".8" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}
