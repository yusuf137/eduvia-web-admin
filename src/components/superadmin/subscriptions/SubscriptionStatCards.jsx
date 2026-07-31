import StatCard from '../../StatCard';
import { formatCurrency } from '../../../utils/packageFormat';

export default function SubscriptionStatCards({ stats, loading }) {
  if (loading) {
    return (
      <div className="page-card">
        <p className="muted">Özet kartları yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="stat-grid stat-grid--dashboard">
      <StatCard
        title="Toplam Aktif Abonelik"
        value={stats.activeCount}
        hint="Durumu aktif olan kurumlar"
      />
      <StatCard
        title="Bu Ay Beklenen Gelir (TL)"
        value={formatCurrency(stats.expectedRevenue)}
        hint="Aktif ve beklemedeki abonelikler"
      />
      <StatCard
        title="Bu Ay Tahsil Edilen (TL)"
        value={formatCurrency(stats.collectedThisMonth)}
        hint="Bu ayki tahsilatlar"
      />
      <StatCard
        title="Geciken Ödemeler"
        value={stats.overdueCount}
        hint="Vadesi geçmiş aktif abonelikler"
      />
    </div>
  );
}
