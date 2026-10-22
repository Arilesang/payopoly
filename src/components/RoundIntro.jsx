import { useText } from '../context/useText';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
import { MINIGAME_RULES } from '../data/minigameRules';
import { ROUND_EXAMPLES } from '../data/roundExamples';
import { scoringRule } from '../lib/rules';
import { FaceOff } from './DuelStage';
export default function RoundIntro() {
  const tr = useText();
  const { game, myPlayerId, setMyEntry } = useGame();
  const { lang, say } = useLang();
  const mg = game.currentMinigame;
  const key = `${mg.type}:${mg.name}`;
  const rule = MINIGAME_RULES.find(r => r.id === key);
  const performer = mg.tPlayerId === myPlayerId;
  const opponent = mg.pPlayerId === myPlayerId;
  const simultaneous = ['Trivia', 'Sondage Éclair', 'Bluff', 'Qui a écrit ça', 'Croquis Croisés', 'Choix Unique', 'Code Commun', 'Mémo Flash'].includes(mg.name) && mg.type === 'all';
  const ready = mg.rulesReady?.[myPlayerId];
  return <section className="page page-center">
    <h1>{rule?.emoji} {tr(rule?.name ?? mg.name)}</h1>
    <p className="role-badge">{simultaneous ? say('Tu joues avec tout le monde', 'You play with everyone') : performer ? say('Tu es le joueur principal', 'You are the lead player') : opponent ? say('Tu es l’adversaire', 'You are the opponent') : say('Tu observes, devines ou votes', 'You watch, guess or vote')}</p>
    {mg.type === 'duel' && mg.pPlayerId && <FaceOff />}
    <div className="card"><h2>{say('Comment jouer', 'How to play')}</h2><p>{rule?.tagline[lang]}</p>
      <ol className="intro-steps">{rule?.steps.slice(1, 4).map((step, i) => <li key={i}>{step[lang]}</li>)}</ol>
      <p><strong>{say('Exemple : ', 'Example: ')}</strong>{ROUND_EXAMPLES[key]?.[lang === 'en' ? 1 : 0]}</p>
      <p className="muted">{scoringRule(key, lang)}</p>
    </div>
    <button className="btn btn-success" disabled={ready} onClick={() => setMyEntry('rulesReady', true)}>{ready ? say('Prêt · en attente du groupe', 'Ready · waiting for the group') : say('J’ai compris · prêt !', 'Got it · ready!')}</button>
    <p className="muted">{Object.keys(mg.rulesReady ?? {}).length}/{Object.keys(game.players).length} {say('prêts · démarrage après 20 secondes', 'ready · starts after 20 seconds')}</p>
  </section>;
}
