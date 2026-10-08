import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useLang } from '../context/LangContext';
import { useGame } from '../context/GameContext';
export default function Lobby() {
  const { gameId } = useParams();
  const { t, lang, toggleLang, say } = useLang();
  const { game, myPlayerId, isHost, kickedBy, setReady, removePlayer, startGame, configureGame, onlinePlayerIds } = useGame();
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (game && game.status !== 'lobby') navigate(`/game/${gameId}`); }, [game?.status, gameId]); // eslint-disable-line react-hooks/exhaustive-deps
  const link = `${window.location.origin}/?join=${encodeURIComponent(gameId)}`;
  async function copy(value, label) {
    try { await navigator.clipboard.writeText(value); setNotice(label); }
    catch { setNotice(say('Copie le lien affiché ci-dessous.', 'Copy the link shown below.')); }
  }
  async function act(fn) { setBusy(true); setError(''); try { await fn(); } catch { setError(say('Action impossible. Réessaie.', 'Could not complete the action. Please try again.')); } finally { setBusy(false); } }
  if (!game) return <div className="page page-center"><div className="spinner" /></div>;
  if (kickedBy) return <div className="page page-center"><h2>{t('game.kicked')}</h2><button className="btn btn-primary" onClick={() => navigate('/')}>{say('Accueil', 'Home')}</button></div>;
  const players = Object.entries(game.players ?? {});
  const settings = game.settings ?? {};
  const allReady = players.length >= 2 && players.every(([id, p]) => p.ready && onlinePlayerIds.includes(id));
  const myPlayer = game.players?.[myPlayerId];
  return <div className="page page-lobby">
    <button className="lang-toggle" onClick={toggleLang}>{lang === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR'}</button>
    <header className="lobby-header"><h1>{t('lobby.title')}</h1><p>{say('Code', 'Code')}: <strong className="room-code">{gameId}</strong></p></header>
    <section className="card invite-card">
      <QRCodeSVG value={link} size={144} marginSize={3} title={say('Scanner pour rejoindre la partie', 'Scan to join the game')} />
      <div className="btn-row"><button className="btn btn-small btn-primary" onClick={() => copy(link, t('lobby.linkCopied'))}>{t('lobby.copyLink')}</button>
      <button className="btn btn-small btn-ghost" onClick={() => copy(gameId, say('Code copié !', 'Code copied!'))}>{say('Copier le code', 'Copy code')}</button></div>
      <a className="invite-link" href={link}>{link}</a><p role="status" className="muted">{notice}</p>
    </section>
    <section className="card">
      <h2>{say('Options de partie', 'Game settings')}</h2>
      <fieldset disabled={!isHost || busy}><legend>{say('Durée · chaque joueur joue une fois par manche', 'Length · each player gets one turn per round')}</legend>
        <div className="choice-row">{[1, 3, 5].map(rounds => <button type="button" key={rounds} className={`btn btn-small ${settings.rounds === rounds ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={settings.rounds === rounds} onClick={() => act(() => configureGame({ rounds }))}>{rounds} {say(rounds === 1 ? 'manche' : 'manches', rounds === 1 ? 'round' : 'rounds')}</button>)}</div>
      </fieldset>
      <fieldset disabled={!isHost || busy}><legend>{say('Style', 'Style')}</legend><div className="choice-row">
        {[['classic', say('Classique', 'Classic')], ['quick', say('Rapide', 'Quick play')]].map(([preset, label]) => <button key={preset} className={`btn btn-small ${settings.preset === preset ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={settings.preset === preset} onClick={() => act(() => configureGame({ preset }))}>{label}</button>)}
      </div><p className="muted">{say('Rapide : jeux simultanés, préparation simplifiée et moins d’attente.', 'Quick play: simultaneous games, streamlined setup and less waiting.')}</p></fieldset>
      <fieldset disabled={!isHost || busy}><legend>{say('Langue des questions et des mots', 'Language of questions and words')}</legend><div className="choice-row">
        {[['fr', 'Français'], ['en', 'English']].map(([language, label]) => <button key={language} className={`btn btn-small ${settings.language === language ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={settings.language === language} onClick={() => act(() => configureGame({ language }))}>{label}</button>)}
      </div></fieldset>
      <p className="muted">{say('Le dé fixe les points. Chaque joueur peut gagner au maximum cette valeur par mini-jeu ; les bonus sont équilibrés selon le groupe.', 'The die sets the points. Each player can earn at most that value per minigame; bonuses are balanced for the group.')}</p>
    </section>
    <div className="player-list">{players.map(([id, p]) => <div key={id} className={`player-row ${p.ready ? 'is-ready' : ''}`}><div className="player-info"><strong>{p.name}</strong><span className="player-role">{id === game.hostId ? t('lobby.host') : t('lobby.player')} · {onlinePlayerIds.includes(id) ? say('Connecté', 'Online') : say('Déconnecté', 'Offline')}</span></div>
      <span className={`status-badge ${p.ready ? 'ready' : 'not-ready'}`}>{p.ready ? t('lobby.ready') : t('lobby.notReady')}</span>
      {isHost && id !== myPlayerId && <button className="btn btn-small btn-ghost" aria-label={`${t('game.removePlayer')} ${p.name}`} onClick={() => act(() => removePlayer(id))}>✕</button>}
    </div>)}</div>
    {error && <p role="alert" className="error-msg">{error}</p>}
    <button className={`btn btn-large ${myPlayer?.ready ? 'btn-ghost' : 'btn-success'}`} disabled={busy} onClick={() => act(() => setReady(!myPlayer?.ready))}>{myPlayer?.ready ? t('lobby.notReady') : t('lobby.ready')}</button>
    {isHost ? <><button className="btn btn-large btn-primary" disabled={busy || !allReady || !settings.rounds} onClick={() => act(startGame)}>{t('lobby.startGame')}</button>
      <p className="muted">{!settings.rounds ? say('Choisis la durée de la partie.', 'Choose the session length.') : !allReady ? say('Il faut au moins deux joueurs connectés et prêts.', 'At least two connected players must be ready.') : t('lobby.allReadyPrompt')}</p></> : <p className="muted">{t('lobby.waitingForPlayers')}</p>}
  </div>;
}
