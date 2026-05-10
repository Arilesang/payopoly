import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useGame } from '../context/GameContext';
import SpinWheel from '../components/SpinWheel';
import CategoryPopup from '../components/CategoryPopup';
import Leaderboard from '../components/Leaderboard';

const CATEGORIES_TO_ENTER = 3;

export default function Game() {
  const { gameId: urlGameId } = useParams();
  const { t, lang, toggleLang } = useLang();
  const {
    game, myPlayerId, myPlayer, isHost, isMyTurn, kickedBy, loadGame,
    submitCategory, finishCategorySubmission,
    selectMinigameType, selectMinigame, selectOpponent,
    toggleDevMode,
  } = useGame();
  const navigate = useNavigate();

  const [showCategories, setShowCategories] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  const [submittedCount, setSubmittedCount] = useState(0);

  useEffect(() => { loadGame(urlGameId); }, [urlGameId]);

  // Redirect kicked player home after 3 seconds
  useEffect(() => {
    if (!kickedBy) return;
    const timer = setTimeout(() => {
      localStorage.removeItem(`payopoly_${urlGameId}`);
      navigate('/');
    }, 3000);
    return () => clearTimeout(timer);
  }, [kickedBy]);

  // Navigate to minigame when phase is 'playing'
  useEffect(() => {
    if (game?.currentTurn?.phase === 'playing') {
      navigate(`/game/${urlGameId}/minigame`);
    }
  }, [game?.currentTurn?.phase]);

  async function handleSaveCategory() {
    if (!categoryInput.trim()) return;
    await submitCategory(categoryInput.trim());
    setCategoryInput('');
    const next = submittedCount + 1;
    setSubmittedCount(next);
    if (next >= CATEGORIES_TO_ENTER) {
      await finishCategorySubmission();
    }
  }

  if (kickedBy) {
    return (
      <div className="page page-center">
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>{t('game.kicked')}</h2>
          <p>{t('game.kickedBy')}: <strong>{kickedBy}</strong></p>
          <p className="muted">{t('game.kickedRedirect')}</p>
        </div>
      </div>
    );
  }

  if (!game) return <div className="page page-center"><div className="spinner" /></div>;

  // ── PREP PHASE ──────────────────────────────────────────────────
  if (game.status === 'prep') {
    const done = myPlayer?.categoriesSubmitted;

    if (done) {
      return (
        <div className="page page-center">
          <h2>{t('prep.waiting')}</h2>
          <p className="muted">{t('prep.waitingSubtitle')}</p>
          <div className="spinner" />
        </div>
      );
    }

    const current = submittedCount + 1;

    return (
      <div className="page page-prep">
        <button className="lang-toggle" onClick={toggleLang}>
          {lang === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR'}
        </button>

        <h1>{t('prep.title')}</h1>

        {submittedCount === 0 && myPlayer?.defaultCategories?.length > 0 && (
          <div className="card">
            <p className="label">{t('prep.dealtCategories')}</p>
            <div className="tag-list">
              {myPlayer.defaultCategories.map((cat, i) => (
                <span key={i} className="tag tag-default">{cat}</span>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <p className="label">
            {t('prep.categoryProgress')
              .replace('{{current}}', current)
              .replace('{{total}}', CATEGORIES_TO_ENTER)}
          </p>
          <p className="prep-prompt">{t('prep.enterPrompt')}</p>
          <input
            className="input"
            placeholder={t('prep.categoryPlaceholder')}
            value={categoryInput}
            onChange={e => setCategoryInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSaveCategory()}
            autoFocus
          />
          <button
            className="btn btn-primary"
            onClick={handleSaveCategory}
            disabled={!categoryInput.trim()}
          >
            {submittedCount < CATEGORIES_TO_ENTER - 1 ? t('prep.save') : t('prep.finish')}
          </button>
        </div>
      </div>
    );
  }

  // ── PLAY PHASE ───────────────────────────────────────────────────
  if (game.status === 'play') {
    const turn = game.currentTurn;
    const players = game.players ?? {};
    const currentPlayer = players[turn?.playerId];
    const devMode = game.devMode ?? false;

    return (
      <div className="page page-game">
        <div className="game-header">
          <h1 className="game-title">{t('game.title')}</h1>
          <div className="header-actions">
            <button className="btn btn-small btn-ghost" onClick={() => setShowCategories(true)}>
              {t('game.myCategories')}
            </button>
            {isHost && (
              <button
                className={`btn btn-small ${devMode ? 'btn-accent' : 'btn-ghost'}`}
                onClick={toggleDevMode}
                title={t('game.devMode')}
              >
                {devMode ? t('game.devModeOn') : t('game.devModeOff')}
              </button>
            )}
            <button className="btn btn-small btn-ghost" onClick={toggleLang}>
              {lang === 'fr' ? 'EN' : 'FR'}
            </button>
          </div>
        </div>

        <Leaderboard players={players} t={t} />

        <div className="turn-area">
          {isMyTurn ? (
            <TurnPanel
              turn={turn}
              myPlayer={myPlayer}
              players={players}
              myPlayerId={myPlayerId}
              t={t}
              onSelectType={selectMinigameType}
              onSpinResult={selectMinigame}
              onSelectOpponent={selectOpponent}
            />
          ) : (
            <div className="waiting-turn card">
              <p className="muted">{t('game.waitingForTurn')} <strong>{currentPlayer?.name}</strong></p>
            </div>
          )}
        </div>

        {showCategories && (
          <CategoryPopup
            categories={myPlayer?.categories ?? []}
            defaultCategories={myPlayer?.defaultCategories ?? []}
            t={t}
            onClose={() => setShowCategories(false)}
          />
        )}
      </div>
    );
  }

  return <div className="page page-center"><div className="spinner" /></div>;
}

// ── Sub-component: current player's turn panel ──────────────────
function TurnPanel({ turn, myPlayer, players, myPlayerId, t, onSelectType, onSpinResult, onSelectOpponent }) {
  const { MINIGAMES, game } = useGame();
  const [devPick, setDevPick] = useState(null);
  const devMode = game?.devMode ?? false;

  // Reset pick when phase changes (e.g. new turn)
  useEffect(() => { setDevPick(null); }, [turn?.phase]);

  if (turn?.phase === 'choose_type') {
    return (
      <div className="card turn-card">
        <p className="turn-label">{t('game.yourTurn')}</p>
        <p className="turn-prompt">{t('game.chooseType')}</p>
        <div className="type-btns">
          <button className="btn btn-type btn-solo" onClick={() => onSelectType('solo')}>{t('game.solo')}</button>
          <button className="btn btn-type btn-duel" onClick={() => onSelectType('duel')}>{t('game.duel')}</button>
          <button className="btn btn-type btn-all" onClick={() => onSelectType('all')}>{t('game.all')}</button>
        </div>
      </div>
    );
  }

  if (turn?.phase === 'spinning') {
    const games = MINIGAMES[turn.minigameType] ?? [];
    return (
      <div className="card turn-card">
        <p className="turn-label">{t('game.yourTurn')}</p>
        <p className="turn-prompt">{t('game.spinPrompt')}</p>
        {devMode && (
          <div style={{ marginBottom: '0.75rem' }}>
            <p className="label" style={{ marginBottom: '0.4rem' }}>⚙️ {t('game.devPickMinigame')}</p>
            <div className="type-btns">
              {games.map(g => (
                <button
                  key={g}
                  className={`btn btn-small ${devPick === g ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setDevPick(prev => prev === g ? null : g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}
        <SpinWheel
          items={games}
          onResult={onSpinResult}
          t={t}
          forcedResult={devMode ? devPick : null}
          disabled={devMode && !devPick}
        />
      </div>
    );
  }

  if (turn?.phase === 'choose_opponent') {
    const opponents = Object.entries(players).filter(([id]) => id !== myPlayerId);
    return (
      <div className="card turn-card">
        <p className="turn-label">🎮 {turn.minigame}</p>
        <p className="turn-prompt">{t('game.chooseOpponent')}</p>
        <div className="category-select-list">
          {opponents.map(([id, p]) => (
            <button key={id} className="btn btn-category" onClick={() => onSelectOpponent(id)}>
              {p.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
