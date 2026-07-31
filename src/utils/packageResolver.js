import { DEFAULT_MODULES } from '../constants/institutionModules';
import { getDefaultMonthlyPriceForPackage, normalizePackageName } from '../constants/packageType';
import { PACKAGE_STATUS } from '../constants/packageStatus';
import {
  buildDefaultPackageFeatures,
  normalizePackageFeatures,
} from '../constants/packageFeatures';
import {
  buildDefaultPackageLimits,
  normalizePackageLimits,
} from '../constants/packageLimits';
import { deriveModulesFromPackageFeatures } from './packageModuleMapper';

const CANONICAL_MODULE_KEYS = Object.keys(DEFAULT_MODULES);

/**
 * @param {import('../types/package').PackageRecord[]} packages
 * @param {string|null|undefined} ref id, slug veya name
 * @returns {import('../types/package').PackageRecord|null}
 */
export function findPackageInCatalog(packages, ref) {
  const raw = String(ref ?? '').trim();
  if (!raw || !packages?.length) {
    return null;
  }
  return (
    packages.find((p) => p.id === raw)
    || packages.find((p) => p.slug === raw)
    || packages.find((p) => p.name === raw)
    || packages.find((p) => p.name.toLocaleLowerCase('tr-TR') === raw.toLocaleLowerCase('tr-TR'))
    || null
  );
}

/**
 * Firestore'da bulunamayan kurumlar için güvenli fallback paket.
 * @param {object|null|undefined} institution
 * @returns {import('../types/package').PackageRecord}
 */
export function buildFallbackPackage(institution = null) {
  const planName =
    String(institution?.planName ?? '').trim()
    || normalizePackageName(institution?.plan)
    || 'Bilinmeyen Paket';
  const slug = String(institution?.plan ?? institution?.packageId ?? 'unknown').trim() || 'unknown';
  const features = buildDefaultPackageFeatures(false);
  return {
    id: String(institution?.packageId ?? slug),
    name: planName,
    description: '',
    monthlyPrice: null,
    yearlyPrice: null,
    currency: 'TRY',
    status: PACKAGE_STATUS.INACTIVE,
    limits: buildDefaultPackageLimits(),
    features,
    modules: deriveModulesFromPackageFeatures(features),
    sortOrder: 9999,
    color: '#64748b',
    icon: 'package',
    slug,
    institutionCount: 0,
    createdAt: null,
    updatedAt: null,
    archived: false,
    _fallback: true,
  };
}

/**
 * @param {object|null|undefined} institution
 * @param {import('../types/package').PackageRecord[]} packages
 * @returns {import('../types/package').PackageRecord}
 */
export function resolvePackageForInstitution(institution, packages = []) {
  if (!institution) {
    return buildFallbackPackage(null);
  }

  const byId = findPackageInCatalog(packages, institution.packageId);
  if (byId) return byId;

  const byPlan = findPackageInCatalog(packages, institution.plan);
  if (byPlan) return byPlan;

  const byName = findPackageInCatalog(packages, institution.planName);
  if (byName) return byName;

  return buildFallbackPackage(institution);
}

/**
 * @param {import('../types/package').PackageRecord[]} packages
 * @param {string|null|undefined} packageIdOrName
 */
export function resolvePackageLabelFromCatalog(packages, packageIdOrName) {
  const raw = String(packageIdOrName ?? '').trim();
  if (!raw) return '—';
  const found = findPackageInCatalog(packages, raw);
  return found?.name ?? raw;
}

/**
 * @param {import('../types/package').PackageRecord|null|undefined} pkg
 * @param {Record<string, boolean>|null|undefined} modules
 */
export function isCustomModuleOverrideForPackage(pkg, modules) {
  if (!pkg?.modules) {
    return false;
  }
  const normalized = modules ?? {};
  return CANONICAL_MODULE_KEYS.some((key) => {
    const current = normalized[key] !== false;
    const expected = pkg.modules[key] === true;
    return current !== expected;
  });
}

/**
 * @param {object|null|undefined} institution
 * @param {import('../types/package').PackageRecord[]} packages
 */
export function getPlanDisplayLabel(institution, packages = []) {
  if (!institution) {
    return 'Paket seçilmemiş';
  }

  const pkg = resolvePackageForInstitution(institution, packages);
  const planName = pkg.name || 'Paket seçilmemiş';

  if (!institution.plan && !institution.packageId && !institution.planName) {
    return institution.planName ? planName : 'Paket seçilmemiş';
  }

  if (isCustomModuleOverrideForPackage(pkg, institution.modules)) {
    return `${planName} + Ek Özellikler`;
  }

  return planName;
}

/**
 * @param {import('../types/package').PackageRecord|null|undefined} pkg
 * @param {number|null|undefined} storedPrice
 */
export function resolvePackageMonthlyPrice(pkg, storedPrice = null) {
  if (storedPrice != null && storedPrice !== '') {
    return Number(storedPrice);
  }
  if (pkg?.monthlyPrice != null) {
    return Number(pkg.monthlyPrice);
  }
  if (pkg?.name) {
    return getDefaultMonthlyPriceForPackage(pkg.name);
  }
  return 0;
}

/** @param {import('../types/package').PackageRecord|null|undefined} pkg @param {string} featureKey */
export function hasPackageFeature(pkg, featureKey) {
  if (!pkg?.features) {
    return false;
  }
  return normalizePackageFeatures(pkg.features)[featureKey] === true;
}

/** @param {import('../types/package').PackageRecord|null|undefined} pkg @param {string} limitKey */
export function getPackageLimitValue(pkg, limitKey) {
  if (!pkg?.limits) {
    return 0;
  }
  return normalizePackageLimits(pkg.limits)[limitKey] ?? 0;
}

/**
 * @param {import('../types/package').PackageRecord|null|undefined} pkg
 * @param {string} limitKey
 * @param {number} currentCount
 */
export function isWithinPackageLimit(pkg, limitKey, currentCount) {
  const limit = getPackageLimitValue(pkg, limitKey);
  if (limit === 0) {
    return true;
  }
  return Number(currentCount) < limit;
}

/** @param {import('../types/package').PackageRecord[]} packages */
export function getSelectablePackagesForInstitutionCreate(packages) {
  return packages.filter(
    (row) => row.status === PACKAGE_STATUS.ACTIVE && !row.archived,
  );
}
