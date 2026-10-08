import { createContext, useContext, useState, useEffect } from 'react';
import fr from '../i18n/fr';
import en from '../i18n/en';

const translations = { fr, en };

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('payopoly_language') === 'en' ? 'en' : 'fr');

  useEffect(() => { localStorage.setItem('payopoly_language', lang); document.documentElement.lang = lang; }, [lang]);

  function t(path) {
    const keys = path.split('.');
    let val = translations[lang];
    for (const key of keys) {
      val = val?.[key];
    }
    return val ?? path;
  }

  function toggleLang() {
    setLang(l => (l === 'fr' ? 'en' : 'fr'));
  }

  return (
    <LangContext.Provider value={{ lang, t, toggleLang, setLang, say: (frText, enText) => lang === 'en' ? enText : frText }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
