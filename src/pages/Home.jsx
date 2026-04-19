import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useGame } from '../context/GameContext';

export default function Home() {
  const { t, lang, toggleLang } = useLang();
  const { createGame, joinGame, error } = useGame();
  const navigate = useNavigate();

  const [view, setView] = useState('main'); // 'main' | 'create_name' | 'join_code' | 'join_name'
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { gameId } = await createGame(name.trim());
      navigate(`/lobby/${gameId}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!name.trim() || !code.trim()) return;
    setLoading(true);
    try {
      const { gameId } = await joinGame(code.trim().toUpperCase(), name.trim());
      navigate(`/lobby/${gameId}`);
    } catch {
      setLoading(false);
    }
  }

  function handleCodeSubmit(e) {
    e.preventDefault();
    if (code.trim()) setView('join_name');
  }

  return (
    <div className="page page-home">
      <button className="lang-toggle" onClick={toggleLang}>
        {lang === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR'}
      </button>

      <div className="home-content">
        <h1 className="home-title">{t('home.title')}</h1>
        <p className="home-subtitle">{t('home.subtitle')}</p>

        {view === 'main' && (
          <div className="btn-stack">
            <button className="btn btn-primary" onClick={() => setView('create_name')}>
              {t('home.createGame')}
            </button>
            <button className="btn btn-secondary" onClick={() => setView('join_code')}>
              {t('home.joinGame')}
            </button>
          </div>
        )}

        {view === 'create_name' && (
          <div className="card">
            <h2>{t('home.enterName')}</h2>
            <input
              className="input"
              placeholder={t('home.namePlaceholder')}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="btn-stack">
              <button className="btn btn-primary" onClick={handleCreate} disabled={!name.trim() || loading}>
                {loading ? '...' : t('home.confirm')}
              </button>
              <button className="btn btn-ghost" onClick={() => setView('main')}>←</button>
            </div>
          </div>
        )}

        {view === 'join_code' && (
          <div className="card">
            <h2>{t('home.joinGame')}</h2>
            <form onSubmit={handleCodeSubmit}>
              <input
                className="input input-code"
                placeholder={t('home.roomCodePlaceholder')}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                autoFocus
              />
              {error === 'gameNotFound' && (
                <p className="error-msg">{t('home.gameNotFound')}</p>
              )}
              <div className="btn-stack">
                <button className="btn btn-primary" type="submit" disabled={!code.trim()}>
                  {t('home.join')}
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => setView('main')}>←</button>
              </div>
            </form>
          </div>
        )}

        {view === 'join_name' && (
          <div className="card">
            <h2>{t('home.enterName')}</h2>
            <input
              className="input"
              placeholder={t('home.namePlaceholder')}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              autoFocus
            />
            <div className="btn-stack">
              <button className="btn btn-primary" onClick={handleJoin} disabled={!name.trim() || loading}>
                {loading ? '...' : t('home.confirm')}
              </button>
              <button className="btn btn-ghost" onClick={() => setView('join_code')}>←</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
