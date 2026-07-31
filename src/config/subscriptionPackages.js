import { formatCurrency as formatCurrencyValue } from '../utils/packageFormat';
import { findPackageInCatalog, resolvePackageForInstitution } from '../utils/packageResolver';
import { resolvePackageMonthlyPrice } from '../utils/packageResolver';

export { formatCurrencyValue as formatCurrency };

/**
 * @param {import('../types/package').PackageRecord[]} packages
 * @param {string|null|undefined} ref
 */
export function getSubscriptionPackageFromCatalog(packages, ref) {
  const found = findPackageInCatalog(packages, ref);
  if (found) {
    return {
      key: found.id,
      label: found.name,
      monthlyPrice: found.monthlyPrice,
      package: found,
    };
  }
  return {
    key: String(ref ?? 'unknown'),
    label: String(ref ?? '—'),
    monthlyPrice: null,
    package: null,
  };
}

/**
 * @param {import('../types/package').PackageRecord[]} packages
 * @param {string|null|undefined} packageKey
 * @param {object|null|undefined} institution
 */
export function resolveMonthlyFeeFromCatalog(packages, packageKey, institution = null) {
  const pkg =
    findPackageInCatalog(packages, packageKey)
    ?? resolvePackageForInstitution(institution, packages);
  return resolvePackageMonthlyPrice(pkg, null);
}

/** @deprecated Firestore kataloğu ile getSubscriptionPackageFromCatalog kullanın */
export function getSubscriptionPackage(key) {
  return {
    key: String(key ?? 'unknown'),
    label: String(key ?? '—'),
    monthlyPrice: null,
  };
}

/** @deprecated Firestore kataloğu ile resolveMonthlyFeeFromCatalog kullanın */
export function resolveMonthlyFee(packageKey, institution) {
  return resolvePackageMonthlyPrice(null, null);
}
