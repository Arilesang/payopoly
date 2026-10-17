import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ref, set, onValue, update, runTransaction, onDisconnect, serverTimestamp } from 'firebase/database';
import { db } from '../firebase';
import { shuffle } from '../utils';
import { MINIGAMES, MINIGAME_META, PETIT_BAC_LETTERS, availableMinigames } from '../gameConfig';
import { DEFAULT_SETTINGS, CATEGORIES, controllerId, onlineIds, finishTurn, scoreUnit, cleanAwards, triviaResult, tiedLeaders, roundAwards } from '../lib/session';
import { requestContent } from '../lib/content';
import { now, setClockOffset } from '../lib/clock';
import { identityStorage } from '../lib/identityStorage';
import { writePetitBacWord, validPetitBacVote, petitBacResult } from '../lib/petitBac';

const GameContext = createContext();

const CATEGORIES_PER_PLAYER = 3;

function generateCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }
function generateId()   { return Math.random().toString(36).substring(2, 14); }

// ── Collect every category across all players in this lobby ─────────────────
function getLobbyCategories(players) {
  return Object.values(players ?? {}).flatMap(p => p.categories ?? []);
}

export function GameProvider({ children }) {
  const [game,       setGame]       = useState(null);
  const [gameId,     setGameId]     = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [tick, setTick] = useState(now());
  const roomRef = useRef(null);
  const missingHostSince = useRef(null);
  const requestRef = useRef(new Map());
  useEffect(() => { missingHostSince.current = null; }, [gameId, game?.hostId]);
  useEffect(() => { requestRef.current.clear(); }, [game?.currentTurn?.id]);
  useEffect(() => { roomRef.current = game; }, [game]);

  useEffect(() => {
    const clock = onValue(ref(db, '.info/serverTimeOffset'), snap => setClockOffset(snap.val()));
    const timer = setInterval(() => setTick(now()), 1000);
    return () => { clock(); clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!gameId || !myPlayerId) return;
    const connectionId = generateId();
    const path = ref(db, `games/${gameId}/presence/${myPlayerId}/${connectionId}`);
    let alive = true;
    const unsubscribe = onValue(ref(db, '.info/connected'), async snap => {
      setConnected(snap.val() === true);
      if (snap.val() !== true) return;
      try {
        await onDisconnect(path).set({ online: false, lastSeen: serverTimestamp() });
        if (alive) await set(path, { online: true, lastSeen: serverTimestamp() });
      } catch { setError('connectionError'); }
    });
    const heartbeat = setInterval(() => {
      if (alive) update(path, { lastSeen: serverTimestamp() }).catch(() => setError('connectionError'));
    }, 15000);
    return () => { alive = false; unsubscribe(); clearInterval(heartbeat); set(path, null).catch(() => {}); };
  }, [gameId, myPlayerId]);

  // ── Subscribe to real-time game updates ──────────────────────────────────
  useEffect(() => {
    if (!gameId) return;
    const unsubscribe = onValue(ref(db, `games/${gameId}`), snap => {
      if (snap.exists()) { setGame(snap.val()); setError(null); }
      else { setGame(null); setError('gameNotFound'); }
    }, () => setError('connectionError'));
    return () => unsubscribe();
  }, [gameId]);

  // ── Host auto-distributes categories when all players finish prep ────────
  useEffect(() => {
    if (!game || game.status !== 'prep' || game.distributionDone) return;
    if (!myPlayerId || myPlayerId !== game.hostId) return;
    const players = Object.values(game.players ?? {});
    if (players.length > 0 && players.every(p => p.categoriesSubmitted)) {
      distributeCategories(game).catch(() => setError('connectionError'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.players, game?.status]);

  // ── Auth helpers ─────────────────────────────────────────────────────────
  async function createGame(hostName) {
    setError(null);
    const id = generateCode(), playerId = generateId();
    await set(ref(db, `games/${id}`), {
      status: 'lobby', hostId: playerId, createdAt: now(), settings: { ...DEFAULT_SETTINGS, language: localStorage.getItem('payopoly_language') ?? 'fr' },
      players: { [playerId]: { name: hostName, ready: false, points: 0, categories: [], defaultCategories: [], categoriesSubmitted: false } },
    });
    identityStorage.setItem(`payopoly_${id}`, playerId);
    identityStorage.setItem('payopoly_resume', JSON.stringify({ gameId: id, playerId }));
    setGameId(id); setMyPlayerId(playerId);
    return { gameId: id, playerId };
  }

  async function joinGame(id, playerName) {
    setError(null);
    const stored = identityStorage.getItem(`payopoly_${id}`);
    const newId = generateId();
    let playerId = newId;
    const result = await runTransaction(ref(db, `games/${id}`), room => {
      if (!room) return room;
      if (stored && room.players?.[stored]) { playerId = stored; return room; }
      playerId = newId;
      if (room.status !== 'lobby') return undefined;
      room.players ??= {};
      room.players[playerId] = { name: playerName, ready: false, points: 0, categoriesSubmitted: false };
      return room;
    }, { applyLocally: false });
    const room = result.snapshot.val();
    if (!room) { setError('gameNotFound'); throw new Error('gameNotFound'); }
    if (!result.committed || !room.players?.[playerId]) { setError('gameStarted'); throw new Error('gameStarted'); }
    identityStorage.setItem(`payopoly_${id}`, playerId);
    identityStorage.setItem('payopoly_resume', JSON.stringify({ gameId: id, playerId }));
    setGameId(id); setMyPlayerId(playerId);
    return { gameId: id, playerId };
  }

  function loadGame(id) {
    const storedId = identityStorage.getItem(`payopoly_${id}`);
    if (gameId !== id) setGame(null);
    setGameId(id); setMyPlayerId(storedId);
    if (!storedId) setError('notJoined');
  }

  // ── Lobby ────────────────────────────────────────────────────────────────
  async function setReady(ready) {
    await update(ref(db, `games/${gameId}/players/${myPlayerId}`), { ready });
  }

  async function removePlayer(playerId) {
    if (!isHost || playerId === myPlayerId || game.currentMinigame) return;
    await runTransaction(ref(db, `games/${gameId}`), room => {
      if (!room?.players?.[playerId] || room.hostId !== myPlayerId || room.currentMinigame) return undefined;
      const removedCurrent = room.status === 'play' && room.currentTurn?.playerId === playerId;
      const played = (room.history ?? []).filter(turn => turn.playerId === playerId).length;
      if (room.status === 'play') room.totalTurns = Math.max(room.turnsPlayed ?? 0, room.totalTurns - Math.max(0, room.settings.rounds - played - (removedCurrent ? 1 : 0)));
      if (removedCurrent) room = finishTurn(room, {}, now(), room.currentTurn.id, 'player_removed');
      room.kicked ??= {}; room.kicked[playerId] = room.players[room.hostId]?.name ?? 'Host';
      delete room.players[playerId];
      room.playerOrder = (room.playerOrder ?? []).filter(id => id !== playerId);
      if (room.status === 'play' && Object.keys(room.players).length < 2) room = { ...room, status: 'finished', finishedAt: now(), currentTurn: null, currentMinigame: null };
      return room;
    }, { applyLocally: false });
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

  async function configureGame(settings) {
    if (!isHost || game.status !== 'lobby') return;
    const rounds = settings.rounds ?? game.settings?.rounds;
    if (rounds !== null && ![1, 3, 5].includes(rounds)) return;
    await update(ref(db, `games/${gameId}/settings`), settings);
  }

  async function startGame() {
    if (!isHost || ![1, 3, 5].includes(game.settings?.rounds)) return;
    const defaults = shuffle(CATEGORIES[game.settings?.language] ?? CATEGORIES.fr);
    await runTransaction(ref(db, `games/${gameId}`), room => {
      if (!room || room.status !== 'lobby' || Object.keys(room.players ?? {}).length < 2 || !Object.values(room.players).every(p => p.ready)) return undefined;
      Object.entries(room.players).forEach(([id, player], i) => {
        room.players[id] = { ...player, categories: [defaults[(i * 2) % defaults.length], defaults[(i * 2 + 1) % defaults.length]],
          defaultCategories: [defaults[(i * 2) % defaults.length], defaults[(i * 2 + 1) % defaults.length]] };
      });
      return { ...room, status: 'prep', prepStartedAt: now() };
    }, { applyLocally: false });
  }

  async function rematch() {
    if (!isHost) return;
    await runTransaction(ref(db, `games/${gameId}`), room => {
      if (!room || room.status !== 'finished') return undefined;
      const players = Object.fromEntries(Object.entries(room.players).map(([id, p]) => [id, { name: p.name, ready: false, points: 0, categoriesSubmitted: false }]));
      return { status: 'lobby', hostId: room.hostId, createdAt: room.createdAt, settings: room.settings, players, presence: room.presence ?? {} };
    }, { applyLocally: false });
  }

  async function takeHost() {
    await runTransaction(ref(db, `games/${gameId}`), room => {
      if (!room || onlineIds(room, now()).includes(room.hostId) || !room.players?.[myPlayerId]) return undefined;
      return { ...room, hostId: myPlayerId };
    }, { applyLocally: false });
  }

  // ── Prep phase ───────────────────────────────────────────────────────────
  async function submitCategory(category) {
    const value = category.trim().slice(0, 60);
    if (!value) return;
    const result = await runTransaction(ref(db, `games/${gameId}/players/${myPlayerId}`), p => {
      if (!p || p.categoriesSubmitted) return undefined;
      const custom = p.customCategories ?? [];
      if (custom.length >= 3 || custom.some(c => c.toLowerCase() === value.toLowerCase())) return undefined;
      return { ...p, customCategories: [...custom, value], categoriesSubmitted: custom.length === 2 };
    }, { applyLocally: false });
    return result.committed;
  }

  async function finishCategorySubmission() {
    await update(ref(db, `games/${gameId}/players/${myPlayerId}`), { categoriesSubmitted: true });
  }

  async function distributeCategories() {
    const sessionId = generateId();
    await runTransaction(ref(db, `games/${gameId}`), room => {
      if (!room || room.status !== 'prep' || room.distributionDone) return undefined;
      const ids = Object.keys(room.players);
      const submitted = shuffle(Object.values(room.players).flatMap(p => p.customCategories ?? []));
      ids.forEach((id, i) => {
        room.players[id].categories = [...(room.players[id].defaultCategories ?? []), ...submitted.slice(i * 3, (i + 1) * 3)];
      });
      const order = shuffle(ids);
      return { ...room, distributionDone: true, sessionId, playerOrder: order, initialPlayerCount: ids.length,
        totalTurns: ids.length * room.settings.rounds, turnsPlayed: 0, currentTurnIndex: 0,
        currentTurn: { id: `${sessionId}:0`, playerId: order[0], phase: 'choose_type', startedAt: now(), roundNumber: 1 }, status: 'play' };
    }, { applyLocally: false });
  }

  // ── Play phase — turn flow ───────────────────────────────────────────────
  async function updateTurn(expectedPhase, updates) {
    const id = game.currentTurn?.id;
    await runTransaction(ref(db, `games/${gameId}/currentTurn`), turn => {
      if (!turn || turn.id !== id || turn.phase !== expectedPhase || turn.playerId !== myPlayerId) return undefined;
      return { ...turn, ...updates, startedAt: now() };
    }, { applyLocally: false });
  }
  async function selectMinigameType(type) {
    if (!['solo', 'duel', 'all'].includes(type)) return;
    await updateTurn('choose_type', { minigameType: type, phase: 'spinning' });
  }
  async function selectMinigame(minigame) {
    const type = game.currentTurn.minigameType;
    if (!availableMinigames(type, Object.keys(game.players).length).includes(minigame)) return;
    await updateTurn('spinning', { minigame, phase: type === 'duel' ? 'choose_opponent' : 'playing' });
  }
  async function selectOpponent(opponentId) {
    if (!game.players?.[opponentId] || opponentId === myPlayerId) return;
    await updateTurn('choose_opponent', { opponentId, phase: 'playing' });
  }

  // Public random events are chosen once and replayed from the shared clock.
  async function startWheelSpin(items, forcedResult = null, duration = 4000) {
    const turnId = game.currentTurn?.id;
    const value = items.includes(forcedResult) ? forcedResult : items[Math.floor(Math.random() * items.length)];
    if (!value) return;
    await runTransaction(ref(db, `games/${gameId}/currentTurn`), turn => {
      if (!turn || turn.id !== turnId || turn.phase !== 'spinning' || turn.playerId !== myPlayerId || turn.wheelSpin) return undefined;
      return { ...turn, wheelSpin: { value, startedAt: now(), duration } };
    }, { applyLocally: false });
  }

  async function startDiceRoll() {
    const mgId = game.currentMinigame?.id;
    const value = Math.floor(Math.random() * 6) + 1;
    await runTransaction(ref(db, `games/${gameId}/currentMinigame`), current => {
      if (!current || current.id !== mgId || current.phase !== 'dice' || current.tPlayerId !== myPlayerId || current.diceRoll) return undefined;
      return { ...current, diceRoll: { value, startedAt: now() } };
    }, { applyLocally: false });
  }

  // ── Minigame state ───────────────────────────────────────────────────────
  // Called once when the minigame page loads (by TPlayer only)
  async function initMinigame() {
    const turn   = game.currentTurn;
    const exists = game.currentMinigame?.tPlayerId === turn.playerId && game.currentMinigame?.name === turn.minigame;
    if (exists && game.currentMinigame.id === turn.id) return; // already initialised (reconnect case)
    const initial = {
      id: turn.id, phaseStartedAt: now(),
      type:        turn.minigameType,
      name:        turn.minigame,
      tPlayerId:   turn.playerId,
      pPlayerId:   turn.opponentId ?? null,
      phase:       'rules',
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
      // ── Added for the eight new minigames ──────────────────────────────
      promptText:   null,   // Bluff, Punchline, Qui a écrit ça
      trueAnswer:   null,   // Bluff
      options:      null,   // Bluff — shuffled fakes + truth
      submissions:  {},     // every text-entry game
      picks:        {},     // Bluff
      attributions: {},     // Qui a écrit ça
      surveyPrompt: null,   // Sondage Éclair
      surveyOptions: null,
      answers:      {},     // Sondage Éclair — what you think
      predictions:  {},     // Sondage Éclair — what you think the room thinks
      tabooWord:    null,   // Mot Interdit
      forbiddenWords: null,
      guesses:      {},     // Mot Interdit
      foundBy:      null,
      spectrum:     null,   // Le Curseur
      target:       null,
      clue:         null,
      seedWord:     null,   // Rimes Rapides
      rhymePool:    null,
      chain:        {},
      activePlayerId: null,
      turnDeadline: null,
      drawings:     {},     // Croquis Croisés — one canvas per player
      drawWords:    null,
      revealOrder:  null,
      revealIndex:  null,
      voteDeadline: null,   // shared vote timeout
      scores:       null,
      awards:       null,
    };
    await runTransaction(ref(db, `games/${gameId}`), room => {
      if (!room || room.currentTurn?.id !== turn.id || room.currentMinigame?.id === turn.id) return undefined;
      return { ...room, currentMinigame: initial };
    }, { applyLocally: false });
  }

  // Generic write helper used by each minigame component
  async function updateMinigame(updates) {
    const expectedId = game.currentTurn?.id;
    const expectedPhase = game.currentMinigame?.phase;
    await runTransaction(ref(db, `games/${gameId}/currentMinigame`), current => {
      if (!current || current.id !== expectedId || (updates.phase && current.phase !== expectedPhase && current.phase !== updates.phase)) return undefined;
      const next = structuredClone(current);
      for (const [path, value] of Object.entries(updates)) {
        const keys = path.split('/');
        let target = next;
        for (const key of keys.slice(0, -1)) target = target[key] ??= {};
        target[keys.at(-1)] = value ?? null;
      }
      if (updates.diceValue) next.pointsValue = scoreUnit(game, next);
      if (updates.phase && updates.phase !== current.phase) {
        next.phaseStartedAt = now();
        if (['playing', 'writing', 'drawing', 'titling', 'picking', 'attributing', 'answering', 'predicting', 'guessing'].includes(updates.phase)) next.countdownStartedAt = now();
      }
      // Generating content never consumes a player's writing time.
      if (updates.promptText && current.phase === 'writing' && !current.promptText) next.countdownStartedAt = now();
      if (updates.awards) next.awards = cleanAwards(game, updates.awards);
      return next;
    }, { applyLocally: false });
  }

  async function fetchContent(endpoint, options) {
    const turnId = game.currentTurn?.id;
    const key = `${turnId}:${endpoint}:${options.body}`;
    if (!requestRef.current.has(key)) {
      requestRef.current.set(key, requestContent(endpoint, options, { language: game.settings?.language ?? 'fr' }));
    }
    const data = await requestRef.current.get(key);
    if (roomRef.current?.currentTurn?.id !== turnId) throw new Error('Round changed');
    if (data.fallback) updateMinigame({ fallback: true }).catch(() => {});
    return data;
  }

  // Mark a player as ready inside a minigame
  async function setMinigameReady() {
    await setMyEntry('readyPlayers', true);
  }

  // Submit a trivia answer: { questionIndex, answerIndex, timestamp }
  async function submitTriviaAnswer(questionIndex, answerIndex) {
    const timestamp = now();
    const mgId = game.currentMinigame?.id;
    await runTransaction(ref(db, `games/${gameId}/currentMinigame`), current => {
      if (!current || current.id !== mgId || current.phase !== 'playing' || timestamp > (current.countdownStartedAt ?? timestamp) + 60000) return undefined;
      const answers = current.triviaAnswers?.[myPlayerId] ?? {};
      if (Object.values(answers).some(a => a.questionIndex === questionIndex)) return undefined;
      current.triviaAnswers ??= {};
      current.triviaAnswers[myPlayerId] = { ...answers, [questionIndex]: { questionIndex, answerIndex, timestamp } };
      return current;
    }, { applyLocally: false });
  }

  // Cast a vote; Petit Bac duellists can vote for the opposing set.
  async function castVote(choice) {
    if (game.currentMinigame?.name === 'Petit Bac') {
      const mgId = game.currentMinigame.id;
      await runTransaction(ref(db, `games/${gameId}/currentMinigame`), current => {
        if (!current || current.id !== mgId || current.phase !== 'voting' || current.votes?.[myPlayerId] !== undefined
          || now() >= (current.voteDeadline ?? current.phaseStartedAt + 25000)
          || !validPetitBacVote({ ...game, currentMinigame: current }, myPlayerId, choice)) return undefined;
        return { ...current, votes: { ...current.votes, [myPlayerId]: choice } };
      }, { applyLocally: false });
      return;
    }
    await setMyEntry('votes', choice);
  }

  async function savePetitBacWord(categoryIndex, word) {
    const mgId = game.currentMinigame?.id;
    const result = await runTransaction(ref(db, `games/${gameId}/currentMinigame`), current => {
      if (current?.id !== mgId) return undefined;
      return writePetitBacWord(current, myPlayerId, categoryIndex, word, now());
    }, { applyLocally: false });
    return result.committed;
  }

  // ── Generic per-player writers ───────────────────────────────────────────
  // The new minigames all store one value per player under a named map
  // (submissions, picks, answers, predictions, guesses, attributions...), so
  // they share these two instead of adding a context function per field.
  async function setMyEntry(field, value) {
    const mgId = game.currentMinigame?.id;
    await runTransaction(ref(db, `games/${gameId}/currentMinigame`), current => {
      if (!current || current.id !== mgId || ['complete', 'results'].includes(current.phase)) return undefined;
      const keys = field.split('/');
      let parent = current;
      for (const key of keys.slice(0, -1)) parent = parent[key] ??= {};
      const map = parent[keys.at(-1)] ??= {};
      if (map[myPlayerId] !== undefined) return undefined;
      map[myPlayerId] = value ?? null;
      return current;
    }, { applyLocally: false });
  }

  async function pushEntry(field, value) {
    const key = generateId();
    await updateMinigame({ [`${field}/${key}`]: value });
  }

  // Host/turn-player override so a missing vote can never stall the round
  async function closeVoting() {
    await updateMinigame({ voteDeadline: now() });
  }

  // Push a completed drawing stroke to Firebase (Pictionary)
  async function pushDrawingStroke(stroke) {
    await pushEntry('strokes', stroke);
  }

  // Update the in-progress stroke (throttled by caller); pass null to clear
  async function updateCurrentStroke(stroke) {
    await updateMinigame({ currentStroke: stroke ?? null });
  }

  // Clear all strokes and the in-progress stroke
  async function clearDrawing() {
    await updateMinigame({ strokes: {}, currentStroke: null });
  }

  // ── Croquis Croisés — one canvas per player ──────────────────────────────
  // Pictionary has a single shared canvas at currentMinigame/strokes. When
  // everyone draws at once each player needs their own, so these write under
  // drawings/{playerId} instead. Nothing here touches the Pictionary paths.
  async function pushMyStroke(stroke) {
    await pushEntry(`drawings/${myPlayerId}/strokes`, stroke);
  }

  async function updateMyCurrentStroke(stroke) {
    await updateMinigame({ [`drawings/${myPlayerId}/currentStroke`]: stroke ?? null });
  }

  async function clearMyDrawing() {
    await updateMinigame({ [`drawings/${myPlayerId}`]: { strokes: {}, currentStroke: null } });
  }

  // Award points and advance to the next turn.
  //
  // Takes a payout map — { playerId: points } — so a round can pay everyone
  // something different. The old two-argument form still works: the seven
  // original minigames call completeMinigame(winnerId, bonusWinnerId) and get
  // pointsValue each, exactly as before.
  async function completeMinigame(_awardsOrWinnerId, _bonusWinnerId = null, reason = null) {
    if (!isHost && !isController) return;
    void _awardsOrWinnerId; void _bonusWinnerId;
    const mg = game.currentMinigame;
    if (!reason && (!mg || !['complete', 'results'].includes(mg.phase))) return;
    const awards = reason ? {} : roundAwards(game);
    const turnId = game.currentTurn?.id;
    await runTransaction(ref(db, `games/${gameId}`), room => finishTurn(room, awards, now(), turnId, reason), { applyLocally: false });
  }

  async function skipTurn() {
    if (!isHost && !isController) return;
    await completeMinigame({}, null, 'skipped');
  }

  // Shared recovery watchdog. Deadlines remain authoritative across reconnects.
  useEffect(() => {
    if (!game || !myPlayerId || !connected) return;
    if (!game.settings || (game.status === 'play' && !game.currentTurn?.id)) {
      if (game.hostId === myPlayerId) runTransaction(ref(db, `games/${gameId}`), room => {
        if (!room) return undefined;
        room.settings ??= { ...DEFAULT_SETTINGS, rounds: room.status === 'lobby' ? null : 3 };
        if (room.status === 'play' && !room.currentTurn?.id) {
          room.sessionId = generateId(); room.turnsPlayed = 0; room.totalTurns = Object.keys(room.players).length * room.settings.rounds;
          room.initialPlayerCount = Object.keys(room.players).length;
          room.currentTurn = { ...room.currentTurn, id: `${room.sessionId}:0`, startedAt: now(), roundNumber: 1 };
          if (room.currentMinigame) room.currentMinigame = { ...room.currentMinigame, id: room.currentTurn.id, phaseStartedAt: now() };
        }
        return room;
      }, { applyLocally: false }).catch(() => setError('connectionError'));
      return;
    }
    const currentOnline = onlineIds(game, tick);
    const controller = controllerId(game, tick);
    if (!currentOnline.includes(game.hostId)) {
      missingHostSince.current ??= tick;
      if (tick - missingHostSince.current >= 5000 && currentOnline.sort()[0] === myPlayerId) takeHost().catch(() => setError('connectionError'));
    } else missingHostSince.current = null;
    if (game.status === 'prep' && myPlayerId === game.hostId && tick - game.prepStartedAt > 90000) {
      distributeCategories().catch(() => setError('connectionError'));
    }
    if (game.status !== 'play' || controller !== myPlayerId) return;
    const mg = game.currentMinigame;
    if (!mg) {
      if (game.settings?.preset === 'quick' && game.currentTurn.phase === 'choose_type' && game.currentTurn.playerId === myPlayerId) {
        selectMinigameType('all').catch(() => setError('connectionError'));
        return;
      }
      if (tick - game.currentTurn.startedAt > 90000) skipTurn().catch(() => setError('connectionError'));
      return;
    }
    if (mg.phase === 'rules' && (Object.keys(mg.rulesReady ?? {}).length >= Object.keys(game.players).length || tick - mg.phaseStartedAt >= 20000)) {
      updateMinigame({ phase: 'dice', ...(game.settings?.preset === 'quick' ? { readyPlayers: mg.rulesReady ?? {} } : {}) }).catch(() => setError('connectionError'));
      return;
    }
    // If a device reloads while generating content, another controller can retry.
    const contentTypes = {
      Mimes: ['mime-word', 'mimeWord'], Pictionary: ['pictionary-word', 'pictionaryWord'],
      'Mot Melangés': ['jumble', 'jumbledWord'], 'Mot Interdit': ['taboo', 'tabooWord'],
      Punchline: ['punchline', 'promptText'], Bluff: ['bluff', 'trueAnswer'],
      'Qui a écrit ça': ['prompt', 'promptText'], 'Le Curseur': ['spectrum', 'spectrum'],
      'Rimes Rapides': ['rhymes', 'seedWord'],
    };
    const content = contentTypes[mg.name];
    if (content && !mg[content[1]] && !['rules', 'dice', 'complete', 'results'].includes(mg.phase) && tick - mg.phaseStartedAt >= 15000) {
      fetchContent(`/api/${content[0]}`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ category:mg.category, difficulty:mg.difficulty ?? mg.diceValue }) })
        .then(data => {
          const updates = {
            'mime-word': { mimeWord:data.word }, 'pictionary-word': { pictionaryWord:data.word },
            jumble: { jumbledWord:data.jumbled, originalWord:data.original }, taboo: { tabooWord:data.word, forbiddenWords:data.forbidden },
            punchline: { promptText:data.prompt }, bluff: { promptText:data.prompt, trueAnswer:data.answer },
            prompt: { promptText:data.prompt }, spectrum: { spectrum:{ left:data.left, right:data.right } }, rhymes: { seedWord:data.seed, rhymePool:data.valid },
          };
          return updateMinigame(updates[content[0]]);
        }).catch(() => setError('connectionError'));
    }
    const elapsed = tick - (mg.countdownStartedAt ?? mg.phaseStartedAt ?? tick);
    if (['results', 'complete'].includes(mg.phase)) {
      if (tick - mg.phaseStartedAt > 30000) completeMinigame(mg.awards ?? mg.winnerId, mg.bonusWinnerId).catch(() => setError('connectionError'));
      return;
    }
    if (mg.name === 'Trivia' && mg.phase === 'playing' && elapsed >= 60000) {
      const ids = mg.type === 'duel' ? [mg.tPlayerId, mg.pPlayerId] : Object.keys(game.players);
      updateMinigame({ ...triviaResult(mg, ids), phase: 'results' }).catch(() => setError('connectionError'));
      return;
    }
    if (mg.phase === 'voting' && tick >= (mg.voteDeadline ?? mg.phaseStartedAt + 25000)) {
      if (mg.name === 'Petit Bac') {
        updateMinigame(petitBacResult(game)).catch(() => setError('connectionError'));
        return;
      }
      const winners = tiedLeaders(mg.votes);
      const yes = Object.values(mg.votes ?? {}).filter(v => v === 'yes').length;
      const no = Object.values(mg.votes ?? {}).filter(v => v === 'no').length;
      const duel = mg.type === 'duel';
      const won = yes > no;
      updateMinigame({ phase: !duel && won && ['Mimes', 'Pictionary'].includes(mg.name) ? 'bonus_pick' : 'complete',
        winnerId: duel ? (winners.length === 1 ? winners[0] : null) : won ? mg.tPlayerId : null,
        winnerIds: duel ? winners : [] }).catch(() => setError('connectionError'));
      return;
    }
    if (['Mimes', 'Petit Bac', 'Mot Melangés'].includes(mg.name) && mg.phase === 'playing' && elapsed >= 30000) {
      updateMinigame({ phase: 'voting' }).catch(() => setError('connectionError'));
      return;
    }
    if (mg.phase === 'bonus_pick' && tick - mg.phaseStartedAt >= 30000) {
      updateMinigame({ phase: 'complete' }).catch(() => setError('connectionError'));
      return;
    }
    // Timed game callbacks handle scoring; this guard handles missing actors/content.
    if (tick - mg.phaseStartedAt > (mg.phase === 'playing' ? 120000 : 90000)) {
      skipTurn().catch(() => setError('connectionError'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, game, connected, myPlayerId]);

  // ── Derived helpers ──────────────────────────────────────────────────────
  const myPlayer    = game?.players?.[myPlayerId] ?? null;
  const isHost      = game?.hostId === myPlayerId;
  const isMyTurn    = game?.currentTurn?.playerId === myPlayerId;
  const mg          = game?.currentMinigame ?? null;
  const isController = controllerId(game ?? {}, tick) === myPlayerId;
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
      error, connected, onlinePlayerIds: onlineIds(game ?? {}, tick), isController,
      MINIGAMES, MINIGAME_META, PETIT_BAC_LETTERS,
      availableMinigames,
      getLobbyPool,
      createGame, joinGame, loadGame,
      setReady, removePlayer, startGame, configureGame, rematch, takeHost, skipTurn, fetchContent,
      normalizedAwards: awards => cleanAwards(game, awards),
      toggleDevMode, adjustPoints,
      submitCategory, finishCategorySubmission,
      selectMinigameType, selectMinigame, selectOpponent, startWheelSpin, startDiceRoll,
      initMinigame, updateMinigame, setMinigameReady,
      submitTriviaAnswer, castVote, completeMinigame, savePetitBacWord,
      setMyEntry, pushEntry, closeVoting,
      pushDrawingStroke, updateCurrentStroke, clearDrawing,
      pushMyStroke, updateMyCurrentStroke, clearMyDrawing,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
