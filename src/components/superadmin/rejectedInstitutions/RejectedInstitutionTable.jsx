import { getRejectionReasonLabel } from '../../../constants/rejectionReasons';
import { formatDate } from '../../../utils/dateFormat';

/**
 * @param {object} props
 * @param {import('../../../types/rejectedInstitution').RejectedInstitutionRecord[]} props.rows
 * @param {boolean} props.loading
 * @param {string} [props.actingId]
 * @param {(row: import('../../../types/rejectedInstitution').RejectedInstitutionRecord) => void} props.onView
 * @param {(row: import('../../../types/rejectedInstitution').RejectedInstitutionRecord) => void} props.onEdit
 * @param {(row: import('../../../types/rejectedInstitution').RejectedInstitutionRecord) => void} props.onDelete
 */
export default function RejectedInstitutionTable({
  rows,
  loading,
  actingId = '',
  onView,
  onEdit,
  onDelete,
}) {
  if (loading) {
    return (
      <div className="page-card">
        <p className="muted">Kayıtlar yükleniyor…</p>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="page-card">
        <p className="muted">Filtrelere uygun kayıt bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="page-card table-wrap">
      <table className="data-table rejected-institution-table">
        <thead>
          <tr>
            <th>Kurum Adı</th>
            <th>Yetkili Kişi</th>
            <th>Telefon Numarası</th>
            <th>Red Sebebi</th>
            <th>Red Tarihi</th>
            <th>Tekrar Aranabilir mi?</th>
            <th>Not</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <button type="button" className="link-button" onClick={() => onView(row)}>
                  {row.institutionName || '—'}
                </button>
              </td>
              <td>{row.contactPerson || '—'}</td>
              <td>{row.phone || '—'}</td>
              <td>{getRejectionReasonLabel(row.reason, row.customReason)}</td>
              <td>{formatDate(row.rejectedAt)}</td>
              <td>
                <span className={`badge ${row.recontact ? 'badge--ok' : 'badge--muted'}`}>
                  {row.recontact ? 'Evet' : 'Hayır'}
                </span>
              </td>
              <td className="rejected-institution-table__notes">{row.notes || '—'}</td>
              <td>
                <div className="table-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => onEdit(row)}
                    disabled={actingId === row.id}>
                    Düzenle
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => onView(row)}
                    disabled={actingId === row.id}>
                    Detay Gör
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => onDelete(row)}
                    disabled={actingId === row.id}>
                    Sil
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
