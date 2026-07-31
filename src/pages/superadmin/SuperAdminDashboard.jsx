import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, KeyRound, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import StatCard from '../../components/StatCard';
import UpcomingRemindersWidget from '../../components/superadmin/dashboard/UpcomingRemindersWidget';
import RecentActivitiesWidget from '../../components/superadmin/dashboard/RecentActivitiesWidget';
import { listInstitutions } from '../../services/institutionService';
import { listAdminInviteCodes } from '../../services/inviteCodeService';
import { listUpcomingReminderNotes } from '../../services/institutionNoteService';
import { listRecentAuditLogs } from '../../services/auditLogService';
import {
  bootstrapSubscriptionsFromInstitutions,
  computeSubscriptionDashboardStats,
  listSubscriptionPayments,
  listSubscriptions,
} from '../../services/subscriptionService';
import { countQualifiedLessons, migrateQualifiedLessons } from '../../services/lessonMigrationService';
import { useAuth } from '../../contexts/AuthContext';
import { usePackages } from '../../contexts/PackageCatalogContext';

export default function SuperAdminDashboard() {
  const { currentUserProfile } = useAuth();
  const { reload: reloadPackages } = usePackages();
  const [institutions, setInstitutions] = useState([]);
  const [codes, setCodes] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [subscriptionStats, setSubscriptionStats] = useState({
    activeCount: 0,
    expectedRevenue: 0,
    collectedThisMonth: 0,
    overdueCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [migrationMsg, setMigrationMsg] = useState('');
  const [qualifiedCount, setQualifiedCount] = useState(null);
  const [migrationBusy, setMigrationBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      listInstitutions(),
      listAdminInviteCodes(),
      listUpcomingReminderNotes(),
      listRecentAuditLogs(10),
      reloadPackages(),
    ])
      .then(async ([instList, codeList, reminderList, activityList]) => {
        if (!cancelled) {
          setInstitutions(instList);
          setCodes(codeList);
          setReminders(reminderList);
          setRecentActivities(activityList);
          await bootstrapSubscriptionsFromInstitutions(instList);
          const [subscriptionRows, paymentRows] = await Promise.all([
            listSubscriptions(),
            listSubscriptionPayments(),
          ]);
          if (!cancelled) {
            setSubscriptionStats(
              computeSubscriptionDashboardStats(subscriptionRows, paymentRows),
            );
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message ?? 'Veriler yüklenemedi.');
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
  }, [reloadPackages]);

  const stats = useMemo(() => {
    const activeCount = institutions.filter((i) => i.isActive).length;
    const unusedCodes = codes.filter((c) => !c.used).length;
    const usedCodes = codes.filter((c) => c.used).length;
    return {
      total: institutions.length,
      active: activeCount,
      unusedCodes,
      usedCodes,
    };
  }, [institutions, codes]);

  return (
    <div className="page-stack">
      <h2 className="page-heading">SuperAdmin Dashboard</h2>

      {error ? <div className="alert alert--error">{error}</div> : null}

      {loading ? (
        <p className="muted">Özet yükleniyor…</p>
      ) : (
        <div className="stat-grid">
          <StatCard title="Toplam kurum" value={stats.total} hint="Tüm kayıtlar" icon={Building2} />
          <StatCard title="Aktif kurum" value={stats.active} hint="isActive: true" icon={CheckCircle} />
          <StatCard
            title="Aktif abonelik"
            value={subscriptionStats.activeCount}
            hint="Abonelik durumu aktif"
            icon={CreditCard}
          />
          <StatCard
            title="Geciken ödeme"
            value={subscriptionStats.overdueCount}
            hint="Vadesi geçmiş abonelikler"
            icon={XCircle}
          />
          <StatCard
            title="Kullanılmamış admin kodu"
            value={stats.unusedCodes}
            hint="Bekleyen davetler"
            icon={KeyRound}
          />
        </div>
      )}

      <UpcomingRemindersWidget reminders={reminders} loading={loading} />

      <RecentActivitiesWidget activities={recentActivities} loading={loading} />

      <section className="page-card" style={{ marginTop: '1rem' }}>
        <h3 className="page-heading" style={{ fontSize: '1.1rem' }}>
          Veri migration (qualified → group)
        </h3>
        <p className="muted">
          Eski <code>lessonType: qualified</code> kayıtlarını <code>group</code> yapar. Otomatik çalışmaz.
        </p>
        {qualifiedCount != null ? (
          <p className="muted">Son sayım: {qualifiedCount} kayıt</p>
        ) : null}
        {migrationMsg ? <div className="alert alert--success">{migrationMsg}</div> : null}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={migrationBusy}
            onClick={() => {
              setMigrationBusy(true);
              setMigrationMsg('');
              countQualifiedLessons({ role: currentUserProfile?.role ?? 'superAdmin' })
                .then((r) => {
                  setQualifiedCount(r.found);
                  setMigrationMsg(`${r.found} qualified ders bulundu.`);
                })
                .catch((e) => setMigrationMsg(e?.message ?? 'Sayım hatası'))
                .finally(() => setMigrationBusy(false));
            }}>
            Say
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={migrationBusy}
            onClick={() => {
              if (!window.confirm('Tüm kurumlarda qualified → group migration çalışsın mı?')) {
                return;
              }
              setMigrationBusy(true);
              setMigrationMsg('');
              migrateQualifiedLessons({ role: currentUserProfile?.role ?? 'superAdmin' })
                .then((r) => {
                  setQualifiedCount(r.found);
                  setMigrationMsg(`${r.migrated} ders güncellendi.`);
                })
                .catch((e) => setMigrationMsg(e?.message ?? 'Migration hatası'))
                .finally(() => setMigrationBusy(false));
            }}>
            Migration çalıştır
          </button>
        </div>
      </section>

      <div className="quick-links">
        <Link to="/superadmin/subscriptions" className="page-card quick-link">
          <strong>Abonelikler</strong>
          <span>Kurum aboneliklerini ve tahsilatları yönet</span>
        </Link>
        <Link to="/superadmin/institutions" className="page-card quick-link">
          <strong>Kurumlar</strong>
          <span>Kurum listesini görüntüle</span>
        </Link>
        <Link to="/superadmin/institutions/create" className="page-card quick-link">
          <strong>Kurum Oluştur</strong>
          <span>Yeni kurum ekle</span>
        </Link>
        <Link to="/superadmin/demo-requests" className="page-card quick-link">
          <strong>Demo Talepleri</strong>
          <span>Web sitesinden gelen demo talepleri</span>
        </Link>
        <Link to="/superadmin/invite-codes" className="page-card quick-link">
          <strong>Admin Davet Kodları</strong>
          <span>Kurum admini kodu üret</span>
        </Link>
      </div>
    </div>
  );
}
