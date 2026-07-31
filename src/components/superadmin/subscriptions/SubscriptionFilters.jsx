import {
  SUBSCRIPTION_STATUS_KEYS,
  SUBSCRIPTION_STATUS_LABELS,
} from '../../../constants/subscriptionStatus';

export default function SubscriptionFilters({
  search,
  onSearchChange,
  packageFilter,
  onPackageFilterChange,
  statusFilter,
  onStatusFilterChange,
  packages = [],
}) {
  return (
    <div className="page-card subscription-filters">
      <label className="subscription-filters__field">
        <span>Kurum ara</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Kurum adına göre ara…"
        />
      </label>

      <label className="subscription-filters__field">
        <span>Paket</span>
        <select value={packageFilter} onChange={(event) => onPackageFilterChange(event.target.value)}>
          <option value="">Tüm paketler</option>
          {packages.map((pkg) => (
            <option key={pkg.id} value={pkg.id}>
              {pkg.name}
            </option>
          ))}
        </select>
      </label>

      <label className="subscription-filters__field">
        <span>Durum</span>
        <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
          <option value="">Tüm durumlar</option>
          {SUBSCRIPTION_STATUS_KEYS.map((key) => (
            <option key={key} value={key}>
              {SUBSCRIPTION_STATUS_LABELS[key]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
