// Curated content is shared once per round and requires no network request.
export const MISSIONS = [
  {
    scene: { fr: 'Vendez un grille-pain hanté à un client méfiant.', en: 'Sell a haunted toaster to a suspicious customer.' },
    roles: [{ fr: 'Vendeur', en: 'Seller' }, { fr: 'Client', en: 'Customer' }],
    objectives: [
      { fr: 'Fais dire « remboursement » au client sans prononcer ce mot toi-même.', en: 'Make the customer say “refund” without saying that word yourself.' },
      { fr: 'Fais chanter une berceuse au vendeur pour calmer le fantôme.', en: 'Make the seller sing a lullaby to calm the ghost.' },
    ],
  },
  {
    scene: { fr: 'Un astronaute commande dans un restaurant sur la Lune.', en: 'An astronaut orders dinner at a restaurant on the Moon.' },
    roles: [{ fr: 'Astronaute', en: 'Astronaut' }, { fr: 'Serveur', en: 'Waiter' }],
    objectives: [
      { fr: 'Fais dire « fromage » au serveur sans prononcer ce mot toi-même.', en: 'Make the waiter say “cheese” without saying that word yourself.' },
      { fr: 'Fais marcher l’astronaute au ralenti pour tester la gravité.', en: 'Make the astronaut walk in slow motion to test gravity.' },
    ],
  },
  {
    scene: { fr: 'Une star réserve une chambre dans un hôtel pour dragons.', en: 'A celebrity books a room at a hotel for dragons.' },
    roles: [{ fr: 'Star', en: 'Celebrity' }, { fr: 'Réceptionniste', en: 'Receptionist' }],
    objectives: [
      { fr: 'Fais applaudir le réceptionniste à ta prochaine entrée.', en: 'Make the receptionist applaud your next entrance.' },
      { fr: 'Fais dire « je suis un dragon » à la star sans dire cette phrase toi-même.', en: 'Make the celebrity say “I am a dragon” without saying that phrase yourself.' },
    ],
  },
  {
    scene: { fr: 'Un pirate consulte un dentiste pour une dent en or.', en: 'A pirate visits a dentist about a golden tooth.' },
    roles: [{ fr: 'Pirate', en: 'Pirate' }, { fr: 'Dentiste', en: 'Dentist' }],
    objectives: [
      { fr: 'Fais dire « trésor » au dentiste sans prononcer ce mot toi-même.', en: 'Make the dentist say “treasure” without saying that word yourself.' },
      { fr: 'Fais tenir le pirate sur une jambe pendant l’examen.', en: 'Make the pirate stand on one leg during the examination.' },
    ],
  },
];

export const LANE_LABELS = [
  { fr: 'Le refuge', en: 'The hideaway' },
  { fr: 'Le raccourci', en: 'The shortcut' },
  { fr: 'Le jackpot', en: 'The jackpot' },
];

export function makeMemoScene(random = Math.random) {
  return {
    hat: Math.floor(random() * 3), umbrella: Math.floor(random() * 3),
    balloons: 2 + Math.floor(random() * 3), ducks: 1 + Math.floor(random() * 3),
    moon: random() < 0.5, cake: random() < 0.5,
  };
}

export function memoQuestions(scene, lang = 'fr') {
  const en = lang === 'en';
  const colors = en ? ['Pink', 'Yellow', 'Blue'] : ['Rose', 'Jaune', 'Bleu'];
  return [
    { q: en ? 'What color was the penguin’s hat?' : 'De quelle couleur était le chapeau du pingouin ?', options: colors, answer: scene.hat },
    { q: en ? 'How many balloons were there?' : 'Combien y avait-il de ballons ?', options: ['2', '3', '4'], answer: scene.balloons - 2 },
    { q: en ? 'What was floating in the sky?' : 'Qu’est-ce qui flottait dans le ciel ?', options: en ? ['A crescent moon', 'A ringed planet', 'A kite'] : ['Un croissant de lune', 'Une planète à anneaux', 'Un cerf-volant'], answer: scene.moon ? 0 : 1 },
    { q: en ? 'What color was the robot’s umbrella?' : 'De quelle couleur était le parapluie du robot ?', options: colors, answer: scene.umbrella },
    { q: en ? 'How many ducks were on the grass?' : 'Combien de canards étaient sur l’herbe ?', options: ['1', '2', '3'], answer: scene.ducks - 1 },
    { q: en ? 'What was on the picnic table?' : 'Qu’y avait-il sur la table de pique-nique ?', options: en ? ['A cake', 'A fish', 'A teapot'] : ['Un gâteau', 'Un poisson', 'Une théière'], answer: scene.cake ? 0 : 1 },
  ];
}
