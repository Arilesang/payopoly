import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useLang } from '../context/LangContext';

export default function RoomBoundary({ children }) {
  const { gameId } = useParams();
  const { loadGame, game, error, myPlayerId } = useGame();
  const { say } = useLang();
  useEffect(() => { loadGame(gameId); }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (error === 'gameNotFound' || !myPlayerId || (game && !game.players?.[myPlayerId])) {
    return <div className="page page-center"><h1>{say('Rejoindre la partie', 'Join the game')}</h1>
      <p>{error === 'gameNotFound' ? say('Cette partie est introuvable.', 'This room could not be found.') : say('Rejoins cette partie pour jouer.', 'Join this room to play.')}</p>
      <Link className="btn btn-primary" to={`/?join=${encodeURIComponent(gameId)}`}>{say('Accueil', 'Home')}</Link></div>;
  }
  return <>{error === 'connectionError' && <p className="connection-banner" role="status">{say('Connexion interrompue. Reconnexion…', 'Connection interrupted. Reconnecting…')}</p>}{children}</>;
}
