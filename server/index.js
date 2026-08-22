import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually (no dotenv dep needed)
try {
  const env = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
  env.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
} catch {}

const app = express();
app.use(cors());
app.use(express.json());

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-haiku-4-5';

function extractJSON(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

// One Claude call returning parsed JSON. Every endpoint below is a prompt plus
// a token budget — this keeps the error handling and fence-stripping in one place.
async function askJSON(prompt, maxTokens = 512) {
  const msg = await ai.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return JSON.parse(extractJSON(msg.content[0].text));
}

// Wraps a handler so a thrown error becomes the same 500 shape everywhere.
function endpoint(name, build, maxTokens, shape = json => json) {
  return async (req, res) => {
    try {
      res.json(shape(await askJSON(build(req.body), maxTokens)));
    } catch (err) {
      console.error(`${name} error:`, err.message);
      res.status(500).json({ error: err.message });
    }
  };
}

// ── Trivia: 3 MCQ questions ─────────────────────────────────────────────────
app.post('/api/trivia', endpoint('Trivia', ({ category, difficulty }) =>
  `Generate exactly 3 multiple choice trivia questions about the category "${category}" at difficulty level ${difficulty}/6 (1=very easy, 6=very hard). Questions should be in French.

Return ONLY valid JSON, no extra text:
[
  { "q": "Question text?", "options": ["A", "B", "C", "D"], "answer": 0 },
  { "q": "Question text?", "options": ["A", "B", "C", "D"], "answer": 2 },
  { "q": "Question text?", "options": ["A", "B", "C", "D"], "answer": 1 }
]

"answer" is the index (0-3) of the correct option. Make sure questions are interesting and appropriate for a party game.`,
  1024, json => ({ questions: json })));

// ── Mimes: a word to act out ────────────────────────────────────────────────
app.post('/api/mime-word', endpoint('Mime word', ({ category }) =>
  `Pick one French word or very short phrase that is concrete and fun to act out in a party mime game, related to the category "${category}".

Return ONLY valid JSON, no extra text: { "word": "MOT" }

The word must be uppercase. Favour physical, visual concepts (animals, actions, objects, sports) over abstract ideas.`,
  128));

// ── Pictionary: a word to draw ──────────────────────────────────────────────
app.post('/api/pictionary-word', endpoint('Pictionary word', ({ category, difficulty }) =>
  `Pick one French word or very short phrase (2 words max) that is fun and possible to draw in a party Pictionary game, related to the category "${category}" at difficulty level ${difficulty}/6 (1=very simple common object, 6=abstract or complex concept).

Return ONLY valid JSON, no extra text: { "word": "MOT" }

The word must be uppercase. Favour concrete, drawable things: objects, animals, actions, places, characters. Avoid very abstract words at low difficulty.`,
  128));

// ── Mot Melangés: a jumbled word ────────────────────────────────────────────
app.post('/api/jumble', endpoint('Jumble', ({ category, difficulty }) =>
  `Pick one French word related to the category "${category}" appropriate for difficulty level ${difficulty}/6 (1=very common short word, 6=rare long word). Jumble its letters randomly (the jumbled version must be different from the original).

Return ONLY valid JSON, no extra text:
{ "original": "MOTORIGINAL", "jumbled": "MOTMELANGE" }

Both must be uppercase. The jumbled word must have the exact same letters in a different order.`,
  256));

// ── Mot Interdit: a word plus five words you may not say ────────────────────
app.post('/api/taboo', endpoint('Taboo', ({ category, difficulty }) =>
  `Pick one French word related to the category "${category}" at difficulty level ${difficulty}/6 (1=very common, 6=rare or abstract), for a party game of Taboo. Then list the 5 French words a player would most obviously reach for when describing it — those become forbidden.

Return ONLY valid JSON, no extra text:
{ "word": "CANARD", "forbidden": ["OISEAU", "COIN", "MARE", "BEC", "PLUMES"] }

All uppercase. The word must be a single common noun, guessable by describing it out loud. None of the forbidden words may contain the answer itself.`,
  256));

// ── Punchline: a fill-in-the-blank setup ────────────────────────────────────
app.post('/api/punchline', endpoint('Punchline', ({ category }) =>
  `Write one funny fill-in-the-blank prompt in French for a party game, themed around the category "${category}". Players compete to write the funniest completion.

Return ONLY valid JSON, no extra text:
{ "prompt": "Le pire titre possible pour une suite de Titanic, c'est ___" }

Rules: exactly one blank, written as three underscores. Keep it under 100 characters. Make it playful and open-ended so wildly different answers are all funny. Nothing sexual, nothing cruel about real people.`,
  256));

// ── Qui a écrit ça: a short personal prompt ─────────────────────────────────
app.post('/api/prompt', endpoint('Prompt', ({ category }) =>
  `Write one short personal question in French for a party game, themed around the category "${category}". Everyone in the room answers it, then players try to guess who wrote which answer — so it should invite answers that reveal something about the person.

Return ONLY valid JSON, no extra text:
{ "prompt": "Décris ta pire tenue d'adolescent en trois mots." }

Keep it under 90 characters, warm and funny rather than probing. Nothing that could embarrass someone in front of friends.`,
  256));

// ── Bluff: a true statement with the answer removed ─────────────────────────
app.post('/api/bluff', endpoint('Bluff', ({ category, difficulty }) =>
  `Write one surprising but TRUE statement in French about the category "${category}", with one key word or short phrase replaced by a blank. Difficulty ${difficulty}/6 (1=most people could guess it, 6=almost nobody knows).

Return ONLY valid JSON, no extra text:
{ "prompt": "Le seul mammifère capable de voler est le ___.", "answer": "CHAUVE-SOURIS" }

Rules: the statement must be factually true and verifiable — this is the answer players hunt for among fake answers, so a wrong fact breaks the round. Exactly one blank, written as three underscores. The answer must be short (1-3 words), uppercase, and specific enough that a player could plausibly invent a competing fake.`,
  512));

// ── Le Curseur: turn a category into a spectrum ─────────────────────────────
app.post('/api/spectrum', endpoint('Spectrum', ({ category }) =>
  `Turn the category "${category}" into a spectrum between two opposite qualities, in French, for a party guessing game. One player gets a hidden point on the line and gives a one-word clue; everyone else guesses where.

Return ONLY valid JSON, no extra text:
{ "left": "mignon", "right": "terrifiant" }

Rules: both poles must be single French adjectives or very short phrases, genuinely opposite, and subjective enough that reasonable people would place things differently. Avoid factual scales (size, price, date) — the fun is in disagreement.`,
  256));

// ── Rimes Rapides: a seed word plus everything that rhymes with it ──────────
app.post('/api/rhymes', endpoint('Rhymes', ({ category, difficulty }) =>
  `Pick one French word related to the category "${category}" at difficulty ${difficulty}/6 (1=easy to rhyme, 6=hard to rhyme), then list every common French word that rhymes with it.

Return ONLY valid JSON, no extra text:
{ "seed": "CHATEAU", "valid": ["BATEAU", "GATEAU", "CADEAU", "MANTEAU", "RIDEAU"] }

Rules: all uppercase. Give at least 15 rhymes and as many as you can up to 40 — players take turns naming them and the round ends when someone runs dry, so a short list makes for a short game. Rhyme on the final spoken sound. Do not include the seed word in the list.`,
  1024));

// Local dev only — Vercel uses the exported app as a serverless function
if (!process.env.VERCEL) {
  app.listen(3001, () => console.log('🤖 AI server running on http://localhost:3001'));
}

export default app;
