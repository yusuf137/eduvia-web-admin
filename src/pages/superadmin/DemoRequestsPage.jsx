import { useCallback, useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_LABELS = {
  new: 'Yeni',
  contacted: 'Görüşüldü',
  converted: 'Müşteri Oldu',
  rejected: 'Uygun Değil',
};

const STATUS_ACTIONS = [
  { status: 'contacted', label: 'Görüşüldü' },
  { status: 'converted', label: 'Müşteri Oldu' },
  { status: 'rejected', label: 'Uygun Değil' },
];

function getTime(ts) {
  if (!ts) return 0;
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'number') return ts;
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return 0;
}

function formatDate(ts) {
  if (!ts?.toDate) {
    return '—';
  }
  return ts.toDate().toLocaleString('tr-TR');
}

function statusBadgeClass(status) {
  switch (status) {
    case 'new':
      return 'badge badge--warn';
    case 'contacted':
    case 'converted':
      return 'badge badge--ok';
    case 'rejected':
      return 'badge badge--danger';
    default:
      return 'badge badge--muted';
  }
}

export default function DemoRequestsPage() {
  const { currentUserProfile } = useAuth();
  const isSuperAdmin = currentUserProfile?.role === 'superAdmin';
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const snapshot = await getDocs(collection(db, 'demoRequests'));
      const rows = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      rows.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
      setRequests(rows);
    } catch (e) {
      setError(e?.message ?? 'Demo talepleri yüklenemedi.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDeleteRequest = async (requestId) => {
    if (!isSuperAdmin) {
      return;
    }
    setDeletingId(requestId);
    setError('');
    try {
      // eslint-disable-next-line no-console
      console.log('DELETE DEMO REQUEST:', requestId);
      await deleteDoc(doc(db, 'demoRequests', requestId));
      setRequests((prev) => prev.filter((item) => item.id !== requestId));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log('DELETE DEMO REQUEST ERROR:', err?.code, err?.message);
      setError('Demo talebi silinemedi.');
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDeleteRequest = (requestId) => {
    if (!isSuperAdmin) {
      return;
    }
    const ok = window.confirm('Bu demo talebini silmek istediğine emin misin?');
    if (ok) {
      void handleDeleteRequest(requestId);
    }
  };

  const handleStatusChange = async (requestId, newStatus) => {
    setUpdatingId(requestId);
    setError('');
    try {
      await updateDoc(doc(db, 'demoRequests', requestId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      setRequests((prev) =>
        prev.map((row) => (row.id === requestId ? { ...row, status: newStatus } : row)),
      );
    } catch (e) {
      setError(e?.message ?? 'Durum güncellenemedi.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="page-stack">
      <h2 className="page-heading">Demo Talepleri</h2>

      {error ? <div className="alert alert--error">{error}</div> : null}

      {loading ? (
        <div className="page-card">
          <p className="muted">Demo talepleri yükleniyor…</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="page-card">
          <p className="muted">Henüz demo talebi yok.</p>
        </div>
      ) : (
        <div className="data-grid">
          {requests.map((row) => (
            <article key={row.id} className="data-card">
              <div className="data-card__head">
                <h3>{row.institutionName || '—'}</h3>
                <span className={statusBadgeClass(row.status)}>
                  {STATUS_LABELS[row.status] ?? row.status ?? '—'}
                </span>
              </div>
              <dl className="data-card__meta">
                <div>
                  <dt>Yetkili adı</dt>
                  <dd>{row.contactName || '—'}</dd>
                </div>
                <div>
                  <dt>Telefon</dt>
                  <dd>{row.phone || '—'}</dd>
                </div>
                <div>
                  <dt>E-posta</dt>
                  <dd>{row.email || '—'}</dd>
                </div>
                <div>
                  <dt>Kurum türü</dt>
                  <dd>{row.institutionType || '—'}</dd>
                </div>
                <div>
                  <dt>Öğrenci sayısı</dt>
                  <dd>{row.studentCount || '—'}</dd>
                </div>
                <div>
                  <dt>Tarih</dt>
                  <dd>{formatDate(row.createdAt)}</dd>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt>Mesaj</dt>
                  <dd>{row.message || '—'}</dd>
                </div>
              </dl>
              <div className="data-card__actions request-card__actions">
                {STATUS_ACTIONS.filter((action) => action.status !== row.status).map((action) => (
                  <button
                    key={action.status}
                    type="button"
                    className="btn btn--ghost"
                    disabled={updatingId === row.id || deletingId === row.id}
                    onClick={() => void handleStatusChange(row.id, action.status)}>
                    {action.label}
                  </button>
                ))}
                {isSuperAdmin ? (
                  <button
                    type="button"
                    className="btn btn--danger"
                    disabled={updatingId === row.id || deletingId === row.id}
                    onClick={() => confirmDeleteRequest(row.id)}>
                    {deletingId === row.id ? 'Siliniyor…' : 'Sil'}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
