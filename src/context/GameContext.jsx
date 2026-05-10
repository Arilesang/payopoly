import { createContext, useContext, useState, useEffect } from 'react';
import { ref, set, get, onValue, update, push, remove } from 'firebase/database';
import { db } from '../firebase';

const GameContext = createContext();

const DEFAULT_CATEGORIES = [
  'Animaux', 'Sports', 'Films', 'Métiers', 'Pays',
  'Couleurs', 'Nourriture', 'Musique', 'Célébrités', 'Nature',
  'Vêtements', 'Transports', 'Instruments', 'Fleurs', 'Personnages historiques',
];

// P2: only show implemented minigames on the spin wheel
export const MINIGAMES = {
  duel: ['Petit Bac', 'Trivia'],
  all:  ['Mimes', 'Trivia', 'Pictionary'],
  solo: ['Petit Bac', 'Mot Melangés'],
};

// Letters used in Petit Bac (excluding X, Y, Z, W, K for French)
export const PETIT_BAC_LETTERS = 'ABCDEFGHIJLMNOPQRSTU'.split('');

const CATEGORIES_PER_PLAYER = 3;

function generateCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }
function generateId()   { return Math.random().toString(36).substring(2, 14); }
function shuffle(arr)   { return [...arr].sort(() => Math.random() - 0.5); }

// ── Collect every category across all players in this lobby ─────────────────
function getLobbyCategories(players) {
  return Object.values(players ?? {}).flatMap(p => p.categories ?? []);
}

export function GameProvider({ children }) {
  const [game,       setGame]       = useState(null);
  const [gameId,     setGameId]     = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [error,      setError]      = useState(null);

  // ── Subscribe to real-time game updates ──────────────────────────────────
  useEffect(() => {
    if (!gameId) return;
    const unsubscribe = onValue(ref(db, `games/${gameId}`), snap => {
      if (snap.exists()) setGame(snap.val());
    });
    return () => unsubscribe();
  }, [gameId]);

  // ── Host auto-distributes categories when all players finish prep ────────
  useEffect(() => {
    if (!game || game.status !== 'prep' || game.distributionDone) return;
    if (!myPlayerId || myPlayerId !== game.hostId) return;
    const players = Object.values(game.players ?? {});
    if (players.length > 0 && players.every(p => p.categoriesSubmitted)) {
      distributeCategories(game);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.players, game?.status]);

  // ── Auth helpers ─────────────────────────────────────────────────────────
  async function createGame(hostName) {
    setError(null);
    const id = generateCode(), playerId = generateId();
    await set(ref(db, `games/${id}`), {
      status: 'lobby', hostId: playerId, createdAt: Date.now(),
      players: { [playerId]: { name: hostName, ready: false, points: 0, categories: [], defaultCategories: [], categoriesSubmitted: false } },
    });
    localStorage.setItem(`payopoly_${id}`, playerId);
    setGameId(id); setMyPlayerId(playerId);
    return { gameId: id, playerId };
  }

  async function joinGame(id, playerName) {
    setError(null);
    const snap = await get(ref(db, `games/${id}`));
    if (!snap.exists()) { setError('gameNotFound'); throw new Error('Game not found'); }
    const playerId = generateId();
    await update(ref(db, `games/${id}/players/${playerId}`), {
      name: playerName, ready: false, points: 0, categories: [], defaultCategories: [], categoriesSubmitted: false,
    });
    localStorage.setItem(`payopoly_${id}`, playerId);
    setGameId(id); setMyPlayerId(playerId);
    return { gameId: id, playerId };
  }

  function loadGame(id) {
    const storedId = localStorage.getItem(`payopoly_${id}`);
    setGameId(id); setMyPlayerId(storedId);
  }

  // ── Lobby ────────────────────────────────────────────────────────────────
  async function setReady(ready) {
    await update(ref(db, `games/${gameId}/players/${myPlayerId}`), { ready });
  }

  async function removePlayer(playerId) {
    const hostName = game.players[game.hostId]?.name ?? 'Host';
    const updates = {
      [`kicked/${playerId}`]: hostName,
      [`players/${playerId}`]: null,
    };
    if (game.playerOrder) {
      updates.playerOrder = game.playerOrder.filter(id => id !== playerId);
    }
    await update(ref(db, `games/${gameId}`), updates);
  }

  async function toggleDevMode() {
    await update(ref(db, `games/${gameId}`), { devMode: !game.devMode });
  }

  async function adjustPoints(playerId, delta) {
    const current = game.players[playerId]?.points ?? 0;
    await update(ref(db, `games/${gameId}/players/${playerId}`), {
      points: Math.max(0, current + delta),
    });
  }

  async function startGame() {
    const playerIds = Object.keys(game.players);
    const shuffledDefaults = shuffle(DEFAULT_CATEGORIES);
    const updates = {};
    playerIds.forEach((id, i) => {
      const dealt = shuffledDefaults.slice(i * 2, i * 2 + 2);
      updates[`players/${id}/categories`]        = dealt;
      updates[`players/${id}/defaultCategories`] = dealt;
    });
    updates['status'] = 'prep';
    await update(ref(db, `games/${gameId}`), updates);
  }

  // ── Prep phase ───────────────────────────────────────────────────────────
  async function submitCategory(category) {
    const newRef = push(ref(db, `games/${gameId}/submittedCategories`));
    await set(newRef, { category, playerId: myPlayerId });
  }

  async function finishCategorySubmission() {
    await update(ref(db, `games/${gameId}/players/${myPlayerId}`), { categoriesSubmitted: true });
  }

  async function distributeCategories(gameData) {
    await update(ref(db, `games/${gameId}`), { distributionDone: true });
    const playerIds   = Object.keys(gameData.players);
    const submitted   = Object.values(gameData.submittedCategories ?? {}).map(c => c.category);
    const shuffled    = shuffle(submitted);
    const updates     = {};
    playerIds.forEach((id, i) => {
      const existing = gameData.players[id].categories ?? [];
      const personal = shuffled.slice(i * CATEGORIES_PER_PLAYER, (i + 1) * CATEGORIES_PER_PLAYER);
      updates[`players/${id}/categories`] = [...existing, ...personal];
    });
    const playerOrder = shuffle(playerIds);
    updates['playerOrder']       = playerOrder;
    updates['currentTurnIndex']  = 0;
    updates['currentTurn']       = { playerId: playerOrder[0], phase: 'choose_type', minigameType: null, minigame: null, opponentId: null };
    updates['status']            = 'play';
    await update(ref(db, `games/${gameId}`), updates);
  }

  // ── Play phase — turn flow ───────────────────────────────────────────────
  async function selectMinigameType(type) {
    await update(ref(db, `games/${gameId}/currentTurn`), { minigameType: type, phase: 'spinning' });
  }

  async function selectMinigame(minigame) {
    const type = game.currentTurn.minigameType;
    // Duel always needs opponent selection; solo/all go straight to playing
    const nextPhase = type === 'duel' ? 'choose_opponent' : 'playing';
    await update(ref(db, `games/${gameId}/currentTurn`), { minigame, phase: nextPhase });
  }

  async function selectOpponent(opponentId) {
    await update(ref(db, `games/${gameId}/currentTurn`), { opponentId, phase: 'playing' });
  }

  // ── Minigame state ───────────────────────────────────────────────────────
  // Called once when the minigame page loads (by TPlayer only)
  async function initMinigame() {
    const turn   = game.currentTurn;
    const exists = game.currentMinigame?.tPlayerId === turn.playerId && game.currentMinigame?.name === turn.minigame;
    if (exists) return; // already initialised (reconnect case)
    await set(ref(db, `games/${gameId}/currentMinigame`), {
      type:        turn.minigameType,
      name:        turn.minigame,
      tPlayerId:   turn.playerId,
      pPlayerId:   turn.opponentId ?? null,
      phase:       'dice',
      diceValue:   null,
      letter:      null,
      gameCategories: [],
      category:    null,
      difficulty:  null,
      readyPlayers: {},
      countdownStartedAt: null,
      triviaQuestions: null,
      jumbledWord:  null,
      originalWord: null,
      triviaAnswers: {},
      votes:       {},
      mimeWord:    null,
      pictionaryWord: null,
      strokes:     {},
      currentStroke: null,
      wordRevealed: false,
      pointsValue: null,
      winnerId:    null,
      bonusWinnerId: null,
    });
  }

  // Generic write helper used by each minigame component
  async function updateMinigame(updates) {
    await update(ref(db, `games/${gameId}/currentMinigame`), updates);
  }

  // Mark a player as ready inside a minigame
  async function setMinigameReady() {
    await update(ref(db, `games/${gameId}/currentMinigame/readyPlayers`), { [myPlayerId]: true });
  }

  // Submit a trivia answer: { questionIndex, answerIndex, timestamp }
  async function submitTriviaAnswer(questionIndex, answerIndex) {
    const timestamp = Date.now();
    const path = `games/${gameId}/currentMinigame/triviaAnswers/${myPlayerId}`;
    const snap = await get(ref(db, path));
    const existing = snap.val() ?? [];
    await set(ref(db, path), [...existing, { questionIndex, answerIndex, timestamp }]);
  }

  // Cast a vote — spectators only; choice is 'yes'/'no' or a playerId
  async function castVote(choice) {
    await update(ref(db, `games/${gameId}/currentMinigame/votes`), { [myPlayerId]: choice });
  }

  // Push a completed drawing stroke to Firebase (Pictionary)
  async function pushDrawingStroke(stroke) {
    await push(ref(db, `games/${gameId}/currentMinigame/strokes`), stroke);
  }

  // Update the in-progress stroke (throttled by caller); pass null to clear
  async function updateCurrentStroke(stroke) {
    await update(ref(db, `games/${gameId}/currentMinigame`), { currentStroke: stroke ?? null });
  }

  // Clear all strokes and the in-progress stroke
  async function clearDrawing() {
    await set(ref(db, `games/${gameId}/currentMinigame/strokes`), {});
    await update(ref(db, `games/${gameId}/currentMinigame`), { currentStroke: null });
  }

  // Award points and advance to the next turn
  async function completeMinigame(winnerId, bonusWinnerId = null) {
    const mg     = game.currentMinigame;
    const points = mg.pointsValue ?? 0;
    const updates = {};
    if (winnerId) {
      const current = game.players[winnerId]?.points ?? 0;
      updates[`players/${winnerId}/points`] = current + points;
    }
    if (bonusWinnerId) {
      const current = game.players[bonusWinnerId]?.points ?? 0;
      updates[`players/${bonusWinnerId}/points`] = current + points;
    }
    // Advance turn
    const nextIndex = ((game.currentTurnIndex ?? 0) + 1) % game.playerOrder.length;
    updates['currentTurnIndex'] = nextIndex;
    updates['currentTurn']      = { playerId: game.playerOrder[nextIndex], phase: 'choose_type', minigameType: null, minigame: null, opponentId: null };
    updates['currentMinigame']  = null;
    await update(ref(db, `games/${gameId}`), updates);
  }

  // ── Derived helpers ──────────────────────────────────────────────────────
  const myPlayer    = game?.players?.[myPlayerId] ?? null;
  const isHost      = game?.hostId === myPlayerId;
  const isMyTurn    = game?.currentTurn?.playerId === myPlayerId;
  const mg          = game?.currentMinigame ?? null;
  const isTPlayer   = mg?.tPlayerId === myPlayerId;
  const isPPlayer   = mg?.pPlayerId === myPlayerId;
  const isSpectator = mg ? (!isTPlayer && !isPPlayer) : false;
  const kickedBy    = game?.kicked?.[myPlayerId] ?? null;

  function getLobbyPool() { return getLobbyCategories(game?.players); }

  return (
    <GameContext.Provider value={{
      game, gameId, myPlayerId, myPlayer, isHost, isMyTurn,
      isTPlayer, isPPlayer, isSpectator,
      kickedBy,
      error,
      MINIGAMES, PETIT_BAC_LETTERS,
      getLobbyPool,
      createGame, joinGame, loadGame,
      setReady, removePlayer, startGame,
      toggleDevMode, adjustPoints,
      submitCategory, finishCategorySubmission,
      selectMinigameType, selectMinigame, selectOpponent,
      initMinigame, updateMinigame, setMinigameReady,
      submitTriviaAnswer, castVote, completeMinigame,
      pushDrawingStroke, updateCurrentStroke, clearDrawing,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
