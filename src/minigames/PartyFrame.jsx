import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
import { useText } from '../context/useText';
import { now } from '../lib/clock';
import { startPartyGame, PARTY_SECONDS } from '../lib/partyGames';
import DiceRoll from '../components/DiceRoll';
import Countdown from '../components/Countdown';
import MgHeader, { Waiting } from '../components/MgHeader';

export default function PartyFrame({ children, results }) {
  const { game, isTPlayer, isController, updateMinigame, completeMinigame } = useGame();
  const { say } = useLang();
  const tr = useText();
  const mg = game.currentMinigame;
  const finished = mg.phase === 'results';
  const subtitle = mg.type !== 'duel' ? say('Tout le monde joue !', 'Everyone plays!')
    : mg.name === 'Mission Impossible' ? say('Deux acteurs, deux missions secrètes', 'Two actors, two secret missions')
    : mg.name === 'Code Commun' ? say('Deux équipes, une course au code', 'Two teams, one code race')
    : `${game.players[mg.tPlayerId]?.name} ⚔️ ${game.players[mg.pPlayerId]?.name}`;
  return <section className={`page page-minigame party-game party-${mg.type} party-${mg.phase}`}>
    <MgHeader title={tr(mg.name)} subtitle={subtitle} />
    {mg.phase === 'dice' ? isTPlayer ? <DiceRoll onResult={diceValue => updateMinigame({
      ...startPartyGame(mg.name, Object.keys(game.players), game.settings?.language, Math.random, mg.type === 'duel' ? [mg.tPlayerId, mg.pPlayerId] : null),
      diceValue, countdownStartedAt: now(),
    })} /> : <Waiting text={say('En attente du lancer de dé...', 'Waiting for the die roll...')} /> : <>
      {PARTY_SECONDS[mg.phase] && <Countdown key={mg.phase} startedAt={mg.phaseStartedAt} total={PARTY_SECONDS[mg.phase]} />}
      {finished ? <>
        {mg.type === 'duel' && mg.name !== 'Mission Impossible' && <p className="party-duel-outcome" role="status">
          {mg.winnerId ? say(`🏆 ${game.players[mg.winnerId]?.name} remporte le duel`, `🏆 ${game.players[mg.winnerId]?.name} wins the duel`)
            : mg.winnerIds?.length > 1 ? say('Égalité · points partagés', 'Tie · points shared') : say('Aucun vainqueur', 'No winner')}
        </p>}
        {results}
      </> : children}
      {finished && (isController
        ? <button className="btn btn-large btn-primary" onClick={() => completeMinigame()}>{say('Continuer', 'Continue')}</button>
        : <Waiting text={say('En attente du tour suivant…', 'Waiting for the next turn…')} />)}
    </>}
  </section>;
}
