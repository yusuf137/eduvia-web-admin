import { MODULE_DEFINITIONS } from '../constants/institutionModules';

/**
 * @param {{
 *   modules: Record<string, boolean>,
 *   onChange: (next: Record<string, boolean>) => void,
 *   disabled?: boolean,
 *   legend?: string,
 * }} props
 */
export default function InstitutionModulesEditor({
  modules,
  onChange,
  disabled = false,
  legend = 'Özellikler / Modüller',
}) {
  return (
    <fieldset className="modules-editor" disabled={disabled}>
      <legend className="modules-editor__legend">{legend}</legend>
      <p className="field-hint modules-editor__hint">
        Kapalı modüller kurum admin web panelinde ve mobil uygulamada gizlenir.
      </p>
      <div className="modules-editor__grid">
        {MODULE_DEFINITIONS.map(({ key, label }) => (
          <label key={key} className="modules-editor__item">
            <input
              type="checkbox"
              checked={Boolean(modules?.[key])}
              onChange={(e) => onChange({ ...modules, [key]: e.target.checked })}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
