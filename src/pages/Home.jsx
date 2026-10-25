import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useGame } from '../context/GameContext';
import { identityStorage } from '../lib/identityStorage';
import MinigameRulesPopup from '../components/MinigameRulesPopup';
import GameRulesButton from '../components/GameRulesButton';
import ShowMarquee from '../components/ShowMarquee';

export default function Home() {
  const { t, lang, toggleLang, say } = useLang();
  const { createGame, joinGame, error } = useGame();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const invitation = (params.get('join') ?? '').toUpperCase();
  const [view, setView] = useState(invitation ? 'join' : 'main');
  const [name, setName] = useState('');
  const [code, setCode] = useState(invitation);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [resume] = useState(() => {
    try { return JSON.parse(identityStorage.getItem('payopoly_resume')); } catch { return null; }
  });
  const errors = {
    gameNotFound: t('home.gameNotFound'),
    nameTaken: say('Ce prénom est déjà pris par un joueur connecté. Choisis-en un autre.', 'This name is already used by a connected player. Pick another one.'),
    connectionError: say('Connexion impossible. Réessaie.', 'Could not connect. Please try again.'),
  };
  async function submit(e) {
    e.preventDefault();
    if (loading || !name.trim() || (view === 'join' && code.length !== 6)) return;
    setLoading(true); setLocalError('');
    try {
      const result = view === 'create' ? await createGame(name.trim()) : await joinGame(code, name.trim());
      navigate(`/lobby/${result.gameId}`);
    } catch (err) { setLocalError(errors[err.message] ?? errors.connectionError); }
    finally { setLoading(false); }
  }
  return <div className="page page-home">
    <div className="page-tools">
      <GameRulesButton onClick={() => setShowRules(true)} expanded={showRules} />
      <button className="lang-toggle" onClick={toggleLang}>{lang === 'fr' ? 'EN' : 'FR'}</button>
    </div>
    <div className="home-content">
      <p className="show-eyebrow">{t('home.showKicker')}</p>
      <h1 className="home-title" aria-label={t('home.title')}><span>Payo</span><span>Poly</span></h1>
      <p className="home-showline">{t('home.showline')}</p>
      <p className="home-subtitle">{t('home.subtitle')}</p>
      {view === 'main' ? <><ShowMarquee /><div className="btn-stack home-actions">
        <button className="btn btn-primary" onClick={() => { setView('create'); setLocalError(''); }}>{t('home.createGame')}<span aria-hidden="true">↗</span></button>
        <button className="btn btn-secondary" onClick={() => { setView('join'); setLocalError(''); }}>{t('home.joinGame')}</button>
        {resume?.gameId && identityStorage.getItem(`payopoly_${resume.gameId}`) && <button className="btn btn-success" onClick={() => navigate(`/game/${resume.gameId}`)}>{say('Reprendre la partie', 'Resume game')} · {resume.gameId}</button>}
      </div></> : <form className="card" onSubmit={submit}>
        <h2>{view === 'create' ? t('home.createGame') : t('home.joinGame')}</h2>
        {view === 'join' && <><label htmlFor="room-code">{say('Code de la partie', 'Room code')}</label>
          <input id="room-code" className="input input-code" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={6} minLength={6} required autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} autoFocus={!invitation} /></>}
        <label htmlFor="player-name">{t('home.enterName')}</label>
        <input id="player-name" className="input" value={name} onChange={e => setName(e.target.value)} placeholder={t('home.namePlaceholder')} maxLength={30} required autoFocus={view === 'create' || Boolean(invitation)} autoComplete="nickname" />
        {(localError || errors[error]) && <p className="error-msg" role="alert">{localError || errors[error]}</p>}
        <button className="btn btn-primary" type="submit" disabled={loading || !name.trim() || (view === 'join' && code.length !== 6)}>{loading ? say('Connexion…', 'Connecting…') : t('home.confirm')}</button>
        <button className="btn btn-ghost" type="button" onClick={() => { setView('main'); setLocalError(''); }}>{say('Retour', 'Back')}</button>
      </form>}
      <p className="home-footer">{t('game.solo')} / {t('game.duel')} / {t('game.all')}</p>
    </div>
    {showRules && <MinigameRulesPopup onClose={() => setShowRules(false)} />}
  </div>;
}
