// Player-facing rules for every minigame on the wheel.
//
// Kept as one bilingual module rather than split across i18n/fr.js + i18n/en.js:
// each entry is a dozen strings that only make sense next to each other, and
// side-by-side fields are the only way a translation drift stays visible.
//
// `id` matches the keys in gameConfig.js / minigames/index.jsx, so the minimum
// player count is read from MINIGAME_META instead of being retyped here.

export const MINIGAME_RULES = [
  // ── SOLO ────────────────────────────────────────────────────────────────
  {
    id: 'solo:Petit Bac',
    type: 'solo',
    emoji: '🔤',
    name: 'Petit Bac',
    timer: '30 s',
    tagline: {
      fr: 'Une lettre, sept catégories, trente secondes.',
      en: 'One letter, seven categories, thirty seconds.',
    },
    steps: [
      {
        fr: 'Lance le dé : sa valeur (1 à 6) devient le nombre de points en jeu.',
        en: 'Roll the die — its value (1 to 6) is how many points are on the line.',
      },
      {
        fr: 'Une machine à sous tire une lettre au hasard.',
        en: 'A slot machine pulls a random letter.',
      },
      {
        fr: '30 secondes pour citer à voix haute un mot commençant par cette lettre dans chacune des 7 catégories affichées.',
        en: '30 seconds to say out loud a word starting with that letter for each of the 7 categories shown.',
      },
      {
        fr: 'Les autres joueurs votent : réussi ou raté ?',
        en: 'Everyone else votes: did you pull it off?',
      },
    ],
    scoring: {
      fr: 'Une majorité de « oui » et tu empoches les points du dé. Sinon, rien.',
      en: 'A majority of “yes” hands you the die’s points. Otherwise, nothing.',
    },
    tip: {
      fr: 'Les catégories sortent du pot commun de la table — tu peux très bien tomber sur celles des autres.',
      en: 'Categories come from the whole table’s pool — you can easily land on someone else’s.',
    },
  },
  {
    id: 'solo:Mot Melangés',
    type: 'solo',
    emoji: '🔀',
    name: 'Mot Mélangés',
    timer: '30 s',
    tagline: {
      fr: 'Un mot passé au mixeur. À toi de le remettre à l’endroit.',
      en: 'A word run through a blender. Put it back together.',
    },
    steps: [
      {
        fr: 'Lance le dé : il fixe les points en jeu ET la difficulté du mot (1 = facile, 6 = coriace).',
        en: 'Roll the die: it sets both the points at stake AND the word’s difficulty (1 = easy, 6 = brutal).',
      },
      {
        fr: 'Une catégorie est tirée au hasard dans le pot commun.',
        en: 'A category is drawn at random from the shared pool.',
      },
      {
        fr: 'L’IA fabrique un mot mélangé. Tu as 30 secondes pour le retrouver à voix haute.',
        en: 'The AI scrambles a word. You get 30 seconds to call it out.',
      },
      {
        fr: 'Les autres joueurs votent : trouvé ou pas ?',
        en: 'Everyone else votes: did you get it?',
      },
    ],
    scoring: {
      fr: 'Majorité de « oui » → les points du dé sont à toi.',
      en: 'Majority “yes” → the die’s points are yours.',
    },
    tip: {
      fr: 'Un gros dé rapporte gros, mais fabrique un mot bien plus retors. Le risque fait partie du jeu.',
      en: 'A high roll pays more, but scrambles a far nastier word. The risk is the game.',
    },
  },

  // ── DUEL ────────────────────────────────────────────────────────────────
  {
    id: 'duel:Petit Bac',
    type: 'duel',
    emoji: '⚔️',
    name: 'Petit Bac',
    timer: '30 s',
    tagline: {
      fr: 'Deux joueurs, la même lettre, sept catégories. Le public tranche.',
      en: 'Two players, one letter, seven categories. The room decides.',
    },
    steps: [
      {
        fr: 'Choisis ton adversaire, puis lance le dé (sa valeur = les points en jeu).',
        en: 'Pick your opponent, then roll the die (its value = the points at stake).',
      },
      {
        fr: 'Une lettre est tirée au sort. Les deux duellistes se déclarent prêts.',
        en: 'A letter is drawn. Both duellists mark themselves ready.',
      },
      {
        fr: '30 secondes : chacun remplit les 7 catégories à voix haute avec cette lettre.',
        en: '30 seconds: each fills the 7 categories out loud with that letter.',
      },
      {
        fr: 'Les spectateurs votent pour celui qui s’en est le mieux tiré.',
        en: 'The spectators vote for whoever did it better.',
      },
    ],
    scoring: {
      fr: 'Le duelliste qui récolte le plus de voix empoche les points du dé.',
      en: 'The duellist with the most votes takes the die’s points.',
    },
    tip: {
      fr: 'Il faut au moins un spectateur pour départager — d’où les 3 joueurs minimum.',
      en: 'Someone has to break the tie, which is why this one needs 3 players.',
    },
  },
  {
    id: 'duel:Trivia',
    type: 'duel',
    emoji: '🧠',
    name: 'Trivia',
    timer: '3 questions',
    tagline: {
      fr: 'Trois questions générées sur mesure. Le plus juste — et le plus rapide — gagne.',
      en: 'Three made-to-measure questions. Most right, fastest, wins.',
    },
    steps: [
      {
        fr: 'Choisis ton adversaire, puis lance le dé : il fixe les points ET la difficulté (1 = très facile, 6 = très corsé).',
        en: 'Pick your opponent, then roll: the die sets the points AND the difficulty (1 = very easy, 6 = very hard).',
      },
      {
        fr: 'Propose deux de tes catégories ; ton adversaire en choisit une. L’IA génère 3 questions à choix multiple dessus.',
        en: 'Offer two of your categories; your opponent picks one. The AI writes 3 multiple-choice questions on it.',
      },
      {
        fr: 'Les deux duellistes se déclarent prêts, puis répondent chacun sur son téléphone.',
        en: 'Both duellists mark ready, then answer on their own phone.',
      },
      {
        fr: 'Les bonnes réponses sont comptées automatiquement.',
        en: 'Correct answers are tallied automatically.',
      },
    ],
    scoring: {
      fr: 'Le meilleur score des deux prend les points du dé. À égalité, le plus rapide l’emporte.',
      en: 'The better score takes the die’s points. On a tie, the faster player wins.',
    },
    tip: {
      fr: 'Avant le coup d’envoi, les spectateurs parient sur le vainqueur : ½ dé s’ils ont raison, le dé entier s’ils ont vu juste contre la majorité.',
      en: 'Before kick-off, spectators predict the winner: half the die if right, the full die if right against the majority.',
    },
  },
  {
    id: 'duel:Punchline',
    type: 'duel',
    emoji: '😂',
    name: 'Punchline',
    timer: '45 s + 20 s',
    tagline: {
      fr: 'Même phrase à trous, deux cerveaux. La salle vote à l’aveugle.',
      en: 'Same fill-in-the-blank, two brains. The room votes blind.',
    },
    steps: [
      {
        fr: 'Choisis ton adversaire, puis lance le dé pour fixer les points.',
        en: 'Pick your opponent, then roll the die to set the points.',
      },
      {
        fr: 'Les deux duellistes reçoivent la même phrase à compléter. 45 secondes pour écrire.',
        en: 'Both duellists get the same sentence to finish. 45 seconds to write.',
      },
      {
        fr: 'Les deux réponses s’affichent mélangées, sans nom d’auteur. 20 secondes pour voter.',
        en: 'The two answers appear shuffled, with no author shown. 20 seconds to vote.',
      },
      {
        fr: 'Les duellistes ne votent pas — seuls les spectateurs tranchent.',
        en: 'The duellists don’t vote — only the spectators decide.',
      },
    ],
    scoring: {
      fr: 'Le vainqueur prend les points du dé. Carton plein (tous les votes) → points doublés.',
      en: 'The winner takes the die’s points. A clean sweep (every vote) doubles them.',
    },
    tip: {
      fr: 'Court et net bat long et laborieux : personne ne relit une punchline de trois lignes.',
      en: 'Short and sharp beats long and laboured — nobody re-reads a three-line punchline.',
    },
  },
  {
    id: 'duel:Rimes Rapides',
    type: 'duel',
    emoji: '🎤',
    name: 'Rimes Rapides',
    timer: '7 s → 3 s',
    tagline: {
      fr: 'Un ping-pong de rimes sur un chrono qui rétrécit à chaque échange.',
      en: 'Rhyme ping-pong on a clock that shrinks every exchange.',
    },
    steps: [
      {
        fr: 'Choisis ton adversaire, puis lance le dé pour fixer les points.',
        en: 'Pick your opponent, then roll the die to set the points.',
      },
      {
        fr: 'Un mot de départ est révélé aux deux duellistes.',
        en: 'A seed word is revealed to both duellists.',
      },
      {
        fr: 'Chacun son tour, tapez un mot qui rime — l’adversaire défié commence. Interdit de répéter un mot déjà joué.',
        en: 'Take turns typing a rhyming word — the challenged player goes first. Repeating one already played is out.',
      },
      {
        fr: 'Le chrono démarre à 7 secondes et perd une demi-seconde par échange, jusqu’à 3 secondes.',
        en: 'The clock starts at 7 seconds and drops half a second per exchange, down to 3.',
      },
    ],
    scoring: {
      fr: 'Le premier qui cale, se répète ou laisse filer le chrono perd. L’autre prend les points du dé.',
      en: 'First to stall, repeat, or run out the clock loses. The other takes the die’s points.',
    },
    tip: {
      fr: 'Garde tes rimes faciles pour la fin : à 3 secondes, tu n’auras plus le temps de réfléchir. Les spectateurs parient sur le vainqueur avant le coup d’envoi.',
      en: 'Save your easy rhymes for later — at 3 seconds there’s no time left to think. Spectators predict the winner before kick-off.',
    },
  },

  // ── TOUT LE MONDE — showcase ────────────────────────────────────────────
  {
    id: 'all:Mimes',
    type: 'all',
    emoji: '🤸',
    name: 'Mimes',
    timer: '30 s',
    tagline: {
      fr: 'Un mot, zéro son, toute la table qui devine.',
      en: 'One word, zero sound, the whole table guessing.',
    },
    steps: [
      {
        fr: 'Lance le dé pour fixer les points en jeu.',
        en: 'Roll the die to set the points at stake.',
      },
      {
        fr: 'Une catégorie du pot commun t’est attribuée et l’IA te souffle un mot — toi seul le vois.',
        en: 'A category from the shared pool is dealt to you and the AI whispers a word — only you see it.',
      },
      {
        fr: '30 secondes pour le mimer. Les autres crient leurs propositions à voix haute.',
        en: '30 seconds to mime it. Everyone else shouts guesses out loud.',
      },
      {
        fr: 'Le groupe vote : mime réussi ou pas ? Si c’est gagné, tu désignes qui a trouvé en premier.',
        en: 'The room votes: did the mime land? If it did, you name whoever guessed first.',
      },
    ],
    scoring: {
      fr: 'Majorité de « oui » → tu prends les points du dé, et le premier à avoir trouvé en gagne autant en bonus.',
      en: 'Majority “yes” → you take the die’s points, and the first correct guesser earns the same as a bonus.',
    },
    tip: {
      fr: 'Le mot est caché aux autres, mais pas la catégorie : ils t’aideront à te faire comprendre.',
      en: 'The word is hidden from the room, but the category isn’t — lean on it to be understood.',
    },
  },
  {
    id: 'all:Pictionary',
    type: 'all',
    emoji: '🎨',
    name: 'Pictionary',
    timer: '60 s',
    tagline: {
      fr: 'Tu dessines sur ton écran, la table regarde et devine.',
      en: 'You draw on your screen, the table watches and guesses.',
    },
    steps: [
      {
        fr: 'Lance le dé pour fixer les points en jeu.',
        en: 'Roll the die to set the points at stake.',
      },
      {
        fr: 'Choisis une de tes catégories ; l’IA te donne un mot à dessiner, visible de toi seul.',
        en: 'Pick one of your categories; the AI hands you a word to draw, visible to you alone.',
      },
      {
        fr: '60 secondes de dessin en direct. Interdit d’écrire des lettres ou des chiffres.',
        en: '60 seconds of live drawing. No letters, no numbers.',
      },
      {
        fr: 'Le groupe vote : mot trouvé ou pas ? Si oui, tu désignes qui a deviné en premier.',
        en: 'The room votes: found or not? If yes, you name whoever guessed first.',
      },
    ],
    scoring: {
      fr: 'Majorité de « oui » → les points du dé pour toi, et autant en bonus pour le premier à avoir trouvé.',
      en: 'Majority “yes” → the die’s points for you, and the same again as a bonus for the first guesser.',
    },
    tip: {
      fr: 'Pose la forme générale d’abord, les détails ensuite. Une minute passe très vite.',
      en: 'Block out the shape first, details after. A minute goes fast.',
    },
  },
  {
    id: 'all:Mot Interdit',
    type: 'all',
    emoji: '🤐',
    name: 'Mot Interdit',
    timer: '90 s',
    tagline: {
      fr: 'Fais deviner un mot… sans jamais prononcer les cinq mots interdits.',
      en: 'Get a word guessed — without ever saying the five banned ones.',
    },
    steps: [
      {
        fr: 'Lance le dé pour fixer les points et la difficulté.',
        en: 'Roll the die to set the points and the difficulty.',
      },
      {
        fr: 'Choisis une de tes catégories. L’IA sort un mot et cinq mots interdits qui l’accompagnent.',
        en: 'Pick one of your categories. The AI produces a word plus five banned words that go with it.',
      },
      {
        fr: '90 secondes pour le décrire à voix haute en contournant les cinq interdits.',
        en: '90 seconds to describe it out loud while dodging all five.',
      },
      {
        fr: 'Tout le monde tape ses propositions. La première bonne réponse arrête la manche net.',
        en: 'Everyone types their guesses. The first correct one ends the round on the spot.',
      },
    ],
    scoring: {
      fr: 'Pas de vote : celui qui trouve et toi marquez chacun les points du dé. Personne ne trouve → zéro partout.',
      en: 'No vote: the finder and you each score the die’s points. Nobody finds it → nobody scores.',
    },
    tip: {
      fr: 'Les mots interdits sont affichés à toute la table. Ils sauront exactement où tu n’as pas le droit d’aller.',
      en: 'The banned words are shown to everyone — they’ll know exactly where you can’t go.',
    },
  },

  // ── TOUT LE MONDE — mêlée ───────────────────────────────────────────────
  {
    id: 'all:Trivia',
    type: 'all',
    emoji: '🎓',
    name: 'Trivia',
    timer: '3 questions',
    tagline: {
      fr: 'Trois questions, toute la table en même temps.',
      en: 'Three questions, the whole table at once.',
    },
    steps: [
      {
        fr: 'Lance le dé : il fixe les points ET la difficulté des questions.',
        en: 'Roll the die: it sets the points AND the difficulty of the questions.',
      },
      {
        fr: 'Choisis une de tes catégories. L’IA génère 3 questions à choix multiple.',
        en: 'Pick one of your categories. The AI generates 3 multiple-choice questions.',
      },
      {
        fr: 'Tout le monde se déclare prêt, puis répond en simultané sur son téléphone.',
        en: 'Everyone marks ready, then answers simultaneously on their own phone.',
      },
      {
        fr: 'Le classement s’affiche dès que la table a fini.',
        en: 'The standings appear as soon as the table is done.',
      },
    ],
    scoring: {
      fr: 'Le meilleur score prend les points du dé. À égalité, le plus rapide passe devant.',
      en: 'The best score takes the die’s points. On a tie, the faster player edges ahead.',
    },
    tip: {
      fr: 'La rapidité ne compte qu’en cas d’égalité : réfléchis, puis réponds.',
      en: 'Speed only matters on a tie — think first, then answer.',
    },
  },
  {
    id: 'all:Sondage Éclair',
    type: 'all',
    emoji: '📊',
    name: 'Sondage Éclair',
    timer: '15 s + 15 s',
    tagline: {
      fr: '« Qui est le plus susceptible de… » Réponds, puis devine ce que la table a répondu.',
      en: '“Who’s most likely to…” Answer it, then guess how the room answered.',
    },
    steps: [
      {
        fr: 'Lance le dé pour fixer les points en jeu.',
        en: 'Roll the die to set the points at stake.',
      },
      {
        fr: 'Une question du type « qui est le plus susceptible de… » s’affiche. 15 secondes pour désigner un joueur.',
        en: 'A “who’s most likely to…” question appears. 15 seconds to name a player.',
      },
      {
        fr: 'Puis 15 secondes de plus pour prédire la réponse la plus choisie par le groupe.',
        en: 'Then 15 more seconds to predict the answer the group picked most.',
      },
      {
        fr: 'Le dépouillement s’affiche en barres.',
        en: 'The results come up as a bar chart.',
      },
    ],
    scoring: {
      fr: 'Points du dé si ta réponse est dans la majorité 🎯, et encore autant si ta prédiction est juste 🔮. Les deux se cumulent.',
      en: 'The die’s points if your answer is in the majority 🎯, and the same again if your prediction lands 🔮. They stack.',
    },
    tip: {
      fr: 'Ta réponse sincère et ta prédiction n’ont aucune obligation d’être la même. C’est justement là qu’est le double.',
      en: 'Your honest answer and your prediction don’t have to match — that gap is where the double lives.',
    },
  },
  {
    id: 'all:Bluff',
    type: 'all',
    emoji: '🎭',
    name: 'Bluff',
    timer: '45 s + 30 s',
    tagline: {
      fr: 'Une vérité perdue au milieu des mensonges de toute la table.',
      en: 'One truth, buried in everyone else’s lies.',
    },
    steps: [
      {
        fr: 'Lance le dé pour fixer les points et la difficulté.',
        en: 'Roll the die to set the points and the difficulty.',
      },
      {
        fr: 'Choisis une catégorie. L’IA écrit une affirmation vraie dont la réponse a été découpée.',
        en: 'Choose a category. The AI writes a true statement with the answer cut out.',
      },
      {
        fr: '45 secondes pour inventer une fausse réponse crédible. Tout le monde écrit, toi compris.',
        en: '45 seconds to invent a believable fake answer. Everyone writes, you included.',
      },
      {
        fr: 'Les fausses réponses et la vraie sont mélangées. 30 secondes pour désigner la vérité.',
        en: 'Fakes and truth are shuffled together. 30 seconds to point at the real one.',
      },
    ],
    scoring: {
      fr: 'Les points du dé pour avoir trouvé la vérité 🎯, et autant pour chaque joueur dupé par ton mensonge 🎭.',
      en: 'The die’s points for finding the truth 🎯, and the same for every player your lie fools 🎭.',
    },
    tip: {
      fr: 'Si tu écris la vraie réponse par accident, tu marques quand même — mais tu ne votes pas ce tour.',
      en: 'Write the true answer by accident and you still score — but you sit the vote out.',
    },
  },
  {
    id: 'all:Le Curseur',
    type: 'all',
    emoji: '🎚️',
    name: 'Le Curseur',
    timer: '45 s',
    tagline: {
      fr: 'Un point secret sur un spectre, un seul mot pour y emmener la table.',
      en: 'A secret point on a spectrum, one single word to steer the room there.',
    },
    steps: [
      {
        fr: 'Lance le dé pour fixer les points en jeu.',
        en: 'Roll the die to set the points at stake.',
      },
      {
        fr: 'Une catégorie devient un spectre à deux extrêmes. Une cible secrète apparaît dessus — toi seul la vois.',
        en: 'A category becomes a spectrum with two poles. A hidden target appears on it — only you see it.',
      },
      {
        fr: 'Donne un seul mot qui se place exactement là sur ce spectre.',
        en: 'Give one single word that sits exactly there on that spectrum.',
      },
      {
        fr: '45 secondes : tous les autres font glisser leur curseur là où ils pensent que ton mot tombe.',
        en: '45 seconds: everyone else drags their slider to where they think your word lands.',
      },
    ],
    scoring: {
      fr: 'À moins de 8 points de la cible → les points du dé en entier. À moins de 20 → la moitié. Au-delà → rien. Toi, tu gagnes la moyenne de ce que ton indice a rapporté aux autres.',
      en: 'Within 8 of the target → the full die value. Within 20 → half. Beyond → nothing. You earn the average of what your clue paid everyone else.',
    },
    tip: {
      fr: 'Un indice trop malin ne parle qu’à toi. Ton score est la moyenne des autres : vise le mot que tout le monde lit pareil.',
      en: 'A too-clever clue only speaks to you. Your score is their average — aim for the word everyone reads the same way.',
    },
  },
  {
    id: 'all:Qui a écrit ça',
    type: 'all',
    emoji: '🕵️',
    name: 'Qui a écrit ça ?',
    timer: '45 s + 60 s',
    tagline: {
      fr: 'Même question pour tous. Reste anonyme, et démasque les autres.',
      en: 'Same question for everyone. Stay anonymous, and unmask the rest.',
    },
    steps: [
      {
        fr: 'Lance le dé pour fixer les points en jeu.',
        en: 'Roll the die to set the points at stake.',
      },
      {
        fr: 'Une question est posée à toute la table. 45 secondes pour y répondre.',
        en: 'One question goes to the whole table. 45 seconds to answer it.',
      },
      {
        fr: 'Jusqu’à 6 réponses sont mises en scène, sans leur auteur.',
        en: 'Up to 6 answers go on show, with no author attached.',
      },
      {
        fr: '60 secondes pour attribuer chaque réponse à quelqu’un. Ta propre réponse ne compte pas.',
        en: '60 seconds to pin each answer on someone. Your own answer doesn’t count.',
      },
    ],
    scoring: {
      fr: 'Les points du dé par auteur correctement démasqué ✅, et autant si personne ne t’a reconnu 🕵️.',
      en: 'The die’s points per author you correctly unmask ✅, and the same again if nobody spotted you 🕵️.',
    },
    tip: {
      fr: 'Écrire comme d’habitude te trahit. Écrire comme quelqu’un d’autre, c’est deux fois payant.',
      en: 'Writing like yourself gives you away. Writing like someone else pays twice.',
    },
  },
  {
    id: 'all:Croquis Croisés',
    type: 'all',
    emoji: '🖍️',
    name: 'Croquis Croisés',
    timer: '60 s + 45 s + 30 s',
    tagline: {
      fr: 'Tout le monde dessine, puis tout le monde ment sur ce que c’est.',
      en: 'Everyone draws, then everyone lies about what it is.',
    },
    steps: [
      {
        fr: 'Lance le dé pour fixer les points en jeu.',
        en: 'Roll the die to set the points at stake.',
      },
      {
        fr: 'Chacun reçoit un mot différent et dispose de 60 secondes pour le dessiner, en même temps que les autres.',
        en: 'Everyone gets a different word and 60 seconds to draw it, all at the same time.',
      },
      {
        fr: 'Jusqu’à 3 dessins passent ensuite un par un. Pour chacun, 45 secondes pour inventer un faux titre.',
        en: 'Then up to 3 drawings go up one at a time. For each, 45 seconds to invent a fake title.',
      },
      {
        fr: 'Faux titres et vrai mot sont mélangés : 30 secondes pour désigner le bon.',
        en: 'Fake titles and the real word are shuffled: 30 seconds to point at the right one.',
      },
    ],
    scoring: {
      fr: 'Trouver le vrai mot rapporte les points du dé — et en rapporte autant à l’artiste. Chaque joueur piégé par ton faux titre te rapporte aussi les points du dé.',
      en: 'Finding the real word pays the die’s points — and pays the artist the same. Every player caught by your fake title pays you the die’s points too.',
    },
    tip: {
      fr: 'Un dessin trop obscur ne rapporte rien à son auteur : tu marques quand on te reconnaît, pas quand on se perd.',
      en: 'An unreadable drawing earns its artist nothing — you score when you’re understood, not when you baffle.',
    },
  },
];
