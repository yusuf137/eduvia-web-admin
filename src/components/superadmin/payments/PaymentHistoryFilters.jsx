import {
  PAYMENT_METHOD_KEYS,
  PAYMENT_METHOD_LABELS,
} from '../../../constants/paymentMethod';
import {
  PAYMENT_STATUS_KEYS,
  PAYMENT_STATUS_LABELS,
} from '../../../constants/paymentStatus';

export default function PaymentHistoryFilters({
  search,
  onSearchChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  statusFilter,
  onStatusFilterChange,
  methodFilter,
  onMethodFilterChange,
}) {
  return (
    <section className="page-card payment-history-filters">
      <div className="payment-history-filters__grid">
        <label>
          Kurum Ara
          <input
            type="search"
            placeholder="Kurum adı…"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>

        <label>
          Tarih Aralığı (Başlangıç)
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
          />
        </label>

        <label>
          Tarih Aralığı (Bitiş)
          <input
            type="date"
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
          />
        </label>

        <label>
          Ödeme Durumu
          <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
            <option value="">Tümü</option>
            {PAYMENT_STATUS_KEYS.map((key) => (
              <option key={key} value={key}>
                {PAYMENT_STATUS_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <label>
          Ödeme Yöntemi
          <select value={methodFilter} onChange={(event) => onMethodFilterChange(event.target.value)}>
            <option value="">Tümü</option>
            {PAYMENT_METHOD_KEYS.map((key) => (
              <option key={key} value={key}>
                {PAYMENT_METHOD_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
