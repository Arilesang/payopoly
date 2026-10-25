export const PROMPT_TONES = [
  { fr: 'Safe', en: 'Safe', description: ['Tout public, léger et absurde.', 'Light, absurd and family friendly.'], instruction: 'Family-friendly, playful and absurd. No sexual content, profanity or harsh topics.' },
  { fr: 'Taquin', en: 'Cheeky', description: ['Petites piques et moments gênants.', 'Playful teasing and embarrassing moments.'], instruction: 'Cheeky teasing, social awkwardness and mild embarrassment. No explicit sexual content or strong profanity.' },
  { fr: 'Épicé', en: 'Spicy', description: ['Sous-entendus, satire et humour mordant.', 'Innuendo, satire and biting humour.'], instruction: 'Spicy adult innuendo, dating mishaps, political satire and biting humour. Mild profanity is welcome.' },
  { fr: 'Risqué', en: 'Risqué', description: ['Sexe, politique, vulgarité et humour noir.', 'Sex, politics, profanity and dark humour.'], instruction: 'Bold adult party humour. Sexual jokes about consenting adults, political satire, vulgar language and dark humour are all welcome. Vary the topic rather than always making sexual jokes. Make it funny and open-ended. Avoid sexual content involving minors, sexual violence, or dehumanizing attacks on protected groups.' },
];

export const validPromptTone = tone => Number.isInteger(tone) && tone >= 0 && tone < PROMPT_TONES.length;

// Category-aware backups keep both the selected topic and tone during an outage.
export function fallbackPartyPrompt(name, language, category, tone = 0, random = Math.random) {
  const en = language === 'en';
  const topic = typeof category === 'string' && category.trim() ? category.trim().slice(0, 55) : en ? 'parties' : 'les soirées';
  const level = validPromptTone(tone) ? tone : 0;
  const punchlines = en ? [
    [`My useless superpower related to “${topic}”: ___.`, `The worst slogan for a “${topic}” museum: ___.`],
    [`My embarrassing secret about “${topic}”: ___.`, `My terrible excuse for knowing nothing about “${topic}”: ___.`],
    [`My dating profile for fans of “${topic}”: ___.`, `A politician's terrible promise about “${topic}”: ___.`],
    [`“${topic}” ruined my sex life because ___.`, `The biggest bullshit election promise about “${topic}”: ___.`],
  ] : [
    [`Mon super-pouvoir inutile lié à « ${topic} » : ___.`, `Le pire slogan d'un musée sur « ${topic} » : ___.`],
    [`Mon secret gênant sur « ${topic} » : ___.`, `Mon excuse bidon pour ne rien connaître à « ${topic} » : ___.`],
    [`Ma bio de drague pour les fans de « ${topic} » : ___.`, `La promesse électorale ridicule sur « ${topic} » : ___.`],
    [`« ${topic} » a ruiné ma vie sexuelle parce que ___.`, `La promesse électorale la plus con sur « ${topic} » : ___.`],
  ];
  const surveys = en ? [
    [`start a club about “${topic}”`, `know the most useless facts about “${topic}”`],
    [`pretend to be an expert on “${topic}” to impress someone`, `embarrass themselves on TV talking about “${topic}”`],
    [`use “${topic}” as a terrible pickup line`, `start a political argument about “${topic}” on a first date`],
    [`bring up “${topic}” in the middle of sex`, `talk absolute bullshit about “${topic}” to win an election`],
  ] : [
    [`créer un club sur « ${topic} »`, `connaître le plus d'anecdotes inutiles sur « ${topic} »`],
    [`se prétendre expert en « ${topic} » pour impressionner quelqu'un`, `se ridiculiser à la télé en parlant de « ${topic} »`],
    [`utiliser « ${topic} » comme technique de drague ratée`, `lancer un débat politique sur « ${topic} » au premier rendez-vous`],
    [`parler de « ${topic} » en plein rapport sexuel`, `raconter de la merde sur « ${topic} » pour gagner une élection`],
  ];
  const bank = (name === 'Punchline' ? punchlines : surveys)[level];
  return { prompt: bank[Math.floor(random() * bank.length)] };
}
