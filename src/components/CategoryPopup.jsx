import { useLang } from '../context/LangContext';

export default function CategoryPopup({ categories, defaultCategories, onClose }) {
  const { t } = useLang();
  const defaultSet = new Set(defaultCategories);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="popup" onClick={e => e.stopPropagation()}>
        <div className="popup-header">
          <h2>{t('categories.title')}</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="popup-body">
          {categories.map((cat, i) => (
            <div key={i} className="category-item">
              <span className="category-name">{cat}</span>
              <span className={`category-badge ${defaultSet.has(cat) ? 'badge-default' : 'badge-personal'}`}>
                {defaultSet.has(cat) ? t('categories.defaultLabel') : t('categories.personalLabel')}
              </span>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={onClose}>
          {t('categories.close')}
        </button>
      </div>
    </div>
  );
}
