import { useText } from '../context/useText';
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';
import RoundScoreSummary from '../components/RoundScoreSummary';
import ScoreSheet from '../components/ScoreSheet';
import RoundIntro from '../components/RoundIntro';
import DiceRoll from '../components/DiceRoll';
import MgHeader from '../components/MgHeader';
import SessionControls from '../components/SessionControls';
import MinigameRulesPopup from '../components/MinigameRulesPopup';
import { DuelBar } from '../components/DuelStage';
import { useState } from 'react';
import PetitBacDuel   from './PetitBacDuel';
import TriviaDuel     from './TriviaDuel';
import TriviaAll      from './TriviaAll';
import MimesAll       from './MimesAll';
import PetitBacSolo   from './PetitBacSolo';
import MotMelanges    from './MotMelanges';
import PictionaryAll  from './PictionaryAll';
import SondageEclair  from './SondageEclair';
import MotInterdit    from './MotInterdit';
import Punchline      from './Punchline';
import Bluff          from './Bluff';
import Curseur        from './Curseur';
import QuiAEcrit      from './QuiAEcrit';
import RimesRapides   from './RimesRapides';
import CroquisCroises from './CroquisCroises';

import ChoixUnique from './ChoixUnique';
import MissionImpossible from './MissionImpossible';
import CodeCommun from './CodeCommun';
import MemoFlash from './MemoFlash';

const COMPONENTS = {
  'all:Choix Unique': ChoixUnique,
  'duel:Mission Impossible': MissionImpossible,
  'all:Code Commun': CodeCommun,
  'all:Mémo Flash': MemoFlash,
  'duel:Choix Unique': ChoixUnique,
  'duel:Code Commun': CodeCommun,
  'duel:Mémo Flash': MemoFlash,
  'duel:Petit Bac':      PetitBacDuel,
  'duel:Trivia':         TriviaDuel,
  'duel:Punchline':      Punchline,
  'duel:Rimes Rapides':  RimesRapides,
  'all:Mimes':           MimesAll,
  'all:Trivia':          TriviaAll,
  'all:Pictionary':      PictionaryAll,
  'all:Sondage Éclair':  SondageEclair,
  'all:Mot Interdit':    MotInterdit,
  'all:Bluff':           Bluff,
  'all:Le Curseur':      Curseur,
  'all:Qui a écrit ça':  QuiAEcrit,
  'all:Croquis Croisés': CroquisCroises,
  'solo:Petit Bac':      PetitBacSolo,
  'solo:Mot Melangés':   MotMelanges,
};

export default function MinigameRouter() {
  const tr = useText();
  const { gameId: urlGameId } = useParams();
  // isController reads from currentTurn.playerId (always set).
  // isTPlayer reads from currentMinigame.tPlayerId (only set AFTER initMinigame runs).
  // We must use isController here — isTPlayer is false until initMinigame completes.
  const { game, loadGame, initMinigame, isController, isTPlayer } = useGame();
  const navigate = useNavigate();
  const { say } = useLang();
  const [help, setHelp] = useState(false);

  useEffect(() => { loadGame(urlGameId); }, [urlGameId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Back to game when turn advances after minigame completes
  useEffect(() => {
    if (game?.currentTurn?.phase === 'choose_type' || game?.status === 'finished' || game?.status === 'lobby') {
      navigate(`/game/${urlGameId}`);
    }
  }, [game?.currentTurn?.phase, game?.status, navigate, urlGameId]);

  // TPlayer initialises Firebase minigame state once on arrival
  useEffect(() => {
    if (game && isController && game.currentTurn?.phase === 'playing') {
      initMinigame();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.currentTurn?.phase, isController]);

  if (!game) return <div className="page page-center"><div className="spinner" /></div>;

  const turn = game.currentTurn ?? {};
  const key  = `${turn.minigameType}:${turn.minigame}`;
  const Component = COMPONENTS[key];

  if (!Component) {
    return (
      <div className="page page-center">
        <h2>{tr("Mini-jeu non disponible")}</h2>
        <p className="muted">{turn.minigame}</p>
      </div>
    );
  }

  const mg = game.currentMinigame;
  if (!mg || mg.id !== turn.id) return <div className="page page-center"><div className="spinner" /></div>;
  const promptPreparation = mg.phase === 'prompt_select';
  return <>
    {promptPreparation ? <div className="prompt-preparation-toolbar">
      <SessionControls compact />
      <ScoreSheet compact />
      <button className="btn btn-ghost prompt-help" aria-label={say('Règles et aide', 'Rules and help')} title={say('Règles et aide', 'Rules and help')} onClick={() => setHelp(true)}>?</button>
    </div> : <>
    <SessionControls />
    <ScoreSheet />
    <button className="btn btn-small btn-ghost round-help" onClick={() => setHelp(true)}>{say('Règles et aide', 'Rules and help')}</button>
    </>}
    {mg.fallback && <p className="connection-banner" role="status">{mg.promptSource === 'generated' ? say('Contenu de secours · catégorie et intensité conservées', 'Backup content · category and intensity preserved') : say('Contenu de secours · thème général', 'Backup content · general theme')}</p>}
    {mg.type === 'duel' && mg.pPlayerId && mg.phase !== 'rules' && !promptPreparation && <DuelBar />}
    {mg.diceValue && mg.phase !== 'dice' && !(mg.type === 'duel' && mg.pPlayerId) && <p className="round-note" role="status">🎲 {mg.diceValue} {tr('points')}</p>}
    {mg.phase === 'rules' ? <RoundIntro /> : mg.phase === 'dice' && !isTPlayer ? (
      <div className="page page-minigame page-center">
        <MgHeader title={tr(mg.name)} subtitle={game.players?.[mg.tPlayerId]?.name} />
        <DiceRoll />
      </div>
    ) : <Component key={mg.id} />}
    {['complete', 'results'].includes(mg.phase) && <RoundScoreSummary />}
    {['complete', 'results'].includes(mg.phase) && <p className="round-note">{mg.winnerIds?.length > 1 ? say('Égalité : les points sont partagés.', 'Tie: points are shared.') : mg.name === 'Trivia' && !mg.winnerId ? say('Aucune bonne réponse : aucun point attribué.', 'No correct answers: no points awarded.') : ''}{say(' Le tour suivant commence automatiquement après 30 secondes.', ' The next turn starts automatically after 30 seconds.')}</p>}
    {help && <MinigameRulesPopup initialId={key} onClose={() => setHelp(false)} />}
  </>;
}
