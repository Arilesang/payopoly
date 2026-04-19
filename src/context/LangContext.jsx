import { createContext, useContext, useState } from 'react';
import fr from '../i18n/fr';
import en from '../i18n/en';

const translations = { fr, en };

const LangContext = createContext();

export function LangProvider({ children }) {
  const [lang, setLang] = useState('fr');

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
    <LangContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
