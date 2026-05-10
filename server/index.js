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

// ── Trivia: generate 3 MCQ questions ────────────────────────────────────────
function extractJSON(text) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

app.post('/api/trivia', async (req, res) => {
  const { category, difficulty } = req.body;
  try {
    const msg = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Generate exactly 3 multiple choice trivia questions about the category "${category}" at difficulty level ${difficulty}/6 (1=very easy, 6=very hard). Questions should be in French.

Return ONLY valid JSON, no extra text:
[
  { "q": "Question text?", "options": ["A", "B", "C", "D"], "answer": 0 },
  { "q": "Question text?", "options": ["A", "B", "C", "D"], "answer": 2 },
  { "q": "Question text?", "options": ["A", "B", "C", "D"], "answer": 1 }
]

"answer" is the index (0-3) of the correct option. Make sure questions are interesting and appropriate for a party game.`,
      }],
    });
    const json = JSON.parse(extractJSON(msg.content[0].text));
    res.json({ questions: json });
  } catch (err) {
    console.error('Trivia error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Mimes: generate a word to mime for a given category ─────────────────────
app.post('/api/mime-word', async (req, res) => {
  const { category } = req.body;
  try {
    const msg = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 128,
      messages: [{
        role: 'user',
        content: `Pick one French word or very short phrase that is concrete and fun to act out in a party mime game, related to the category "${category}".

Return ONLY valid JSON, no extra text: { "word": "MOT" }

The word must be uppercase. Favour physical, visual concepts (animals, actions, objects, sports) over abstract ideas.`,
      }],
    });
    const json = JSON.parse(extractJSON(msg.content[0].text));
    res.json(json);
  } catch (err) {
    console.error('Mime word error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Pictionary: generate a word to draw for a given category + difficulty ────
app.post('/api/pictionary-word', async (req, res) => {
  const { category, difficulty } = req.body;
  try {
    const msg = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 128,
      messages: [{
        role: 'user',
        content: `Pick one French word or very short phrase (2 words max) that is fun and possible to draw in a party Pictionary game, related to the category "${category}" at difficulty level ${difficulty}/6 (1=very simple common object, 6=abstract or complex concept).

Return ONLY valid JSON, no extra text: { "word": "MOT" }

The word must be uppercase. Favour concrete, drawable things: objects, animals, actions, places, characters. Avoid very abstract words at low difficulty.`,
      }],
    });
    const json = JSON.parse(extractJSON(msg.content[0].text));
    res.json(json);
  } catch (err) {
    console.error('Pictionary word error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Mot Melangés: generate a jumbled word ────────────────────────────────────
app.post('/api/jumble', async (req, res) => {
  const { category, difficulty } = req.body;
  try {
    const msg = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Pick one French word related to the category "${category}" appropriate for difficulty level ${difficulty}/6 (1=very common short word, 6=rare long word). Jumble its letters randomly (the jumbled version must be different from the original).

Return ONLY valid JSON, no extra text:
{ "original": "MOTORIGINAL", "jumbled": "MOTMELANGE" }

Both must be uppercase. The jumbled word must have the exact same letters in a different order.`,
      }],
    });
    const json = JSON.parse(extractJSON(msg.content[0].text));
    res.json(json);
  } catch (err) {
    console.error('Jumble error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Local dev only — Vercel uses the exported app as a serverless function
if (!process.env.VERCEL) {
  app.listen(3001, () => console.log('🤖 AI server running on http://localhost:3001'));
}

export default app;
