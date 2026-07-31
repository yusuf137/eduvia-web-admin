import StatCard from '../../StatCard';
import { formatCurrency } from '../../../utils/packageFormat';

export default function PaymentHistoryStatCards({ stats, loading }) {
  if (loading) {
    return (
      <div className="page-card">
        <p className="muted">Özet kartları yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="stat-grid stat-grid--dashboard payment-history-stats">
      <StatCard
        title="Bu Ay Tahsil Edilen Tutar"
        value={formatCurrency(stats.collectedThisMonth)}
        hint="Başarılı ödemeler (bu ay)"
      />
      <StatCard
        title="Bekleyen Tahsilatlar"
        value={formatCurrency(stats.pendingTotal)}
        hint="Bekliyor durumundaki tutarlar"
      />
      <StatCard
        title="Geciken Tahsilatlar"
        value={formatCurrency(stats.overdueTotal)}
        hint="Vadesi geçmiş bekleyen ödemeler"
      />
      <StatCard
        title="Toplam Tahsilat"
        value={formatCurrency(stats.totalCollected)}
        hint="Tüm başarılı ödemeler"
      />
    </div>
  );
}
