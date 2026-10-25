// Player-facing rules for every minigame on the wheel.
//
// Kept as one bilingual module rather than split across i18n/fr.js + i18n/en.js:
// each entry is a dozen strings that only make sense next to each other, and
// side-by-side fields are the only way a translation drift stays visible.
//
// `id` matches the keys in gameConfig.js / minigames/index.jsx, so the minimum
// player count is read from MINIGAME_META instead of being retyped here.

export const MINIGAME_RULES = [
{
  "id": "duel:Choix Unique",
  "type": "duel",
  "emoji": "💎",
  "name": "Choix Unique",
  "timer": "40 s",
  "tagline": {
    "fr": "Deux choix cachés. Évite la collision et vise la meilleure récompense.",
    "en": "Two hidden picks. Avoid a collision and aim for the bigger reward."
  },
  "explanation": {
    "fr": "Seuls les deux duellistes choisissent une voie. S’ils prennent la même, ils se bloquent et ne marquent rien. S’ils prennent deux voies différentes, chacun reçoit la récompense de sa voie, et celui qui gagne le plus remporte le duel. Les spectateurs peuvent pronostiquer le vainqueur avant les choix.",
    "en": "Only the two duellists pick a lane. If they choose the same one, they collide and score nothing. If they pick different lanes, each earns their lane’s reward and the bigger reward wins the duel. Spectators can predict the winner before picks begin."
  },
  "steps": [
    {
      "fr": "Lance le dé pour fixer les récompenses.",
      "en": "Roll the die to set the rewards."
    },
    {
      "fr": "Les deux duellistes ont 40 secondes pour choisir une voie en secret.",
      "en": "Both duellists have 40 seconds to pick a lane secretly."
    },
    {
      "fr": "Refuge : 50 % du dé. Raccourci : 75 %. Jackpot : 100 %. Un choix validé est définitif.",
      "en": "Hideaway: 50% of the die. Shortcut: 75%. Jackpot: 100%. Submitted picks are final."
    },
    {
      "fr": "Révélez ensemble les choix : une collision annule les deux récompenses ; sinon la plus grande récompense gagne le duel.",
      "en": "Reveal the picks together: a collision cancels both rewards; otherwise the bigger reward wins the duel."
    }
  ],
  "scoring": {
    "fr": "Chaque joueur seul dans sa voie gagne sa récompense. Le meilleur gain positif remporte le duel. Collision ou absence de choix : zéro.",
    "en": "Each player alone in their lane earns its reward. The highest positive reward wins the duel. Collision or no pick: zero."
  },
  "tip": {
    "fr": "Choisir le jackpot garantit seulement que ton adversaire peut te bloquer.",
    "en": "Picking the jackpot only guarantees that your opponent can block you."
  }
},
{
  "id": "duel:Code Commun",
  "type": "duel",
  "emoji": "🔐",
  "name": "Code Commun",
  "timer": "65 s",
  "tagline": {
    "fr": "Deux capitaines, deux équipes : qui ouvrira le coffre en premier ?",
    "en": "Two captains, two teams: who will open the vault first?"
  },
  "explanation": {
    "fr": "Chaque duelliste dirige une équipe ; les autres joueurs sont répartis entre les deux. Les équipes cherchent le même code et disposent chacune de tous les indices, répartis sur les téléphones de leurs membres. Partagez vos indices avec votre capitaine : lui seul peut saisir une réponse. À deux joueurs, chaque capitaine résout seul ses indices.",
    "en": "Each duellist leads a team; the other players are split between the two. Both teams seek the same code and each has a complete set of clues, distributed across its members’ phones. Share your clues with your captain: only the captain can submit a guess. With two players, each captain solves their own clues alone."
  },
  "steps": [
    {
      "fr": "Lance le dé pour fixer la récompense de chaque membre de l’équipe gagnante.",
      "en": "Roll the die to set each winning teammate’s reward."
    },
    {
      "fr": "Chaque joueur reçoit ses indices privés et le nom de son capitaine. Vous avez 65 secondes.",
      "en": "Every player receives private clues and their captain’s name. You have 65 seconds."
    },
    {
      "fr": "Communiquez les positions et les chiffres à votre capitaine. Chaque équipe dispose de trois essais distincts.",
      "en": "Share positions and digits with your captain. Each team has three separate attempts."
    },
    {
      "fr": "Le premier capitaine qui saisit le bon code gagne immédiatement. Les essais de l’autre équipe restent cachés.",
      "en": "The first captain to enter the correct code wins immediately. The opposing team’s guesses stay hidden."
    }
  ],
  "scoring": {
    "fr": "Chaque membre de l’équipe gagnante gagne le dé. Son capitaine remporte le duel. Aucun code trouvé avant la fin : aucun point.",
    "en": "Every member of the winning team earns the die value. Their captain wins the duel. No code found before time runs out: no points."
  },
  "tip": {
    "fr": "Annonce la position avant le chiffre, et n’oublie pas les zéros en début de code.",
    "en": "Say the position before the digit, and keep leading zeros in the code."
  }
},
{
  "id": "duel:Mémo Flash",
  "type": "duel",
  "emoji": "🧠",
  "name": "Mémo Flash",
  "timer": "15 s + 25 s",
  "tagline": {
    "fr": "La même image, deux mémoires : qui se souvient le mieux ?",
    "en": "The same picture, two memories: who remembers more?"
  },
  "explanation": {
    "fr": "Les deux duellistes observent exactement la même scène pendant quinze secondes. L’image disparaît, puis chacun répond aux trois mêmes questions en vingt-cinq secondes. Le nombre de bonnes réponses décide du duel ; la rapidité ne départage pas les égalités. Les spectateurs observent et peuvent pronostiquer avant l’étude de l’image.",
    "en": "Both duellists study exactly the same scene for fifteen seconds. The picture disappears, then each answers the same three questions within twenty-five seconds. The number of correct answers decides the duel; speed does not break ties. Spectators watch and can predict before the study period."
  },
  "steps": [
    {
      "fr": "Lance le dé pour fixer les points en jeu.",
      "en": "Roll the die to set the stakes."
    },
    {
      "fr": "Observez la scène illustrée pendant 15 secondes. Repérez les couleurs, objets et quantités.",
      "en": "Study the illustrated scene for 15 seconds. Notice colors, objects and quantities."
    },
    {
      "fr": "Sans revoir l’image, les deux duellistes répondent en secret à trois questions et valident leurs réponses en 25 secondes.",
      "en": "Without seeing the picture again, both duellists secretly answer three questions and submit within 25 seconds."
    },
    {
      "fr": "Révélez les réponses et comparez les scores. Le meilleur score positif gagne ; les ex æquo partagent le dé.",
      "en": "Reveal answers and compare scores. The highest positive score wins; tied leaders split the die."
    }
  ],
  "scoring": {
    "fr": "Le meilleur score positif gagne le dé. Égalité positive : moitié du dé chacun. Zéro bonne réponse ou réponses non validées : aucun point.",
    "en": "The highest positive score wins the die. A positive tie pays half the die each. Zero correct answers or no submitted answers earns nothing."
  },
  "tip": {
    "fr": "Le nombre de bonnes réponses compte, pas la vitesse : observe et réfléchis.",
    "en": "Correct answers matter, not speed: observe and think."
  }
},
{
  "id": "all:Choix Unique",
  "type": "all",
  "emoji": "💎",
  "name": "Choix Unique",
  "timer": "40 s",
  "explanation": {
    "fr": "Tout le monde choisit une voie sur son téléphone, sans voir les choix des autres. Une voie rapporte uniquement si elle contient un seul joueur. Le dé fixe les trois récompenses : la moitié au refuge, les trois quarts au raccourci, et la totalité au jackpot.",
    "en": "Everyone chooses a lane on their phone without seeing the other picks. A lane pays only when exactly one player chose it. The die sets the three rewards: half for the hideaway, three quarters for the shortcut, and the full value for the jackpot."
  },
  "tagline": {
    "fr": "Une voie, une récompense : seul, tu gagnes ; à plusieurs, tout disparaît.",
    "en": "One lane, one reward: alone you win; together you collide."
  },
  "steps": [
    {
      "fr": "Lance le dé pour fixer la récompense maximale.",
      "en": "Roll the die to set the maximum reward."
    },
    {
      "fr": "Tout le monde choisit en secret une des trois voies en 40 secondes.",
      "en": "Everyone secretly picks one of three lanes within 40 seconds."
    },
    {
      "fr": "Les voies valent 50 %, 75 % ou 100 % du dé. Ton choix est définitif.",
      "en": "Lanes pay 50%, 75% or 100% of the die value. Your pick is final."
    },
    {
      "fr": "Les choix sont révélés quand tout le monde a choisi ou à la fin du temps. Seuls les joueurs seuls dans leur voie marquent.",
      "en": "Picks are revealed when everyone has chosen or time runs out. Only players alone in their lane score."
    }
  ],
  "scoring": {
    "fr": "Une voie occupée par un seul joueur rapporte sa récompense. Collision ou absence de choix : zéro.",
    "en": "A lane with one player pays its reward. Collisions and missing picks score zero."
  },
  "tip": {
    "fr": "Le jackpot attire les foules. Ose une voie plus discrète.",
    "en": "The jackpot draws a crowd. Try a quieter lane."
  }
},
{
  "id": "duel:Mission Impossible",
  "type": "duel",
  "emoji": "🎭",
  "name": "Mission Impossible",
  "timer": "15 s + 45 s + 15 s",
  "explanation": {
    "fr": "Le challenger et son adversaire improvisent la même scène à voix haute. Chacun reçoit un rôle et un objectif que les autres ne voient pas : provoquer un mot, un geste ou une réaction chez son partenaire. Après la scène, les objectifs sont révélés et les spectateurs jugent séparément chaque mission. Il faut donc au moins trois joueurs.",
    "en": "The challenger and opponent improvise the same scene aloud. Each receives a role and an objective hidden from the others: prompt a word, gesture or reaction from their partner. After the scene, the objectives are revealed and spectators judge each mission separately. At least three players are required."
  },
  "tagline": {
    "fr": "Deux acteurs dans une scène absurde, chacun avec une mission secrète.",
    "en": "Two actors in an absurd scene, each with a secret mission."
  },
  "steps": [
    {
      "fr": "Lance le dé pour fixer les points. Il faut deux acteurs et au moins un spectateur.",
      "en": "Roll the die to set the stakes. You need two actors and at least one spectator."
    },
    {
      "fr": "Chaque acteur découvre son rôle et sa mission privée. La préparation dure au maximum 15 secondes.",
      "en": "Each actor reads their role and private mission. Preparation lasts at most 15 seconds."
    },
    {
      "fr": "Improvisez ensemble à voix haute pendant 45 secondes. Réussissez vos objectifs sans les annoncer.",
      "en": "Improvise together aloud for 45 seconds. Complete your objectives without announcing them."
    },
    {
      "fr": "Les missions sont révélées. Le public a 15 secondes pour valider chacune en secret.",
      "en": "The missions are revealed. The audience has 15 seconds to judge each one in secret."
    }
  ],
  "scoring": {
    "fr": "Une majorité stricte de oui valide la mission. Un seul succès gagne le dé ; deux succès partagent le dé ; aucun succès ou aucun vote ne rapporte rien.",
    "en": "A strict yes majority confirms a mission. One success wins the die; two successes split it; no successes or no votes pay nothing."
  },
  "tip": {
    "fr": "Écoute ton partenaire : sa réaction peut être la clé de ta mission.",
    "en": "Listen to your partner: their reaction might be the key to your mission."
  }
},
{
  "id": "all:Code Commun",
  "type": "all",
  "emoji": "🔐",
  "name": "Code Commun",
  "timer": "65 s",
  "explanation": {
    "fr": "Tous les joueurs forment une seule équipe. Les chiffres du code sont répartis en indices privés : personne ne voit les indices des autres. Annoncez les positions et résolvez les petites énigmes pour reconstituer le code complet. N’importe qui peut saisir la réponse, mais les trois essais sont partagés par toute la table.",
    "en": "Everyone forms one team. The code’s digits are distributed as private clues: nobody sees another player’s clues. Share the positions and solve the small puzzles to reconstruct the complete code. Anyone can enter the answer, but the whole table shares three attempts."
  },
  "tagline": {
    "fr": "Chacun détient un indice différent. Un seul code ouvre le coffre pour tous.",
    "en": "Everyone holds a different clue. One code unlocks the vault for everyone."
  },
  "steps": [
    {
      "fr": "Lance le dé pour fixer les points de chaque joueur.",
      "en": "Roll the die to set each player’s reward."
    },
    {
      "fr": "Chacun reçoit une partie des indices sur son téléphone. Vous avez 65 secondes.",
      "en": "Everyone receives part of the clues on their phone. You have 65 seconds."
    },
    {
      "fr": "Échangez vos indices à voix haute pour reconstruire le code dans l’ordre. Les positions commencent à 1.",
      "en": "Share your clues aloud to reconstruct the code in order. Positions start at 1."
    },
    {
      "fr": "N’importe qui peut saisir le code du groupe. Vous partagez trois essais, et un seul succès suffit.",
      "en": "Anyone can enter the group’s code. You share three attempts, and one success is enough."
    }
  ],
  "scoring": {
    "fr": "Code trouvé : chaque participant gagne le dé. Trois erreurs ou temps écoulé : aucun point.",
    "en": "Crack the code: every participant earns the die value. Three mistakes or time running out: no points."
  },
  "tip": {
    "fr": "Annonce bien la position et garde les zéros au début du code.",
    "en": "Say the position clearly and keep leading zeros in the code."
  }
},
{
  "id": "all:Mémo Flash",
  "type": "all",
  "emoji": "🧠",
  "name": "Mémo Flash",
  "timer": "15 s + 25 s",
  "explanation": {
    "fr": "Tous les téléphones montrent la même illustration absurde pendant quinze secondes. Ensuite, l’image est retirée et chacun répond à trois questions sur ses couleurs, objets ou quantités. Les souvenirs sont validés en secret ; l’image et les bonnes réponses reviennent seulement au résultat.",
    "en": "Every phone shows the same absurd illustration for fifteen seconds. Then the picture disappears and everyone answers three questions about its colors, objects or quantities. Memories are submitted secretly; the picture and correct answers return only with the results."
  },
  "tagline": {
    "fr": "Un pique-nique impossible. Quinze secondes pour tout voir, puis place aux souvenirs.",
    "en": "An impossible picnic. Fifteen seconds to see it all, then trust your memory."
  },
  "steps": [
    {
      "fr": "Lance le dé pour fixer la récompense maximale.",
      "en": "Roll the die to set the maximum reward."
    },
    {
      "fr": "Observez la même scène illustrée pendant 15 secondes. Couleurs, objets et quantités changent à chaque tour.",
      "en": "Study the same illustrated scene for 15 seconds. Colors, objects and quantities vary each round."
    },
    {
      "fr": "L’image disparaît : répondez à trois questions visuelles en 25 secondes.",
      "en": "The picture disappears: answer three visual questions in 25 seconds."
    },
    {
      "fr": "Validez vos trois réponses en secret, puis découvrez l’image et les bonnes réponses.",
      "en": "Lock in your three answers secretly, then see the picture and the correct answers."
    }
  ],
  "scoring": {
    "fr": "Chaque bonne réponse rapporte un tiers du dé. Sans réponses validées : zéro.",
    "en": "Each correct answer earns one third of the die value. No submitted answers: zero."
  },
  "tip": {
    "fr": "Ne fixe pas seulement les personnages : compte aussi les petits détails.",
    "en": "Look beyond the characters: count the small details too."
  }
},
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
        fr: '30 secondes : clique sur chaque catégorie et écris un mot commençant par la lettre tirée. Les spectateurs voient tes réponses en direct.',
        en: '30 seconds: click each category and type a word starting with the selected letter. Spectators see your answers live.',
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
      fr: 'Deux joueurs, la même lettre, sept catégories. Vote anonyme.',
      en: 'Two players, one letter, seven categories. An anonymous vote.',
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
        fr: '30 secondes : chacun clique sur les catégories pour écrire ses mots. Les spectateurs voient les deux ensembles anonymes en direct.',
        en: '30 seconds: each player clicks the categories to type their words. Spectators see both anonymous sets live.',
      },
      {
        fr: 'Tout le monde vote pour le meilleur ensemble anonyme de réponses, sauf le sien. Les auteurs sont révélés au résultat.',
        en: 'Everyone votes for the best anonymous set of answers, except their own. Authors are revealed with the results.',
      },
    ],
    scoring: {
      fr: 'Le duelliste qui récolte le plus de voix empoche les points du dé.',
      en: 'The duellist with the most votes takes the die’s points.',
    },
    tip: {
      fr: 'Tu peux modifier tes mots jusqu’à la fin du chrono. Tu ne vois pas les réponses de ton adversaire pendant la saisie.',
      en: 'You can edit your words until time runs out. Your opponent’s answers stay hidden from you while typing.',
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
        fr: 'Choisis ton adversaire ; le dé fixera les points après le verrouillage de la phrase.',
        en: 'Pick your opponent; the die will set the points after the prompt is locked.',
      },
      {
        fr: 'Un spectateur tiré au sort choisit un exemple, génère une phrase selon sa catégorie et l’intensité Safe → Risqué, ou écrit sa phrase avec un seul blanc. Il verrouille son choix, puis le dé est lancé. Après 90 secondes sans choix, l’exemple est utilisé.',
        en: 'A random spectator chooses an example, generates a prompt using their category and Safe → Risqué intensity, or writes one with a single blank. They lock it in, then the die is rolled. After 90 seconds without a choice, the example is used.',
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
        fr: 'Le joueur qui déclenche le duel choisit une de ses catégories. Un mot de départ lié à cette catégorie est révélé aux deux duellistes.',
        en: 'The challenger chooses one of their categories. A seed word related to that category is revealed to both duellists.',
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
        fr: '60 secondes de dessin en direct. Interdit d’écrire des lettres ou des chiffres. Si quelqu’un trouve, termine le dessin pour passer au vote.',
        en: '60 seconds of live drawing. No letters, no numbers. If someone guesses, finish drawing to move straight to the vote.',
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
        fr: 'Les autres tapent leurs propositions. À la première bonne réponse, les mots sont révélés et les autres votent pour confirmer que tu as respecté les interdits.',
        en: 'The others type their guesses. After the first correct answer, the words are revealed and the listeners vote to confirm you avoided the forbidden words.',
      },
    ],
    scoring: {
      fr: 'Plus de oui que de non → celui qui trouve et toi marquez chacun les points du dé. Manche refusée, égalité ou aucun vote → zéro partout.',
      en: 'More yes than no → the finder and you each score the die’s points. Rejection, a tie or no votes → nobody scores.',
    },
    tip: {
      fr: 'Toi seul vois le mot et les mots interdits pendant la manche. Les autres les découvrent à la fin pour juger ta description.',
      en: 'Only you see the target and forbidden words during the round. The others discover them afterward to judge your description.',
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
        fr: 'Le joueur qui a déclenché le jeu choisit un exemple, génère une question selon sa catégorie et l’intensité Safe → Risqué, ou écrit sa question « Qui est le plus susceptible de… ». Il verrouille son choix avant le dé. Après 90 secondes sans choix, l’exemple est utilisé.',
        en: 'The player who triggered the game chooses an example, generates a question using their category and Safe → Risqué intensity, or writes a “Who is most likely to…” question. They lock it before the die roll. After 90 seconds without a choice, the example is used.',
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
