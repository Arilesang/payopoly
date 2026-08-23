// The "Mini-jeux" rulebook — an accordion of every game on the wheel.
//
// Opened from Home (before a game exists) and from the game board, so it reads
// nothing from GameContext: rules data plus the language toggle, that's all.

import { useState, useRef, useEffect } from 'react';
import { useLang } from '../context/LangContext';
import { MINIGAME_RULES } from '../data/minigameRules';
import { MINIGAME_META } from '../gameConfig';

const ALL = '*';                              // "no filter", distinct from the 'all' type
const FILTERS = [ALL, 'solo', 'duel', 'all'];

export default function MinigameRulesPopup({ onClose }) {
  const { t, lang } = useLang();

  const [filter, setFilter] = useState(ALL);
  const [openId, setOpenId] = useState(null);
  const [rolling, setRolling] = useState(false);

  const cardRefs = useRef({});

  // Esc closes the sheet — it opens over a page the player was mid-turn on.
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const shown = MINIGAME_RULES.filter(g => filter === ALL || g.type === filter);

  function countFor(f) {
    return f === ALL ? MINIGAME_RULES.length : MINIGAME_RULES.filter(g => g.type === f).length;
  }

  function toggle(id) {
    setOpenId(prev => (prev === id ? null : id));
  }

  // "Au hasard" — drop the filter, open a random game, scroll it into view.
  function surprise() {
    const pick = MINIGAME_RULES[Math.floor(Math.random() * MINIGAME_RULES.length)];
    setRolling(true);
    setTimeout(() => setRolling(false), 600);
    setFilter(ALL);
    setOpenId(pick.id);
    // The card only exists after the filter reset has painted.
    requestAnimationFrame(() => {
      cardRefs.current[pick.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  return (
    <div className="overlay rules-overlay" onClick={onClose}>
      <div className="rules-sheet" onClick={e => e.stopPropagation()}>
        <div className="rules-grabber" />

        <header className="rules-head">
          <div className="rules-head-text">
            <h2 className="rules-title">🎲 {t('rules.title')}</h2>
            <p className="rules-sub">
              {t('rules.subtitle').replaceAll('{{count}}', MINIGAME_RULES.length)}
            </p>
          </div>
          <button className="btn-close" onClick={onClose} aria-label={t('rules.close')}>✕</button>
        </header>

        <div className="rules-tools">
          <div className="rules-filters">
            {FILTERS.map(f => (
              <button
                key={f}
                className={`rules-tab rules-tab-${f === ALL ? 'any' : f} ${filter === f ? 'is-on' : ''}`}
                onClick={() => { setFilter(f); setOpenId(null); }}
              >
                {f === ALL ? t('rules.filterAll') : t(`game.${f}`)}
                <span className="rules-tab-count">{countFor(f)}</span>
              </button>
            ))}
          </div>
          <button
            className={`rules-dice ${rolling ? 'is-rolling' : ''}`}
            onClick={surprise}
            title={t('rules.random')}
          >
            🎲
          </button>
        </div>

        <div className="rules-list">
          {shown.map((g, i) => (
            <RuleCard
              key={g.id}
              game={g}
              lang={lang}
              t={t}
              index={i}
              open={openId === g.id}
              onToggle={() => toggle(g.id)}
              cardRef={el => { cardRefs.current[g.id] = el; }}
            />
          ))}
          <p className="rules-hint">{t('rules.tapHint')}</p>
        </div>

        <button className="btn btn-primary rules-done" onClick={onClose}>
          {t('rules.close')}
        </button>
      </div>
    </div>
  );
}

// ── One collapsible game card ─────────────────────────────────────────────
function RuleCard({ game, lang, t, index, open, onToggle, cardRef }) {
  const minPlayers = MINIGAME_META[game.id]?.minPlayers ?? 2;

  return (
    <article
      ref={cardRef}
      className={`rule-card rule-${game.type} ${open ? 'is-open' : ''}`}
      style={{ '--i': index }}
    >
      <button className="rule-head" onClick={onToggle} aria-expanded={open}>
        <span className="rule-emoji">{game.emoji}</span>
        <span className="rule-head-text">
          <span className="rule-name">{game.name}</span>
          <span className="rule-tagline">{game.tagline[lang]}</span>
        </span>
        <span className="rule-chevron">›</span>
      </button>

      <div className="rule-meta">
        <span className={`rule-badge rule-badge-${game.type}`}>{t(`game.${game.type}`)}</span>
        <span className="rule-chip">👥 {t('rules.players').replace('{{n}}', minPlayers)}</span>
        <span className="rule-chip">⏱️ {game.timer}</span>
      </div>

      <div className="rule-body">
        <div className="rule-body-inner">
          <p className="rule-section-label">{t('rules.howItWorks')}</p>
          <ol className="rule-steps">
            {game.steps.map((step, i) => (
              <li key={i} className="rule-step" style={{ '--s': i }}>
                <span className="rule-step-num">{i + 1}</span>
                <span className="rule-step-text">{step[lang]}</span>
              </li>
            ))}
          </ol>

          <div className="rule-note rule-note-score">
            <span className="rule-note-icon">🏆</span>
            <span>
              <strong>{t('rules.scoring')}</strong>
              {game.scoring[lang]}
            </span>
          </div>

          <div className="rule-note rule-note-tip">
            <span className="rule-note-icon">💡</span>
            <span>
              <strong>{t('rules.tip')}</strong>
              {game.tip[lang]}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
