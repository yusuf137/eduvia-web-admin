import {
  PACKAGE_PLAN_KEYS,
  PACKAGE_PRESETS,
  formatPlanPrice,
} from '../config/packagePresets';

/**
 * @param {{
 *   selectedPlan: string,
 *   onSelect: (planKey: string) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function PackageSelector({ selectedPlan, onSelect, disabled = false }) {
  return (
    <fieldset className="package-selector" disabled={disabled}>
      <legend className="package-selector__legend">Paket Seçimi</legend>
      <p className="field-hint">
        Önce bir paket seçin; modüller otomatik ayarlanır. İsterseniz alttan tek tek değiştirebilirsiniz.
      </p>
      <div className="package-selector__grid">
        {PACKAGE_PLAN_KEYS.map((planKey) => {
          const preset = PACKAGE_PRESETS[planKey];
          const selected = selectedPlan === planKey;
          return (
            <button
              key={planKey}
              type="button"
              className={`package-card ${selected ? 'package-card--selected' : ''}`}
              onClick={() => onSelect(planKey)}
              disabled={disabled}>
              <div className="package-card__head">
                <h4>{preset.name}</h4>
                {preset.popular ? <span className="package-card__badge">En Popüler</span> : null}
              </div>
              <p className="package-card__desc">{preset.description}</p>
              <div className="package-card__price">
                {preset.monthlyPrice != null ? (
                  <>
                    <strong>{formatPlanPrice(preset.monthlyPrice)}</strong>
                    <span> / ay</span>
                  </>
                ) : (
                  <strong>Teklif Alın</strong>
                )}
              </div>
              {preset.setupPrice != null ? (
                <p className="package-card__setup">Kurulum: {formatPlanPrice(preset.setupPrice)}</p>
              ) : null}
              <ul className="package-card__features">
                {preset.features.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
