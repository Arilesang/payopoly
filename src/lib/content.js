import { validPrompt } from './promptSelection.js';
import { fallbackPartyPrompt } from './promptTone.js';

// Curated bilingual backups keep the party playable during API outages.
const BANK = {
  en: {
    words: ['PENGUIN', 'BICYCLE', 'UMBRELLA', 'ROBOT', 'CASTLE', 'VOLCANO', 'GUITAR', 'ELEPHANT'],
    trivia: [
      { q: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], answer: 1 },
      { q: 'How many sides does a hexagon have?', options: ['Five', 'Eight', 'Six', 'Seven'], answer: 2 },
      { q: 'Which animal is a mammal?', options: ['Shark', 'Frog', 'Penguin', 'Dolphin'], answer: 3 },
      { q: 'Which instrument usually has 88 keys?', options: ['Guitar', 'Piano', 'Flute', 'Violin'], answer: 1 },
      { q: 'Which ocean is the largest?', options: ['Atlantic', 'Arctic', 'Indian', 'Pacific'], answer: 3 },
      { q: 'What do bees make?', options: ['Honey', 'Milk', 'Silk', 'Salt'], answer: 0 },
    ],
    taboo: { word: 'UMBRELLA', forbidden: ['RAIN', 'WET', 'HANDLE', 'OPEN', 'WEATHER'] },
    punchlines: ['The worst name for a superhero is ___.', 'My robot has one useless talent: ___.', 'The museum just opened an exhibition about ___.'],
    prompts: ['What would your personal theme song be?', 'Describe your dream holiday in three words.', 'What useless superpower would you choose?'],
    bluff: { prompt: 'The only mammals capable of powered flight are ___.', answer: 'BATS' },
    spectrum: { left: 'boring', right: 'exciting' },
    rhymes: { seed: 'LIGHT', valid: ['NIGHT', 'BRIGHT', 'RIGHT', 'SIGHT', 'FLIGHT', 'FIGHT', 'MIGHT', 'TIGHT', 'WHITE', 'BITE', 'KITE', 'WRITE', 'HEIGHT', 'SITE', 'SLIGHT', 'DELIGHT', 'FRIGHT'] },
  },
  fr: {
    words: ['PINGOUIN', 'VÉLO', 'PARAPLUIE', 'ROBOT', 'CHÂTEAU', 'VOLCAN', 'GUITARE', 'ÉLÉPHANT'],
    trivia: [
      { q: 'Quelle planète est surnommée la planète rouge ?', options: ['Vénus', 'Mars', 'Jupiter', 'Saturne'], answer: 1 },
      { q: 'Combien de côtés a un hexagone ?', options: ['Cinq', 'Huit', 'Six', 'Sept'], answer: 2 },
      { q: 'Quel animal est un mammifère ?', options: ['Requin', 'Grenouille', 'Pingouin', 'Dauphin'], answer: 3 },
      { q: 'Quel instrument possède généralement 88 touches ?', options: ['Guitare', 'Piano', 'Flûte', 'Violon'], answer: 1 },
      { q: 'Quel océan est le plus grand ?', options: ['Atlantique', 'Arctique', 'Indien', 'Pacifique'], answer: 3 },
      { q: 'Que fabriquent les abeilles ?', options: ['Miel', 'Lait', 'Soie', 'Sel'], answer: 0 },
    ],
    taboo: { word: 'PARAPLUIE', forbidden: ['PLUIE', 'MOUILLÉ', 'MANCHE', 'OUVRIR', 'MÉTÉO'] },
    punchlines: ['Le pire nom pour un super-héros est ___.', 'Mon robot a un talent inutile : ___.', 'Le musée vient de lancer une exposition sur ___.'],
    prompts: ['Quelle serait ta chanson personnelle ?', 'Décris tes vacances de rêve en trois mots.', 'Quel super-pouvoir inutile choisirais-tu ?'],
    bluff: { prompt: 'Les seuls mammifères capables de voler activement sont les ___.', answer: 'CHAUVES-SOURIS' },
    spectrum: { left: 'ennuyeux', right: 'passionnant' },
    rhymes: { seed: 'CHÂTEAU', valid: ['BATEAU', 'GÂTEAU', 'CADEAU', 'MANTEAU', 'RIDEAU', 'MARTEAU', 'PLATEAU', 'RÂTEAU', 'CHAPEAU', 'DRAPEAU', 'COUTEAU', 'POTEAU', 'PANNEAU', 'TROUPEAU', 'MOINEAU', 'CORBEAU', 'BUREAU'] },
  },
};
export function fallbackContent(endpoint, lang = 'fr', random = Math.random, options = {}) {
  const b = BANK[lang] ?? BANK.fr;
  const pick = arr => arr[Math.floor(random() * arr.length)];
  const word = pick(b.words);
  switch (endpoint.split('/').pop()) {
    case 'trivia': return { questions: [...b.trivia].sort(() => random() - 0.5).slice(0, 3) };
    case 'mime-word': case 'pictionary-word': return { word };
    case 'jumble': return { original: word, jumbled: [...word].reverse().join('') };
    case 'taboo': return b.taboo;
    case 'punchline': return options.category ? fallbackPartyPrompt('Punchline', lang, options.category, options.tone, random) : { prompt: pick(b.punchlines) };
    case 'survey': return fallbackPartyPrompt('Sondage Éclair', lang, options.category, options.tone, random);
    case 'prompt': return { prompt: pick(b.prompts) };
    case 'bluff': return b.bluff;
    case 'spectrum': return b.spectrum;
    case 'rhymes': return b.rhymes;
    default: throw new Error('Unknown content type');
  }
}
export function validContent(endpoint, d) {
  const text = s => typeof s === 'string' && s.trim().length > 0 && s.length <= 500;
  const words = a => Array.isArray(a) && a.every(text);
  if (!d || typeof d !== 'object') return false;
  switch (endpoint.split('/').pop()) {
    case 'trivia': return Array.isArray(d.questions) && d.questions.length === 3 && d.questions.every(q => text(q.q) && words(q.options) && q.options.length === 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
    case 'jumble': return text(d.original) && text(d.jumbled) && d.original !== d.jumbled && [...d.original].sort().join('') === [...d.jumbled].sort().join('');
    case 'taboo': return text(d.word) && words(d.forbidden) && d.forbidden.length === 5;
    case 'bluff': return text(d.prompt) && d.prompt.includes('___') && text(d.answer);
    case 'punchline': return validPrompt('Punchline', d.prompt);
    case 'survey': return validPrompt('Sondage Éclair', d.prompt);
    case 'prompt': return text(d.prompt);
    case 'spectrum': return text(d.left) && text(d.right) && d.left !== d.right;
    case 'rhymes': return text(d.seed) && words(d.valid) && d.valid.length >= 15;
    default: return text(d.word);
  }
}
export async function requestContent(endpoint, body, { language = 'fr', timeout = 12000, fetcher = fetch } = {}) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeout);
  try {
    const response = await fetcher(endpoint, { ...body, body: JSON.stringify({ ...JSON.parse(body.body ?? '{}'), language }), signal: abort.signal });
    if (!response.ok) throw new Error('Content unavailable');
    const data = await response.json();
    if (!validContent(endpoint, data)) throw new Error('Invalid content');
    return { ...data, fallback: Boolean(data.fallback) };
  } catch {
    let options = {};
    try { options = JSON.parse(body.body ?? '{}'); } catch { /* Use the default backup for malformed options. */ }
    return { ...fallbackContent(endpoint, language, Math.random, options), fallback: true };
  } finally { clearTimeout(timer); }
}
