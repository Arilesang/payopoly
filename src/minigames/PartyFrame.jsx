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
  return <section className={`page page-minigame party-game party-${mg.phase}`}>
    <MgHeader title={tr(mg.name)} subtitle={mg.type === 'duel' ? say('Deux acteurs, deux missions secrètes', 'Two actors, two secret missions') : say('Tout le monde joue !', 'Everyone plays!')} />
    {mg.phase === 'dice' ? isTPlayer ? <DiceRoll onResult={diceValue => updateMinigame({
      ...startPartyGame(mg.name, Object.keys(game.players), game.settings?.language),
      diceValue, countdownStartedAt: now(),
    })} /> : <Waiting text={say('En attente du lancer de dé...', 'Waiting for the die roll...')} /> : <>
      {PARTY_SECONDS[mg.phase] && <Countdown key={mg.phase} startedAt={mg.phaseStartedAt} total={PARTY_SECONDS[mg.phase]} />}
      {finished ? results : children}
      {finished && (isController
        ? <button className="btn btn-large btn-primary" onClick={() => completeMinigame()}>{say('Continuer', 'Continue')}</button>
        : <Waiting text={say('En attente du tour suivant…', 'Waiting for the next turn…')} />)}
    </>}
  </section>;
}
