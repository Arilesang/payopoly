import { seedDemoRoom, readDemoRoom, update, ref } from './database.js';
import { beginPromptSelection } from '../lib/promptSelection.js';

// Demo mode only: isolated fixtures for reviewing the real selection component.
export function bootPromptPreview(kind) {
  const punchline = kind === 'punchline';
  const name = punchline ? 'Punchline' : 'Sondage Éclair';
  const type = punchline ? 'duel' : 'all';
  const id = `preview:${Date.now()}`;
  const tPlayerId = punchline ? 'demo-alex' : 'demo-you';
  const room = {
    status: 'play', hostId: 'demo-you', sessionId: 'preview',
    settings: { language: 'fr', rounds: 3, preset: 'classic', scoring: 'dice' },
    players: Object.fromEntries([['demo-you', 'Camille'], ['demo-alex', 'Alex'], ['demo-sam', 'Sam']].map(([key, label], index) => [key, { name: label, points: 12 - index * 2, categories: ['Musique', 'Cinéma', 'Voyages'] }])),
    playerOrder: ['demo-you', 'demo-alex', 'demo-sam'], totalTurns: 9, turnsPlayed: 0,
    currentTurn: { id, playerId: tPlayerId, opponentId: punchline ? 'demo-sam' : null, phase: 'playing', minigameType: type, minigame: name, startedAt: Date.now() },
    currentMinigame: { id, name, type, tPlayerId, pPlayerId: punchline ? 'demo-sam' : null, phase: 'rules', phaseStartedAt: Date.now() },
  };
  Object.assign(room.currentMinigame, beginPromptSelection(room, Date.now(), () => 0));
  seedDemoRoom(room);
  sessionStorage.setItem('payopoly_DEMO24', 'demo-you');
  localStorage.setItem('payopoly_language', 'fr');

  const navigation = document.createElement('nav');
  navigation.className = 'demo-prompt-navigation';
  navigation.setAttribute('aria-label', 'Preview controls');
  for (const [value, label] of [['punchline', 'Punchline'], ['sondage', 'Sondage Éclair']]) {
    const link = document.createElement('a');
    link.textContent = label;
    link.href = `/game/DEMO24/minigame?preview=${value}`;
    if (value === kind) link.setAttribute('aria-current', 'page');
    navigation.append(link);
  }
  const reset = document.createElement('button');
  reset.textContent = '↻';
  reset.title = 'Recommencer l’aperçu';
  reset.setAttribute('aria-label', 'Recommencer l’aperçu');
  reset.onclick = () => location.reload();
  navigation.append(reset);
  document.body.prepend(navigation);

  const heartbeat = () => {
    const players = Object.keys(readDemoRoom()?.players ?? {});
    update(ref(null, 'games/DEMO24'), Object.fromEntries(players.map(key => [`presence/${key}/local-preview`, { online: true, lastSeen: Date.now() }])));
  };
  heartbeat();
  setInterval(heartbeat, 10000);
}
