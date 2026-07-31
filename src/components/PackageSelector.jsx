import { formatPlanPrice } from '../utils/packageFormat';
import { PACKAGE_STATUS } from '../constants/packageStatus';

/**
 * @param {{
 *   packages: import('../types/package').PackageRecord[],
 *   selectedPackageId: string,
 *   onSelect: (pkg: import('../types/package').PackageRecord) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function PackageSelector({
  packages,
  selectedPackageId,
  onSelect,
  disabled = false,
}) {
  if (!packages.length) {
    return (
      <fieldset className="package-selector" disabled={disabled}>
        <legend className="package-selector__legend">Paket Seçimi</legend>
        <p className="muted">Aktif paket bulunamadı. Paket Yönetimi sayfasından paket oluşturun.</p>
      </fieldset>
    );
  }

  return (
    <fieldset className="package-selector" disabled={disabled}>
      <legend className="package-selector__legend">Paket Seçimi</legend>
      <p className="field-hint">
        Paketler Firestore üzerinden yüklenir. Seçime göre modüller otomatik ayarlanır.
      </p>
      <div className="package-selector__grid">
        {packages.map((pkg) => {
          const selected = selectedPackageId === pkg.id;
          return (
            <button
              key={pkg.id}
              type="button"
              className={`package-card ${selected ? 'package-card--selected' : ''}`}
              style={{ '--package-accent': pkg.color || '#2563eb' }}
              onClick={() => onSelect(pkg)}
              disabled={disabled}>
              <div className="package-card__head">
                <h4>{pkg.name}</h4>
                {pkg.status === PACKAGE_STATUS.ACTIVE ? (
                  <span className="package-card__badge">Aktif</span>
                ) : null}
              </div>
              <p className="package-card__desc">{pkg.description}</p>
              <div className="package-card__price">
                {pkg.monthlyPrice != null ? (
                  <>
                    <strong>{formatPlanPrice(pkg.monthlyPrice)}</strong>
                    <span> / ay</span>
                  </>
                ) : (
                  <strong>Teklif Alın</strong>
                )}
              </div>
              {pkg.yearlyPrice != null ? (
                <p className="package-card__setup">
                  Yıllık: {formatPlanPrice(pkg.yearlyPrice)}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
