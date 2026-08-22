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
// types stay as they are. `kind` instead splits ALL into what actually happens
// at the table, and weights the wheel by lobby size: one performer with an
// audience (showcase) is a spice, everyone playing at once (melee) is the
// staple, and the bigger the room the more the wheel should favour melee.
export const MINIGAME_META = {
  'duel:Petit Bac':      { kind: 'duel',     minPlayers: 3 },
  'duel:Trivia':         { kind: 'duel',     minPlayers: 2 },
  'duel:Punchline':      { kind: 'duel',     minPlayers: 4 },
  'duel:Rimes Rapides':  { kind: 'duel',     minPlayers: 2 },
  'all:Mimes':           { kind: 'showcase', minPlayers: 3 },
  'all:Pictionary':      { kind: 'showcase', minPlayers: 3 },
  'all:Mot Interdit':    { kind: 'showcase', minPlayers: 3 },
  'all:Trivia':          { kind: 'melee',    minPlayers: 2 },
  'all:Sondage Éclair':  { kind: 'melee',    minPlayers: 3 },
  'all:Bluff':           { kind: 'melee',    minPlayers: 3 },
  'all:Le Curseur':      { kind: 'melee',    minPlayers: 3 },
  'all:Qui a écrit ça':  { kind: 'melee',    minPlayers: 4 },
  'all:Croquis Croisés': { kind: 'melee',    minPlayers: 4 },
  'solo:Petit Bac':      { kind: 'solo',     minPlayers: 2 },
  'solo:Mot Melangés':   { kind: 'solo',     minPlayers: 2 },
};

// Drop anything the lobby is too small for, then duplicate melee slices at
// larger tables so the wheel lands on them more often.
export function availableMinigames(type, playerCount) {
  const all = MINIGAMES[type] ?? [];
  const names = all.filter(name => {
    const meta = MINIGAME_META[`${type}:${name}`];
    return !meta || playerCount >= meta.minPlayers;
  });

  // Never hand back an empty wheel — a one-player lobby (dev mode, or someone
  // starting alone) would otherwise get a slice list of nothing to spin.
  if (names.length === 0) return all;

  if (type !== 'all' || playerCount < 6) return names;
  return names.flatMap(name =>
    MINIGAME_META[`all:${name}`]?.kind === 'melee' ? [name, name] : [name]);
}
