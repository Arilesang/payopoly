// Minigame registry and wheel rules.
//
// These live outside GameContext.jsx because that file exports a component:
// mixing constants into it breaks Fast Refresh (react-refresh/only-export-components).

// Letters used in Petit Bac (excluding X, Y, Z, W, K for French)
export const PETIT_BAC_LETTERS = 'ABCDEFGHIJLMNOPQRSTU'.split('');

// Only minigames that are actually implemented appear on the wheel.
export const MINIGAMES = {
  duel: ['Petit Bac', 'Trivia', 'Punchline', 'Rimes Rapides'],
  all:  ['Mimes', 'Trivia', 'Pictionary', 'Sondage Éclair', 'Mot Interdit',
         'Bluff', 'Le Curseur', 'Qui a écrit ça', 'Croquis Croisés'],
  solo: ['Petit Bac', 'Mot Melangés'],
};

// The physical board has three spaces — Solo / Duel / ALL — so the three turn
// types stay as they are. `kind` records what actually happens at the table:
// one performer with an audience (showcase) versus everyone playing at once
// (melee). ALL now holds six melee games to three showcase, so the wheel
// already leans two-to-one toward melee without any thumb on the scale.
//
// minPlayers is the size below which a game genuinely cannot run — not the
// size at which it plays best. Every game shows on the wheel as soon as it
// works, and the only thing that raises the floor above two is needing a
// spectator to vote, since a duel with nobody watching can never resolve.
export const MINIGAME_META = {
  'duel:Petit Bac':      { kind: 'duel',     minPlayers: 3 },  // spectators vote
  'duel:Trivia':         { kind: 'duel',     minPlayers: 2 },
  'duel:Punchline':      { kind: 'duel',     minPlayers: 3 },  // spectators vote
  'duel:Rimes Rapides':  { kind: 'duel',     minPlayers: 2 },
  'all:Mimes':           { kind: 'showcase', minPlayers: 2 },
  'all:Pictionary':      { kind: 'showcase', minPlayers: 2 },
  'all:Mot Interdit':    { kind: 'showcase', minPlayers: 2 },
  'all:Trivia':          { kind: 'melee',    minPlayers: 2 },
  'all:Sondage Éclair':  { kind: 'melee',    minPlayers: 2 },
  'all:Bluff':           { kind: 'melee',    minPlayers: 2 },
  'all:Le Curseur':      { kind: 'melee',    minPlayers: 2 },
  'all:Qui a écrit ça':  { kind: 'melee',    minPlayers: 3 },  // 2 leaves one forced choice
  'all:Croquis Croisés': { kind: 'melee',    minPlayers: 2 },
  'solo:Petit Bac':      { kind: 'solo',     minPlayers: 2 },
  'solo:Mot Melangés':   { kind: 'solo',     minPlayers: 2 },
};

// Every minigame the lobby is big enough to actually play, each listed once.
export function availableMinigames(type, playerCount) {
  const all = MINIGAMES[type] ?? [];
  const names = all.filter(name => {
    const meta = MINIGAME_META[`${type}:${name}`];
    return !meta || playerCount >= meta.minPlayers;
  });

  // Never hand back an empty wheel — a one-player lobby (dev mode, or someone
  // starting alone) would otherwise get a slice list of nothing to spin.
  return names.length ? names : all;
}
