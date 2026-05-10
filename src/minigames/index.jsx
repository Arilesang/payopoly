import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import PetitBacDuel   from './PetitBacDuel';
import TriviaDuel     from './TriviaDuel';
import TriviaAll      from './TriviaAll';
import MimesAll       from './MimesAll';
import PetitBacSolo   from './PetitBacSolo';
import MotMelanges    from './MotMelanges';
import PictionaryAll  from './PictionaryAll';

const COMPONENTS = {
  'duel:Petit Bac':    PetitBacDuel,
  'duel:Trivia':       TriviaDuel,
  'all:Mimes':         MimesAll,
  'all:Trivia':        TriviaAll,
  'all:Pictionary':    PictionaryAll,
  'solo:Petit Bac':    PetitBacSolo,
  'solo:Mot Melangés': MotMelanges,
};

export default function MinigameRouter() {
  const { gameId: urlGameId } = useParams();
  // isMyTurn reads from currentTurn.playerId (always set).
  // isTPlayer reads from currentMinigame.tPlayerId (only set AFTER initMinigame runs).
  // We must use isMyTurn here — isTPlayer is false until initMinigame completes.
  const { game, loadGame, initMinigame, isMyTurn } = useGame();
  const navigate = useNavigate();

  useEffect(() => { loadGame(urlGameId); }, [urlGameId]);

  // Back to game when turn advances after minigame completes
  useEffect(() => {
    if (game?.currentTurn?.phase === 'choose_type') {
      navigate(`/game/${urlGameId}`);
    }
  }, [game?.currentTurn?.phase]);

  // TPlayer initialises Firebase minigame state once on arrival
  useEffect(() => {
    if (game && isMyTurn && game.currentTurn?.phase === 'playing') {
      initMinigame();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.currentTurn?.phase, isMyTurn]);

  if (!game) return <div className="page page-center"><div className="spinner" /></div>;

  const turn = game.currentTurn ?? {};
  const key  = `${turn.minigameType}:${turn.minigame}`;
  const Component = COMPONENTS[key];

  if (!Component) {
    return (
      <div className="page page-center">
        <h2>Mini-jeu non disponible</h2>
        <p className="muted">{turn.minigame}</p>
      </div>
    );
  }

  return <Component />;
}
