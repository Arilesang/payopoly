import { useState } from 'react';
import { useLang } from '../context/LangContext';
import { useText } from '../context/useText';
import { wheelCatalog } from '../lib/session';
import { MINIGAME_RULES } from '../data/minigameRules';
import MinigameRulesPopup from './MinigameRulesPopup';

export default function WheelGameList({ game, type }) {
  const { say, t } = useLang();
  const tr = useText();
  const [rulesId, setRulesId] = useState(null);
  const entries = wheelCatalog(game, type);
  const playerCount = Object.keys(game.players ?? {}).length;
  function status(entry) {
    if (entry.available) return say('Sur la roue', 'On the wheel');
    if (entry.reason === 'players') return say(`Il faut ${entry.minPlayers} joueurs · ${playerCount} ici`, `Needs ${entry.minPlayers} players · ${playerCount} here`);
    if (entry.reason === 'repeat') return say('Joué au tour précédent', 'Played last turn');
    return say('Disponible en mode classique', 'Available in Classic mode');
  }
  return <section className="wheel-game-list" aria-label={say('Jeux de cette roue', 'Games on this wheel')}>
    <h3>{t(`game.${type}`)} · {entries.filter(entry => entry.available).length}/{entries.length} {say('jeux disponibles', 'games available')}</h3>
    <p className="muted">{say('Touche un jeu pour lire son explication et un exemple.', 'Tap a game for its explanation and an example.')}</p>
    <ul>{entries.map(entry => {
      const id = `${type}:${entry.name}`;
      const rule = MINIGAME_RULES.find(rule => rule.id === id);
      return <li key={id}>
        <button className={`wheel-game-link ${entry.available ? '' : 'wheel-game-unavailable'}`} onClick={() => setRulesId(id)}
          aria-label={`${say('Règles', 'Rules')}: ${tr(entry.name)}. ${status(entry)}`}>
          <span aria-hidden="true">{rule?.emoji}</span>
          <span><strong>{tr(entry.name)}</strong><small>{status(entry)}</small></span>
          <span aria-hidden="true">ⓘ</span>
        </button>
      </li>;
    })}</ul>
    {rulesId && <MinigameRulesPopup initialId={rulesId} onClose={() => setRulesId(null)} />}
  </section>;
}
