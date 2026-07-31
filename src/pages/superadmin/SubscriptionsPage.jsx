import { useCallback, useEffect, useMemo, useState } from 'react';
import { listInstitutions } from '../../services/institutionService';
import {
  activateSubscription,
  bootstrapSubscriptionsFromInstitutions,
  cancelSubscription,
  computeSubscriptionDashboardStats,
  getSubscriptionDisplayStatus,
  listSubscriptionPayments,
  listSubscriptions,
  suspendSubscription,
} from '../../services/subscriptionService';
import SubscriptionStatCards from '../../components/superadmin/subscriptions/SubscriptionStatCards';
import SubscriptionFilters from '../../components/superadmin/subscriptions/SubscriptionFilters';
import SubscriptionTable from '../../components/superadmin/subscriptions/SubscriptionTable';
import SubscriptionDetailModal from '../../components/superadmin/subscriptions/SubscriptionDetailModal';
import SubscriptionEditModal from '../../components/superadmin/subscriptions/SubscriptionEditModal';
import AddPaymentModal from '../../components/superadmin/subscriptions/AddPaymentModal';
import { usePackages } from '../../contexts/PackageCatalogContext';

export default function SubscriptionsPage() {
  const { packages, loading: packagesLoading } = usePackages();
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [packageFilter, setPackageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewSubscription, setViewSubscription] = useState(null);
  const [editSubscription, setEditSubscription] = useState(null);
  const [paymentSubscription, setPaymentSubscription] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const institutions = await listInstitutions();
      await bootstrapSubscriptionsFromInstitutions(institutions);
      const [subscriptionRows, paymentRows] = await Promise.all([
        listSubscriptions(),
        listSubscriptionPayments(),
      ]);
      setSubscriptions(subscriptionRows);
      setPayments(paymentRows);
    } catch (e) {
      setError(e?.message ?? 'Abonelikler yüklenemedi.');
      setSubscriptions([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => computeSubscriptionDashboardStats(subscriptions, payments),
    [subscriptions, payments],
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    return subscriptions.filter((row) => {
      const matchesSearch =
        !query || row.institutionName.toLocaleLowerCase('tr-TR').includes(query);
      const matchesPackage =
        !packageFilter ||
        row.packageId === packageFilter ||
        row.plan === packageFilter ||
        row.package === packageFilter ||
        packages.find((p) => p.id === packageFilter)?.name === row.packageName;
      const effectiveStatus = getSubscriptionDisplayStatus(row);
      const matchesStatus = !statusFilter || effectiveStatus === statusFilter;
      return matchesSearch && matchesPackage && matchesStatus;
    });
  }, [subscriptions, search, packageFilter, statusFilter, packages]);

  const handleSuspend = async (subscription) => {
    if (
      !window.confirm(
        `${subscription.institutionName} aboneliği askıya alınsın mı? Paket bilgileri korunur.`,
      )
    ) {
      return;
    }
    try {
      await suspendSubscription(subscription.institutionId);
      await load();
    } catch (e) {
      setError(e?.message ?? 'Abonelik askıya alınamadı.');
    }
  };

  const handleActivate = async (subscription) => {
    if (
      !window.confirm(
        `${subscription.institutionName} aboneliği tekrar aktif edilsin mi? Saklanan paket ayarları geri yüklenecek.`,
      )
    ) {
      return;
    }
    try {
      await activateSubscription(subscription.institutionId);
      await load();
    } catch (e) {
      setError(e?.message ?? 'Abonelik aktif edilemedi.');
    }
  };

  const handleCancel = async (subscription) => {
    if (
      !window.confirm(
        `${subscription.institutionName} aboneliği iptal edilsin mi? Veriler silinmez; kullanım kapatılır.`,
      )
    ) {
      return;
    }
    try {
      await cancelSubscription(subscription.institutionId);
      await load();
    } catch (e) {
      setError(e?.message ?? 'Abonelik iptal edilemedi.');
    }
  };

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <h2 className="page-heading">Abonelikler</h2>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      <SubscriptionStatCards stats={stats} loading={loading} />

      <SubscriptionFilters
        search={search}
        onSearchChange={setSearch}
        packageFilter={packageFilter}
        onPackageFilterChange={setPackageFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        packages={packages}
      />

      <SubscriptionTable
        rows={filteredRows}
        loading={loading || packagesLoading}
        packages={packages}
        onView={setViewSubscription}
        onEdit={setEditSubscription}
        onAddPayment={setPaymentSubscription}
        onSuspend={(row) => void handleSuspend(row)}
        onActivate={(row) => void handleActivate(row)}
        onCancel={(row) => void handleCancel(row)}
      />

      <SubscriptionDetailModal
        subscription={viewSubscription}
        open={Boolean(viewSubscription)}
        onClose={() => setViewSubscription(null)}
      />

      <SubscriptionEditModal
        subscription={editSubscription}
        open={Boolean(editSubscription)}
        onClose={() => setEditSubscription(null)}
        onSaved={() => void load()}
        packages={packages}
      />

      <AddPaymentModal
        subscription={paymentSubscription}
        open={Boolean(paymentSubscription)}
        onClose={() => setPaymentSubscription(null)}
        onSaved={() => void load()}
      />
    </div>
  );
}
