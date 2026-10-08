import { onValue, ref, update, readDemoRoom, seedDemoRoom } from './database.js';
import './demo.css';

const roomCode = 'DEMO24';
const hostId = 'demo-you';
const guestId = 'demo-alex';
function freshRoom() {
  const player = name => ({ name, ready: true, points: 0, categoriesSubmitted: false });
  return {
    status: 'lobby', hostId, createdAt: Date.now(),
    settings: { rounds: 1, preset: 'quick', language: 'en', scoring: 'dice' },
    players: { [hostId]: player('You'), [guestId]: player('Alex') },
  };
}
function selectSeat(playerId) {
  sessionStorage.setItem(`payopoly_${roomCode}`, playerId);
  sessionStorage.setItem('payopoly_resume', JSON.stringify({ gameId: roomCode, playerId }));
}
function roomPath(room) {
  return room?.status === 'lobby' ? `/lobby/${roomCode}` : `/game/${roomCode}`;
}

export function bootDemo() {
  if (!readDemoRoom()) seedDemoRoom(freshRoom());
  const params = new URLSearchParams(location.search);
  const chosen = params.get('player');
  const stored = sessionStorage.getItem(`payopoly_${roomCode}`);
  const playerId = chosen === 'alex' ? guestId : chosen === 'you' ? hostId : stored ?? hostId;
  selectSeat(playerId);
  if (!localStorage.getItem('payopoly_language')) localStorage.setItem('payopoly_language', 'en');
  if (location.pathname === '/') history.replaceState(null, '', roomPath(readDemoRoom()));

  const bar = document.createElement('aside');
  bar.className = 'demo-bar';
  bar.setAttribute('aria-label', 'Local demo controls');
  bar.innerHTML = '<p><strong>Local demo</strong> · <span class="demo-seat"></span></p><p class="demo-turn"></p><div><button class="demo-switch">Switch player</button><button class="demo-reset">Reset demo</button></div>';
  document.body.prepend(bar);
  const other = playerId === hostId ? guestId : hostId;
  const otherName = other === hostId ? 'You' : 'Alex';
  bar.querySelector('.demo-seat').textContent = playerId === hostId ? 'You (host)' : 'Alex';
  const switchButton = bar.querySelector('.demo-switch');
  switchButton.textContent = `Play as ${otherName}`;
  switchButton.addEventListener('click', () => {
    selectSeat(other);
    location.assign(`${roomPath(readDemoRoom())}?player=${other === hostId ? 'you' : 'alex'}`);
  });
  bar.querySelector('.demo-reset').addEventListener('click', () => {
    seedDemoRoom(freshRoom());
    selectSeat(hostId);
    location.assign(`/lobby/${roomCode}?player=you`);
  });
  onValue(ref(null, `games/${roomCode}`), snap => {
    const room = snap.val();
    const current = room?.players?.[room.currentTurn?.playerId]?.name;
    bar.querySelector('.demo-turn').textContent = current ? `Current turn: ${current}`
      : room?.status === 'prep' ? 'Choose categories for both players using the switch above.'
      : room?.status === 'finished' ? 'Session complete · try a rematch or reset.'
      : 'Two ready players · 1 round each · Quick play';
  });
  // Both virtual seats stay online while this preview is open; you control each.
  const heartbeat = () => {
    const room = readDemoRoom();
    const presence = Object.fromEntries([hostId, guestId].filter(id => room?.players?.[id])
      .map(id => [`presence/${id}/local-preview`, { online: true, lastSeen: Date.now() }]));
    update(ref(null, `games/${roomCode}`), presence);
  };
  heartbeat();
  setInterval(heartbeat, 10000);
}
