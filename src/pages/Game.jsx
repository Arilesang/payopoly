import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useGame } from '../context/GameContext';
import SpinWheel from '../components/SpinWheel';
import WheelGameList from '../components/WheelGameList';
import CategoryPopup from '../components/CategoryPopup';
import MinigameRulesPopup from '../components/MinigameRulesPopup';
import Results from './Results';
import SessionControls from '../components/SessionControls';
import { wheelGames, headToHead, isLeaderBounty, lastDuelOpponent } from '../lib/session';
import { rankingRows } from '../lib/rankings';
import { BOUNTY_SHARE } from '../gameConfig';
import ScoreSheet from '../components/ScoreSheet';
import { identityStorage } from '../lib/identityStorage';

const CATEGORIES_TO_ENTER = 3;

export default function Game() {
  const { gameId: urlGameId } = useParams();
  const { t, lang, toggleLang, say } = useLang();
  const {
    game, myPlayerId, myPlayer, isHost, isMyTurn, kickedBy, loadGame,
    submitCategory, finishCategorySubmission,
    selectMinigameType, selectMinigame, selectOpponent,
    toggleDevMode,
  } = useGame();
  const navigate = useNavigate();

  const [showCategories, setShowCategories] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  const submittedCount = myPlayer?.customCategories?.length ?? 0;
  const [saving, setSaving] = useState(false);
  const [categoryError, setCategoryError] = useState('');

  useEffect(() => { loadGame(urlGameId); }, [urlGameId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect kicked player home after 3 seconds
  useEffect(() => {
    if (!kickedBy) return;
    const timer = setTimeout(() => {
      identityStorage.removeItem(`payopoly_${urlGameId}`);
      navigate('/');
    }, 3000);
    return () => clearTimeout(timer);
  }, [kickedBy, navigate, urlGameId]);

  useEffect(() => { if (game?.status === 'lobby') navigate(`/lobby/${urlGameId}`); }, [game?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate to minigame when phase is 'playing'
  useEffect(() => {
    if (game?.currentTurn?.phase === 'playing') {
      navigate(`/game/${urlGameId}/minigame`);
    }
  }, [game?.currentTurn?.phase, navigate, urlGameId]);

  async function handleSaveCategory() {
    if (!categoryInput.trim()) return;
    setSaving(true);
    try {
      const saved = await submitCategory(categoryInput.trim());
      if (saved) { setCategoryInput(''); setCategoryError(''); }
      else setCategoryError(say('Cette catégorie a déjà été ajoutée.', 'That category has already been added.'));
    } catch { setCategoryError(say('Enregistrement impossible. Réessaie.', 'Could not save. Please try again.')); }
    finally { setSaving(false); }
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

  if (game.status === 'finished') return <Results />;
  if (game.status === 'lobby') return null;

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
          {lang === 'fr' ? 'EN' : 'FR'}
        </button>

        <h1>{t('prep.title')}</h1>
        <p className="muted">{say('Ajoute jusqu’à 3 thèmes, ou utilise les catégories proposées.', 'Add up to 3 themes, or use the suggested categories.')}</p>

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

        {submittedCount > 0 && <div className="tag-list">{myPlayer.customCategories.map(category => <span className="tag" key={category}>{category}</span>)}</div>}
        <div className="card">
          <p className="label">
            {t('prep.categoryProgress')
              .replace('{{current}}', current)
              .replace('{{total}}', CATEGORIES_TO_ENTER)}
          </p>
          <p className="prep-prompt">{t('prep.enterPrompt')}</p>
          <input
            className="input"
            maxLength={60}
            placeholder={t('prep.categoryPlaceholder')}
            value={categoryInput}
            onChange={e => setCategoryInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSaveCategory()}
            autoFocus
          />
          {categoryError && <p className="error-msg" role="alert">{categoryError}</p>}
          <button
            className="btn btn-primary"
            onClick={handleSaveCategory}
            disabled={!categoryInput.trim() || saving}
          >
            {submittedCount < CATEGORIES_TO_ENTER - 1 ? t('prep.save') : t('prep.finish')}
          </button>
        </div>
        <button className="btn btn-ghost" onClick={finishCategorySubmission}>{say('Utiliser les catégories proposées', 'Use suggested categories')}</button>
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
            {/* Icon only: a labelled button pushes the header onto a second row. */}
            <button
              className="btn btn-small btn-ghost"
              onClick={() => setShowRules(true)}
              title={t('rules.button')}
              aria-label={t('rules.button')}
            >
              🎮
            </button>
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

        <SessionControls />
        <ScoreSheet />

        <div className="turn-area">
          {isMyTurn ? (
            <TurnPanel key={`${turn.id}:${turn.phase}`}
              turn={turn}
              myPlayer={myPlayer}
              players={players}
              myPlayerId={myPlayerId}
              t={t}
              onSelectType={selectMinigameType}
              onSpinResult={selectMinigame}
              onSelectOpponent={selectOpponent}
              isActor
            />
          ) : (
            turn?.phase === 'spinning' ? <TurnPanel key={`${turn.id}:${turn.phase}`} turn={turn} players={players} myPlayerId={myPlayerId} t={t} onSpinResult={selectMinigame} isActor={false} /> :
            <div className="waiting-turn card">
              <p className="muted">{t('game.waitingForTurn')} <strong>{currentPlayer?.name}</strong></p>
              {turn?.minigame && <p>{turn.minigame}</p>}
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

        {showRules && <MinigameRulesPopup onClose={() => setShowRules(false)} />}
      </div>
    );
  }

  return <div className="page page-center"><div className="spinner" /></div>;
}

// ── Sub-component: current player's turn panel ──────────────────
function TurnPanel({ turn, players, myPlayerId, t, onSelectType, onSpinResult, onSelectOpponent, isActor }) {
  const { game, startWheelSpin } = useGame();
  const { say } = useLang();
  const [devPick, setDevPick] = useState(null);
  const devMode = game?.devMode ?? false;

  // Reset pick when phase changes (e.g. new turn)
  // TurnPanel is keyed by turn and phase so local choices reset on each step.

  if (turn?.phase === 'choose_type') {
    return (
      <div className="card turn-card">
        <p className="turn-label">{t('game.yourTurn')}</p>
        <p className="turn-prompt">{t('game.chooseType')}</p>
        <div className="type-btns">
          <button disabled={game.settings?.preset === 'quick'} className="btn btn-type btn-solo" onClick={() => onSelectType('solo')}>{t('game.solo')}</button>
          <button className="btn btn-type btn-duel" onClick={() => onSelectType('duel')}>{t('game.duel')}</button>
          <button className="btn btn-type btn-all" onClick={() => onSelectType('all')}>{t('game.all')}</button>
        </div>
      </div>
    );
  }

  if (turn?.phase === 'spinning') {
    // Weighted for lobby size, so melee slices appear more than once at a big
    // table — the dev picker wants each name listed once regardless.
    const games    = wheelGames(game, turn.minigameType);
    const devGames = [...new Set(games)];
    return (
      <div className="card turn-card">
        <p className="turn-label">{isActor ? t('game.yourTurn') : players[turn.playerId]?.name}</p>
        {isActor && <p className="turn-prompt">{t('game.spinPrompt')}</p>}
        {devMode && isActor && (
          <div style={{ marginBottom: '0.75rem' }}>
            <p className="label" style={{ marginBottom: '0.4rem' }}>⚙️ {t('game.devPickMinigame')}</p>
            <div className="type-btns">
              {devGames.map(g => (
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
          autoSpin={game.settings?.preset === 'quick' && !devMode && isActor}
          sharedSpin={turn.wheelSpin}
          onStart={(value, duration) => startWheelSpin(games, value, duration)}
          isActor={isActor}
        />
        <WheelGameList game={game} type={turn.minigameType} />
      </div>
    );
  }

  if (turn?.phase === 'choose_opponent') {
    const opponents = Object.entries(players).filter(([id]) => id !== myPlayerId);
    const rows = Object.fromEntries(rankingRows(game).map(row => [row.id, row]));
    const blocked = opponents.length > 1 ? lastDuelOpponent(game.history, myPlayerId) : null;
    return (
      <div className="card turn-card">
        <p className="turn-label">🎮 {turn.minigame}</p>
        <p className="turn-prompt">{t('game.chooseOpponent')}</p>
        <div className="category-select-list">
          {opponents.map(([id, p]) => {
            const record = headToHead(game.history, myPlayerId, id);
            const played = record[myPlayerId] + record[id];
            return (
              <button key={id} className="btn btn-category opponent-option" disabled={id === blocked} onClick={() => onSelectOpponent(id)}>
                <span className="opponent-name">{p.name}</span>
                <span className="opponent-meta">
                  #{rows[id]?.rank} · {rows[id]?.points ?? 0} pts
                  {played > 0 && ` · ${say(`toi ${record[myPlayerId]} – ${record[id]}`, `you ${record[myPlayerId]} – ${record[id]}`)}`}
                </span>
                {id === blocked
                  ? <span className="opponent-tag">{say('Dernier adversaire', 'Last opponent')}</span>
                  : isLeaderBounty(game, myPlayerId, id) && <span className="opponent-tag duel-bounty">🎯 {say('Prime au leader', 'Leader bounty')} +{BOUNTY_SHARE * 100}%</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
