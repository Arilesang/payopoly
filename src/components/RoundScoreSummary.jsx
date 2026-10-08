import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
import { roundAwards } from '../lib/session';
export default function RoundScoreSummary() {
  const { game } = useGame();
  const { say } = useLang();
  const awards = roundAwards(game);
  return <section className="card payout-summary"><h2>{say('Points de ce tour', 'Points this turn')}</h2>
    {Object.keys(awards).length ? Object.entries(awards).map(([id, points]) => <div className="mg-row" key={id}><span>{game.players[id]?.name}</span><strong>+{points} pts</strong></div>) : <p>{say('Aucun point attribué.', 'No points awarded.')}</p>}
  </section>;
}
