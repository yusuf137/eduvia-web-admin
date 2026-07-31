import { getChangedAuditFields } from '../../../utils/auditLogHelpers';

/** @param {unknown} value */
function formatValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

/** @param {string} key */
function formatFieldLabel(key) {
  const labels = {
    packageName: 'Paket',
    status: 'Durum',
    monthlyPrice: 'Ücret',
    plan: 'Plan',
    planName: 'Plan Adı',
    name: 'Ad',
    email: 'E-posta',
    phone: 'Telefon',
    title: 'Başlık',
    description: 'Açıklama',
    amount: 'Tutar',
    paymentNumber: 'Ödeme No',
    isActive: 'Aktif',
  };
  return labels[key] ?? key;
}

/**
 * @param {Record<string, unknown>|null|undefined} data
 * @param {string[]} changedFields
 * @param {'old'|'new'} side
 */
function AuditDataColumn({ data, changedFields, side }) {
  const entries = Object.entries(data ?? {});
  if (!entries.length) {
    return <p className="muted">Veri yok</p>;
  }

  return (
    <dl className="audit-data-compare__list">
      {entries.map(([key, value]) => {
        const isChanged = changedFields.includes(key);
        return (
          <div
            key={`${side}-${key}`}
            className={`audit-data-compare__row${isChanged ? ' audit-data-compare__row--changed' : ''}`}>
            <dt>{formatFieldLabel(key)}:</dt>
            <dd>{formatValue(value)}</dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * @param {Record<string, unknown>|null|undefined} oldData
 * @param {Record<string, unknown>|null|undefined} newData
 */
export default function AuditDataComparison({ oldData, newData }) {
  const changedFields = getChangedAuditFields(oldData, newData);
  const hasComparison = oldData && newData && changedFields.length > 0;

  if (!hasComparison) {
    if (newData) {
      return (
        <div className="audit-data-compare">
          <div className="audit-data-compare__panel">
            <h5>Yeni Veri</h5>
            <AuditDataColumn data={newData} changedFields={[]} side="new" />
          </div>
        </div>
      );
    }
    if (oldData) {
      return (
        <div className="audit-data-compare">
          <div className="audit-data-compare__panel">
            <h5>Eski Veri</h5>
            <AuditDataColumn data={oldData} changedFields={[]} side="old" />
          </div>
        </div>
      );
    }
    return <p className="muted">Karşılaştırılacak veri bulunmuyor.</p>;
  }

  return (
    <div className="audit-data-compare audit-data-compare--split">
      <div className="audit-data-compare__panel">
        <h5>ESKİ</h5>
        <AuditDataColumn data={oldData} changedFields={changedFields} side="old" />
      </div>
      <div className="audit-data-compare__divider" aria-hidden="true" />
      <div className="audit-data-compare__panel">
        <h5>YENİ</h5>
        <AuditDataColumn data={newData} changedFields={changedFields} side="new" />
      </div>
    </div>
  );
}
