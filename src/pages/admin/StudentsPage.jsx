import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ActiveFilterBar from '../../components/ActiveFilterBar';
import { filterByActiveStatus, isUserActive, listStudents } from '../../services/userService';

function formatDate(ts) {
  if (!ts?.toDate) {
    return '—';
  }
  return ts.toDate().toLocaleString('tr-TR');
}

export default function StudentsPage() {
  const { currentUserProfile } = useAuth();
  const institutionId = currentUserProfile?.institutionId ?? '';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!institutionId) {
      setRows([]);
      setLoading(false);
      return () => {};
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    void listStudents(institutionId)
      .then((list) => {
        if (!cancelled) {
          setRows(list);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message ?? 'Öğrenciler yüklenemedi.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [institutionId]);

  const filtered = useMemo(() => filterByActiveStatus(rows, statusFilter), [rows, statusFilter]);

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <h2 className="page-heading">Öğrenciler</h2>
        <ActiveFilterBar value={statusFilter} onChange={setStatusFilter} />
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      {loading ? (
        <div className="page-card">
          <p className="muted">Öğrenciler yükleniyor…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="page-card">
          <p className="muted">{rows.length === 0 ? 'Henüz öğrenci yok.' : 'Bu filtrede öğrenci yok.'}</p>
        </div>
      ) : (
        <div className="page-card table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>E-posta</th>
                <th>Durum</th>
                <th>Telafi kredisi</th>
                <th>Oluşturulma</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.uid}>
                  <td>{row.name}</td>
                  <td>{row.email || '—'}</td>
                  <td>
                    <span className={`badge ${isUserActive(row) ? 'badge--ok' : 'badge--muted'}`}>
                      {isUserActive(row) ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td>{row.makeupCredit != null ? row.makeupCredit : '—'}</td>
                  <td>{formatDate(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
