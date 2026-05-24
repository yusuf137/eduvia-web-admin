import { useEffect, useState } from 'react';
import { normalizeModules } from '../../constants/institutionModules';
import { updateInstitutionModules } from '../../services/institutionService';
import InstitutionModulesEditor from '../InstitutionModulesEditor';

/**
 * @param {{ institution: { id: string, name: string, modules?: Record<string, boolean> } | null, open: boolean, onClose: () => void, onSaved: () => void }} props
 */
export default function InstitutionEditModulesModal({ institution, open, onClose, onSaved }) {
  const [modules, setModules] = useState(normalizeModules(null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && institution) {
      setModules(normalizeModules(institution.modules));
      setError('');
    }
  }, [open, institution]);

  if (!open || !institution) {
    return null;
  }

  const onSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateInstitutionModules(institution.id, modules);
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.message ?? 'Modüller kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card institution-modules-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}>
        <h3>Kurum özellikleri</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          <strong>{institution.name}</strong>
        </p>

        {error ? <div className="alert alert--error">{error}</div> : null}

        <InstitutionModulesEditor modules={modules} onChange={setModules} disabled={saving} />

        <div className="modal-card__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Vazgeç
          </button>
          <button type="button" className="btn btn--primary" onClick={() => void onSave()} disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
