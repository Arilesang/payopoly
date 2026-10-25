import { useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
import MgHeader, { Waiting } from './MgHeader';
import Countdown from './Countdown';
import { insertPromptBlank, normalizePrompt, validPrompt, PROMPT_MAX_LENGTH, PROMPT_PREP_SECONDS } from '../lib/promptSelection';
import { PROMPT_TONES } from '../lib/promptTone';

export default function PromptSelection() {
  const { game, myPlayerId, fetchContent, lockPrompt } = useGame();
  const { lang, say } = useLang();
  const mg = game.currentMinigame;
  const punchline = mg.name === 'Punchline';
  const author = game.players[mg.promptAuthorId];
  const categories = [...new Set(author?.categories ?? [])];
  const [category, setCategory] = useState(categories[0] ?? '');
  const [tone, setTone] = useState(0);
  const [manual, setManual] = useState('');
  const [generated, setGenerated] = useState(null);
  const [source, setSource] = useState('example');
  const [loading, setLoading] = useState(false);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState('');
  const input = useRef(null);
  const request = useRef(0);
  const toneIcons = ['😇', '😏', '🌶️', '😈'];
  const format = text => punchline ? text : `${say('Qui est le plus susceptible de', 'Who is most likely to')} ${normalizePrompt(mg.name, text)} ?`;
  const clock = <Countdown startedAt={mg.promptDeadline - PROMPT_PREP_SECONDS * 1000} total={PROMPT_PREP_SECONDS} />;

  if (myPlayerId !== mg.promptAuthorId) return <div className="page page-minigame page-center">
    <MgHeader title={punchline ? 'Punchline' : say('Sondage Éclair', 'Quick Poll')} subtitle={say('Préparation', 'Preparation')} />
    {clock}
    <Waiting text={say(`${author?.name ?? 'Un joueur'} choisit ${punchline ? 'la phrase à compléter' : 'la question'}…`, `${author?.name ?? 'A player'} is choosing ${punchline ? 'the fill-in-the-blank prompt' : 'the question'}…`)} />
    <p className="muted">{say('Le chrono de jeu commencera après le choix et le lancer de dé.', 'Play starts after the prompt is locked and the die is rolled.')}</p>
    <p className="muted">{say('Sans choix après 90 secondes, l’exemple sera utilisé.', 'After 90 seconds without a choice, the example will be used.')}</p>
  </div>;

  const text = source === 'manual' ? manual : source === 'generated' ? generated?.prompt ?? '' : mg.examplePrompt;
  const valid = validPrompt(mg.name, text);
  const pick = (choice, label, disabled = false) => <button className="btn btn-ghost prompt-pick" aria-label={label} title={label} aria-pressed={source === choice} disabled={disabled} onClick={() => setSource(choice)}><span aria-hidden="true">{source === choice ? '✓' : '○'}</span></button>;

  function clearGenerated() {
    request.current += 1;
    setLoading(false);
    setGenerated(null);
    if (source === 'generated') setSource('example');
  }

  async function generate() {
    const sequence = ++request.current;
    setLoading(true);
    setError('');
    try {
      const data = await fetchContent(punchline ? '/api/punchline' : '/api/survey', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, tone, generationId: `${Date.now()}:${sequence}` }),
      });
      if (sequence === request.current) setGenerated({ ...data, category, tone });
    } catch {
      if (sequence === request.current) setError(say('Réessaie ou choisis une autre option.', 'Try again or choose another option.'));
    } finally {
      if (sequence === request.current) setLoading(false);
    }
  }

  function insertBlank() {
    const field = input.current;
    const result = insertPromptBlank(manual, field?.selectionStart ?? manual.length, field?.selectionEnd ?? manual.length);
    if (result.text.length > PROMPT_MAX_LENGTH) return;
    setManual(result.text);
    setSource('manual');
    requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(result.cursor, result.cursor); });
  }

  async function confirm() {
    if (!valid || locking) return;
    setLocking(true);
    setError('');
    try {
      const saved = await lockPrompt({ text, source, category: generated?.category, tone: generated?.tone, fallback: generated?.fallback });
      if (!saved) setError(say('Le délai est écoulé ou le choix a déjà été verrouillé.', 'Time is up or the prompt is already locked.'));
    } catch {
      setError(say('Connexion interrompue. Réessaie de verrouiller ton choix.', 'Connection interrupted. Try locking your choice again.'));
    } finally { setLocking(false); }
  }

  return <div className="page page-minigame prompt-selection">
    <header className="prompt-selection-header">
      <div><p className="label">PayoPoly · {say('À toi de choisir', 'You choose')}</p>
        <h1>{punchline ? 'Punchline' : say('Sondage Éclair', 'Quick Poll')}</h1>
        <p className="muted prompt-role">{punchline ? say('Tu proposes la phrase aux duellistes.', 'You set the prompt for both duellists.') : say('Tu choisis la question du groupe.', 'You choose the question for everyone.')}</p>
      </div>
      <div className="prompt-prep-clock" title={say('Après 90 secondes, l’exemple sera utilisé.', 'After 90 seconds, the example will be used.')}>{clock}</div>
    </header>

    <section className={`card prompt-choice ${source === 'example' ? 'prompt-choice-selected' : ''}`} aria-labelledby="prompt-example-title">
      <div className="prompt-choice-heading"><h2 id="prompt-example-title">💡 {say('Exemple', 'Example')}</h2>{pick('example', say('Choisir cet exemple', 'Choose this example'))}</div>
      <p className="prompt-copy">{format(mg.examplePrompt)}</p>
    </section>

    <section className={`card prompt-choice ${source === 'generated' ? 'prompt-choice-selected' : ''}`} aria-labelledby="prompt-generate-title">
      <h2 id="prompt-generate-title">✨ {say('Générer', 'Generate')}</h2>
      <div className="prompt-generate-row">
      <label className="visually-hidden" htmlFor="prompt-category">{say('Une de tes catégories', 'One of your categories')}</label>
      <select id="prompt-category" className="input" value={category} disabled={!categories.length} onChange={event => { setCategory(event.target.value); clearGenerated(); }}>
        {!categories.length && <option value="">{say('Aucune catégorie disponible', 'No categories available')}</option>}
        {categories.map(value => <option key={value} value={value}>{value}</option>)}
      </select>
      <button className="btn btn-primary prompt-icon-button" disabled={!category || loading} onClick={generate} aria-label={loading ? say('Génération…', 'Generating…') : generated ? say('Générer une autre idée', 'Generate another idea') : say('Générer une idée', 'Generate an idea')} title={generated ? say('Générer une autre idée', 'Generate another idea') : say('Générer une idée', 'Generate an idea')}><span aria-hidden="true">{loading ? '⏳' : generated ? '↻' : '✨'}</span></button>
      </div>
      <div className="prompt-tone-icons" role="group" aria-label={say('Niveaux d’intensité', 'Intensity levels')}>{PROMPT_TONES.map((level, index) => <button key={level.en} type="button" aria-label={level[lang]} title={level[lang]} aria-pressed={tone === index} onClick={() => { setTone(index); clearGenerated(); }}><span aria-hidden="true">{toneIcons[index]}</span></button>)}</div>
      <label className="visually-hidden" htmlFor="prompt-tone">{say('Intensité', 'Intensity')}</label>
      <input id="prompt-tone" type="range" min="0" max="3" step="1" value={tone} aria-valuetext={PROMPT_TONES[tone][lang]} aria-describedby="prompt-tone-description" onChange={event => { setTone(Number(event.target.value)); clearGenerated(); }} />
      <p id="prompt-tone-description" className="muted prompt-tone-description" aria-live="polite">{PROMPT_TONES[tone].description[lang === 'en' ? 1 : 0]}</p>
      {generated && <div className="prompt-generated-result">
        <div><p className="prompt-copy" aria-live="polite">{format(generated.prompt)}</p>
        {generated.fallback && <p className="muted prompt-backup" title={say('Idée de secours · ta catégorie et ton intensité sont conservées.', 'Backup idea · your category and intensity are preserved.')}>{say('Idée de secours', 'Backup idea')}</p>}</div>
        {pick('generated', say('Choisir cette idée', 'Choose this idea'))}
      </div>}
    </section>

    <section className={`card prompt-choice ${source === 'manual' ? 'prompt-choice-selected' : ''}`} aria-labelledby="prompt-manual-title">
      <div className="prompt-choice-heading"><h2 id="prompt-manual-title">✍️ {say('Écrire toi-même', 'Write your own')}</h2>{pick('manual', say('Choisir mon texte', 'Choose my text'), !validPrompt(mg.name, manual))}</div>
      <label className={punchline ? 'visually-hidden' : 'prompt-question-prefix'} htmlFor="prompt-manual">{punchline ? say('Ta phrase à compléter', 'Your fill-in-the-blank prompt') : say('Qui est le plus susceptible de…', 'Who is most likely to…')}</label>
      <textarea id="prompt-manual" ref={input} className="input" rows="2" maxLength={PROMPT_MAX_LENGTH} value={manual} onChange={event => { setManual(event.target.value); setSource('manual'); }} aria-describedby={punchline ? 'prompt-blank-hint' : undefined} placeholder={punchline ? say('Ta phrase avec un blanc…', 'Your prompt with a blank…') : say('Ex. : oublier son propre anniversaire', 'E.g. forget their own birthday')} />
      <div className="prompt-manual-tools">
        {punchline && <><button className="btn btn-ghost prompt-blank-button" onClick={insertBlank} disabled={manual.includes('___')} aria-label={say('Insérer un blanc', 'Insert a blank')} title={say('Insérer un blanc au curseur', 'Insert a blank at the cursor')}><span aria-hidden="true">＋ ___</span></button><span id="prompt-blank-hint" className="muted">{say('Au curseur', 'At the cursor')}</span></>}
        <span className="muted prompt-char-count">{manual.length}/{PROMPT_MAX_LENGTH}</span>
      </div>
      {source === 'manual' && manual.trim() && !valid && <p className="prompt-validation" role="status">{punchline ? say('Ajoute un seul blanc : ___.', 'Add exactly one blank: ___.') : say('Une question sans blanc, 180 caractères maximum.', 'A question without a blank, 180 characters maximum.')}</p>}
    </section>

    <footer className="prompt-lock">
      <div className="prompt-lock-preview"><p className="label">{say('Ton choix', 'Your choice')} · {source === 'example' ? say('Exemple', 'Example') : source === 'generated' ? say('Généré', 'Generated') : say('Ton texte', 'Your text')}</p>
      <p className="prompt-copy" title={text?.trim() ? format(text) : ''}>{text?.trim() ? format(text) : say('Écris ton texte…', 'Write your text…')}</p></div>
      <button className="btn btn-success" disabled={!valid || locking} onClick={confirm} aria-label={say('Verrouiller mon choix', 'Lock in my choice')}><span aria-hidden="true">{locking ? '⏳' : '🔒'}</span> {say('Verrouiller', 'Lock in')}</button>
    </footer>
    {error && <p role="alert">{error}</p>}
  </div>;
}
