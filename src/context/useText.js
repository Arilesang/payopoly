import { useLang } from './LangContext';
import translations from '../i18n/minigames';
// Translation keys retain the original wording; parameters never alter player data.
export function useText() {
  const { lang } = useLang();
  return (key, values = []) => (lang === 'en' ? translations[key] ?? key : key).replace(/\{(\d+)\}/g, (_, i) => String(values[Number(i)] ?? ''));
}
