import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ClipboardList,
  CreditCard,
  PlayCircle,
  Users,
  Wallet,
  Video,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import { useAuth } from '../../contexts/AuthContext';
import { fetchAdminDashboard } from '../../services/dashboardService';
import { countQualifiedLessons, migrateQualifiedLessons } from '../../services/lessonMigrationService';
import { monthTitleTr } from '../../services/financeService';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function AdminDashboard() {
  const { currentUserProfile, institutionId } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [migrationMsg, setMigrationMsg] = useState('');
  const [qualifiedCount, setQualifiedCount] = useState(null);
  const [migrationBusy, setMigrationBusy] = useState(false);

  const loadDashboard = useCallback(async () => {
    const inst = String(institutionId ?? currentUserProfile?.institutionId ?? '').trim();
    if (!inst) {
      setLoading(false);
      return;
    }
    // eslint-disable-next-line no-console
    console.log('WEB DASHBOARD PROFILE:', currentUserProfile);
    // eslint-disable-next-line no-console
    console.log('WEB DASHBOARD institutionId:', inst);
    setLoading(true);
    setError('');
    try {
      const result = await fetchAdminDashboard(inst);
      setData(result);
    } catch (e) {
      setError(e?.message ?? 'Özet veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [institutionId, currentUserProfile]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const institutionLabel =
    currentUserProfile?.institutionName?.trim() ||
    currentUserProfile?.institutionId ||
    'Kurum';

  const stats = data?.stats;

  return (
    <div className="page-stack admin-dashboard">
      <div className="dashboard-hero">
        <div>
          <h2 className="page-heading">{institutionLabel}</h2>
          <p className="muted">
            Hoş geldiniz, {currentUserProfile?.name ?? 'Admin'} — özet yalnızca kurumunuza ait
            verilerden hesaplanır.
          </p>
        </div>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      {loading ? (
        <p className="muted">Dashboard yükleniyor…</p>
      ) : stats ? (
        <>
          <div className="stat-grid stat-grid--dashboard">
            <StatCard
              title="Aktif öğrenci"
              value={String(stats.activeStudents)}
              hint="Kurum öğrencileri"
              icon={Users}
            />
            <StatCard
              title="Aktif öğretmen"
              value={String(stats.activeTeachers)}
              hint="Öğretmen + admin öğretmen"
              icon={Users}
            />
            <StatCard
              title="Aktif ders"
              value={String(stats.activeLessons)}
              hint="Kayıtlı dersler"
              icon={BookOpen}
            />
            <StatCard
              title="Bu ay ödeme"
              value={`${formatMoney(stats.monthPaymentTotal)} ₺`}
              hint={data?.monthKey ? monthTitleTr(data.monthKey) : 'Bu ay'}
              icon={CreditCard}
            />
            <StatCard
              title="Güncel bakiye"
              value={`${formatMoney(stats.currentBalance)} ₺`}
              hint="financeSettings"
              icon={Wallet}
            />
            <StatCard
              title="Bekleyen talep"
              value={String(stats.pendingCount)}
              hint="Onay bekleyen"
              icon={ClipboardList}
            />
            <StatCard
              title="Açılan video"
              value={String(stats.videoUnlockTotal)}
              hint="Toplam unlock"
              icon={Video}
            />
            <StatCard
              title="İzlenmeyen video"
              value={String(stats.videoUnwatched)}
              hint="Unlock, izlenmedi"
              icon={PlayCircle}
            />
          </div>

          <div className="dashboard-panels">
            <section className="page-card dashboard-panel">
              <div className="dashboard-panel__head">
                <h3>Son ödemeler</h3>
                <Link to="/admin/payments" className="btn btn--ghost btn--sm">
                  Tümü
                </Link>
              </div>
              {(data?.recentPayments?.length ?? 0) === 0 ? (
                <p className="muted">Bu ay ödeme kaydı yok.</p>
              ) : (
                <ul className="dashboard-list">
                  {data.recentPayments.map((p) => (
                    <li key={p.id}>
                      <strong>{p.studentName}</strong>
                      <span>{formatMoney(p.amount)} ₺</span>
                      <span className="muted">{p.dateLabel}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="page-card dashboard-panel">
              <div className="dashboard-panel__head">
                <h3>Bekleyen talepler</h3>
                <Link to="/admin/requests" className="btn btn--ghost btn--sm">
                  Talepler
                </Link>
              </div>
              {(data?.pendingItems?.length ?? 0) === 0 ? (
                <p className="muted">Bekleyen talep yok.</p>
              ) : (
                <ul className="dashboard-list">
                  {data.pendingItems.map((item) => (
                    <li key={`${item.type}-${item.id}`}>
                      <span className="badge badge--warn">{item.label}</span>
                      <strong>{item.title}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="page-card dashboard-panel">
              <div className="dashboard-panel__head">
                <h3>Son açılan videolar</h3>
                <Link to="/admin/video-tracking" className="btn btn--ghost btn--sm">
                  Video takip
                </Link>
              </div>
              {(data?.recentUnlocks?.length ?? 0) === 0 ? (
                <p className="muted">Video açılışı yok.</p>
              ) : (
                <ul className="dashboard-list">
                  {data.recentUnlocks.map((u) => (
                    <li key={u.id}>
                      <strong>{u.studentName}</strong>
                      <span className="muted">{u.teacherName}</span>
                      <span
                        className={`badge ${u.watched ? 'badge--ok' : 'badge--muted'}`}>
                        {u.watched ? 'İzlendi' : 'İzlenmedi'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : null}

      <section className="page-card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Veri bakımı (kurum)</h3>
        <p className="muted" style={{ margin: 0 }}>
          Bu kurumdaki eski <code>qualified</code> dersleri <code>group</code> yapar (manuel).
        </p>
        {qualifiedCount != null ? (
          <p className="muted">Son sayım: {qualifiedCount}</p>
        ) : null}
        {migrationMsg ? <p className="muted">{migrationMsg}</p> : null}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={migrationBusy}
            onClick={() => {
              const inst = String(institutionId ?? currentUserProfile?.institutionId ?? '').trim();
              if (!inst) return;
              setMigrationBusy(true);
              countQualifiedLessons({ role: currentUserProfile?.role ?? 'admin', institutionId: inst })
                .then((r) => {
                  setQualifiedCount(r.found);
                  setMigrationMsg(`${r.found} qualified ders.`);
                })
                .catch((e) => setMigrationMsg(e?.message ?? 'Hata'))
                .finally(() => setMigrationBusy(false));
            }}>
            Say
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={migrationBusy}
            onClick={() => {
              const inst = String(institutionId ?? currentUserProfile?.institutionId ?? '').trim();
              if (!inst || !window.confirm('Bu kurumda qualified → group migration?')) return;
              setMigrationBusy(true);
              migrateQualifiedLessons({ role: currentUserProfile?.role ?? 'admin', institutionId: inst })
                .then((r) => setMigrationMsg(`${r.migrated} ders güncellendi.`))
                .catch((e) => setMigrationMsg(e?.message ?? 'Hata'))
                .finally(() => setMigrationBusy(false));
            }}>
            Migration
          </button>
        </div>
      </section>
    </div>
  );
}
