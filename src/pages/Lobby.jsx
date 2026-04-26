import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useGame } from '../context/GameContext';

export default function Lobby() {
  const { gameId: urlGameId } = useParams();
  const { t, lang, toggleLang } = useLang();
  const { game, myPlayerId, isHost, loadGame, setReady, removePlayer, startGame } = useGame();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Load the game if arriving directly via URL
  useEffect(() => {
    loadGame(urlGameId);
  }, [urlGameId]);

  // Navigate to game when host starts
  useEffect(() => {
    if (game?.status === 'prep' || game?.status === 'play') {
      navigate(`/game/${urlGameId}`);
    }
  }, [game?.status]);

  function handleCopyLink() {
    const link = `${window.location.origin}?join=${urlGameId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(urlGameId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const players = Object.entries(game?.players ?? {});
  const allReady = players.length > 1 && players.every(([, p]) => p.ready);
  const myPlayer = game?.players?.[myPlayerId];

  if (!game) {
    return <div className="page page-center"><div className="spinner" /></div>;
  }

  return (
    <div className="page page-lobby">
      <button className="lang-toggle" onClick={toggleLang}>
        {lang === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR'}
      </button>

      <div className="lobby-header">
        <h1>{t('lobby.title')}</h1>
        <div className="room-code-block">
          <span className="room-code-label">{t('lobby.roomCode')}:</span>
          <span className="room-code">{urlGameId}</span>
        </div>
        <div className="btn-row">
          <button className="btn btn-small btn-ghost" onClick={handleCopyCode}>
            {copied ? t('lobby.linkCopied') : t('lobby.copyLink')}
          </button>
        </div>
      </div>

      <div className="player-list">
        {players.map(([id, player]) => (
          <div key={id} className={`player-row ${player.ready ? 'is-ready' : ''}`}>
            <div className="player-info">
              <span className="player-name">{player.name}</span>
              <span className="player-role">
                {id === game.hostId ? t('lobby.host') : t('lobby.player')}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`status-badge ${player.ready ? 'ready' : 'not-ready'}`}>
                {player.ready ? t('lobby.ready') : t('lobby.notReady')}
              </span>
              {isHost && id !== myPlayerId && (
                <button
                  className="btn btn-small btn-ghost"
                  style={{ color: 'var(--danger, #e74c3c)', padding: '2px 8px', fontSize: '0.75rem' }}
                  onClick={() => removePlayer(id)}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="lobby-actions">
        <button
          className={`btn btn-large ${myPlayer?.ready ? 'btn-ghost' : 'btn-success'}`}
          onClick={() => setReady(!myPlayer?.ready)}
        >
          {myPlayer?.ready ? t('lobby.notReady') : t('lobby.ready')}
        </button>

        {isHost && (
          <button
            className="btn btn-large btn-primary"
            onClick={startGame}
            disabled={!allReady}
            title={!allReady ? t('lobby.notAllReady') : ''}
          >
            {t('lobby.startGame')}
          </button>
        )}

        {!isHost && (
          <p className="waiting-text">{t('lobby.waitingForPlayers')}</p>
        )}

        {isHost && allReady && (
          <p className="ready-text">{t('lobby.allReadyPrompt')}</p>
        )}
      </div>
    </div>
  );
}
