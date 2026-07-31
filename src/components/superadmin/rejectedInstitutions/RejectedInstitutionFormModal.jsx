import { useEffect, useState } from 'react';
import {
  REJECTION_REASON,
  REJECTION_REASON_KEYS,
  REJECTION_REASON_LABELS,
} from '../../../constants/rejectionReasons';
import { parseDateInput, todayDateInputValue } from '../../../utils/dateFormat';

function buildEmptyForm() {
  return {
    institutionName: '',
    contactPerson: '',
    phone: '',
    email: '',
    reason: REJECTION_REASON.PRICE_HIGH,
    customReason: '',
    notes: '',
    rejectedAt: todayDateInputValue(),
    recontact: 'no',
  };
}

/** @param {import('../../../types/rejectedInstitution').RejectedInstitutionRecord|null|undefined} record */
function formFromRecord(record) {
  if (!record) return buildEmptyForm();
  const rejectedDate = record.rejectedAt?.toDate?.();
  return {
    institutionName: record.institutionName,
    contactPerson: record.contactPerson,
    phone: record.phone,
    email: record.email,
    reason: record.reason,
    customReason: record.customReason,
    notes: record.notes,
    rejectedAt: rejectedDate
      ? `${rejectedDate.getFullYear()}-${String(rejectedDate.getMonth() + 1).padStart(2, '0')}-${String(rejectedDate.getDate()).padStart(2, '0')}`
      : todayDateInputValue(),
    recontact: record.recontact ? 'yes' : 'no',
  };
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {import('../../../types/rejectedInstitution').RejectedInstitutionRecord|null} [props.initial]
 * @param {() => void} props.onClose
 * @param {(payload: object) => Promise<void>} props.onSubmit
 */
export default function RejectedInstitutionFormModal({ open, initial = null, onClose, onSubmit }) {
  const [form, setForm] = useState(buildEmptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(formFromRecord(initial));
      setError('');
    }
  }, [open, initial]);

  if (!open) return null;

  const showCustomReason = form.reason === REJECTION_REASON.OTHER;

  const onSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        institutionName: form.institutionName.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        reason: form.reason,
        customReason: showCustomReason ? form.customReason.trim() : '',
        notes: form.notes.trim(),
        rejectedAt: parseDateInput(form.rejectedAt),
        recontact: form.recontact === 'yes',
      });
      onClose();
    } catch (e) {
      setError(e?.message ?? 'Kayıt kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card rejected-institution-form-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}>
        <h3>{initial ? 'Kaydı Düzenle' : 'Yeni Kayıt'}</h3>
        <p className="muted">Red veren kurum bilgilerini kaydedin</p>

        {error ? <div className="alert alert--error">{error}</div> : null}

        <form className="form-grid rejected-institution-form" onSubmit={(event) => void onSave(event)}>
          <label>
            Kurum Adı *
            <input
              value={form.institutionName}
              onChange={(e) => setForm((prev) => ({ ...prev, institutionName: e.target.value }))}
              required
            />
          </label>

          <label>
            Yetkili Kişi
            <input
              value={form.contactPerson}
              onChange={(e) => setForm((prev) => ({ ...prev, contactPerson: e.target.value }))}
            />
          </label>

          <label>
            Telefon Numarası *
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              required
            />
          </label>

          <label>
            E-posta
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </label>

          <label>
            Red Sebebi
            <select
              value={form.reason}
              onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}>
              {REJECTION_REASON_KEYS.map((key) => (
                <option key={key} value={key}>
                  {REJECTION_REASON_LABELS[key]}
                </option>
              ))}
            </select>
          </label>

          {showCustomReason ? (
            <label className="form-grid__full">
              Diğer Sebep
              <input
                value={form.customReason}
                onChange={(e) => setForm((prev) => ({ ...prev, customReason: e.target.value }))}
                placeholder="Red sebebini açıklayın"
              />
            </label>
          ) : null}

          <label className="form-grid__full">
            Açıklama / Not
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </label>

          <label>
            Red Tarihi
            <input
              type="date"
              value={form.rejectedAt}
              onChange={(e) => setForm((prev) => ({ ...prev, rejectedAt: e.target.value }))}
            />
          </label>

          <label>
            Tekrar Aranabilir mi?
            <select
              value={form.recontact}
              onChange={(e) => setForm((prev) => ({ ...prev, recontact: e.target.value }))}>
              <option value="yes">Evet</option>
              <option value="no">Hayır</option>
            </select>
          </label>

          <div className="modal-card__actions form-grid__full">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
              İptal
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
