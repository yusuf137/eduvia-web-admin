import { auth, db } from '../firebase/firebaseConfig';
import { PACKAGES_COLLECTION } from '../constants/packageCollection';
import {
  buildDefaultPackageFeatures,
  normalizePackageFeatures,
} from '../constants/packageFeatures';
import {
  buildDefaultPackageLimits,
  normalizePackageLimits,
} from '../constants/packageLimits';
import { PACKAGE_STATUS, normalizePackageStatus } from '../constants/packageStatus';
import { PACKAGE_PRESETS } from '../config/packagePresets';
import { slugifyInstitutionName } from './institutionService';
import { deriveModulesFromPackageFeatures, normalizePackageModules, resolvePackageModules } from '../utils/packageModuleMapper';
import { findPackageInCatalog, resolvePackageLabelFromCatalog } from '../utils/packageResolver';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const DEFAULT_CURRENCY = 'TRY';

function mapPackageDoc(docSnap) {
  const data = docSnap.data();
  const features = normalizePackageFeatures(data.features);
  return {
    id: docSnap.id,
    name: String(data.name ?? ''),
    description: String(data.description ?? ''),
    monthlyPrice: data.monthlyPrice == null ? null : Number(data.monthlyPrice),
    yearlyPrice: data.yearlyPrice == null ? null : Number(data.yearlyPrice),
    currency: String(data.currency ?? DEFAULT_CURRENCY),
    status: normalizePackageStatus(data.status),
    limits: normalizePackageLimits(data.limits),
    features,
    modules: normalizePackageModules(data.modules ?? deriveModulesFromPackageFeatures(features)),
    sortOrder: Number(data.sortOrder ?? 0),
    color: String(data.color ?? '#2563eb'),
    icon: String(data.icon ?? 'package'),
    slug: String(data.slug ?? docSnap.id),
    institutionCount: Number(data.institutionCount ?? 0),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    archived: data.archived === true,
  };
}

function buildSeedPackages() {
  return Object.entries(PACKAGE_PRESETS).map(([key, preset], index) => ({
    id: key,
    name: preset.name,
    description: preset.description,
    monthlyPrice: preset.monthlyPrice,
    yearlyPrice: preset.monthlyPrice != null ? preset.monthlyPrice * 10 : null,
    currency: DEFAULT_CURRENCY,
    status: key === 'custom' ? PACKAGE_STATUS.DRAFT : PACKAGE_STATUS.ACTIVE,
    limits: buildDefaultPackageLimits(),
    features: buildDefaultPackageFeatures(key === 'pro' || key === 'custom'),
    modules: preset.modules,
    sortOrder: index + 1,
    color: key === 'standard' ? '#2563eb' : key === 'pro' ? '#7c3aed' : '#059669',
    icon: key === 'pro' ? 'sparkles' : key === 'custom' ? 'settings' : 'package',
    slug: key,
    institutionCount: 0,
    archived: false,
  }));
}

/** Koleksiyon boşsa gömülü preset'lerden seed oluşturur. */
export async function ensurePackagesSeeded() {
  const snap = await getDocs(collection(db, PACKAGES_COLLECTION));
  if (!snap.empty) {
    return false;
  }

  const seeds = buildSeedPackages();
  await Promise.all(
    seeds.map((seed) =>
      setDoc(doc(db, PACKAGES_COLLECTION, seed.id), {
        name: seed.name,
        description: seed.description,
        monthlyPrice: seed.monthlyPrice,
        yearlyPrice: seed.yearlyPrice,
        currency: seed.currency,
        status: seed.status,
        limits: seed.limits,
        features: seed.features,
        modules: seed.modules,
        sortOrder: seed.sortOrder,
        color: seed.color,
        icon: seed.icon,
        slug: seed.slug,
        institutionCount: 0,
        archived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    ),
  );
  return true;
}

/** @param {{ includeArchived?: boolean }} [options] */
export async function getPackages(options = {}) {
  return listPackages(options);
}

/** @param {{ includeArchived?: boolean }} [options] @deprecated getPackages kullanın */
export async function listPackages(options = {}) {
  await ensurePackagesSeeded();
  const snap = await getDocs(collection(db, PACKAGES_COLLECTION));
  let rows = snap.docs.map(mapPackageDoc);
  if (!options.includeArchived) {
    rows = rows.filter((row) => !row.archived);
  }
  return rows.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'tr'));
}

/** Kurum oluşturma için yalnızca aktif paketler */
export async function getActivePackages() {
  const rows = await getPackages();
  return rows.filter((row) => row.status === PACKAGE_STATUS.ACTIVE && !row.archived);
}

/** @deprecated getActivePackages kullanın */
export async function listActivePackagesForInstitutionCreate() {
  return getActivePackages();
}

/** @param {string} packageId */
export async function getPackageById(packageId) {
  const id = String(packageId ?? '').trim();
  if (!id) return null;
  await ensurePackagesSeeded();
  const snap = await getDoc(doc(db, PACKAGES_COLLECTION, id));
  if (!snap.exists()) return null;
  const row = mapPackageDoc(snap);
  return row.archived ? null : row;
}

/** @param {string} name id, slug veya görünen ad */
export async function getPackageByName(name) {
  const raw = String(name ?? '').trim();
  if (!raw) return null;
  const packages = await getPackages({ includeArchived: true });
  return findPackageInCatalog(packages, raw);
}

/** @param {import('../types/package').PackageRecord[]} packages @param {string} packageIdOrName */
export function resolvePackageLabel(packages, packageIdOrName) {
  return resolvePackageLabelFromCatalog(packages, packageIdOrName);
}

/** @param {import('../types/package').PackageWriteInput} input */
export async function createPackage(input) {
  const name = String(input.name ?? '').trim();
  if (!name) {
    throw new Error('Paket adı zorunludur.');
  }

  const slug = slugifyInstitutionName(name) || `pkg-${Date.now()}`;
  const ref = doc(collection(db, PACKAGES_COLLECTION));
  const features = normalizePackageFeatures(input.features);
  const payload = {
    name,
    description: String(input.description ?? ''),
    monthlyPrice: input.monthlyPrice == null ? null : Number(input.monthlyPrice),
    yearlyPrice: input.yearlyPrice == null ? null : Number(input.yearlyPrice),
    currency: String(input.currency ?? DEFAULT_CURRENCY),
    status: normalizePackageStatus(input.status ?? PACKAGE_STATUS.DRAFT),
    limits: normalizePackageLimits(input.limits),
    features,
    modules: resolvePackageModules(features, input.modules),
    sortOrder: Number(input.sortOrder ?? 0),
    color: String(input.color ?? '#2563eb'),
    icon: String(input.icon ?? 'package'),
    slug,
    institutionCount: 0,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload);
  const saved = await getDoc(ref);
  return mapPackageDoc(saved);
}

/** @param {string} packageId @param {import('../types/package').PackageWriteInput} input */
export async function updatePackage(packageId, input) {
  const id = String(packageId ?? '').trim();
  if (!id) throw new Error('Paket kimliği gerekli.');

  const features = input.features ? normalizePackageFeatures(input.features) : undefined;
  const payload = {
    updatedAt: serverTimestamp(),
  };

  if (input.name != null) payload.name = String(input.name).trim();
  if (input.description != null) payload.description = String(input.description);
  if (input.monthlyPrice !== undefined) {
    payload.monthlyPrice = input.monthlyPrice == null ? null : Number(input.monthlyPrice);
  }
  if (input.yearlyPrice !== undefined) {
    payload.yearlyPrice = input.yearlyPrice == null ? null : Number(input.yearlyPrice);
  }
  if (input.currency != null) payload.currency = String(input.currency);
  if (input.status != null) payload.status = normalizePackageStatus(input.status);
  if (input.limits != null) payload.limits = normalizePackageLimits(input.limits);
  if (features) payload.features = features;
  if (features || input.modules) {
    payload.modules = resolvePackageModules(features ?? buildDefaultPackageFeatures(), input.modules);
  }
  if (input.sortOrder != null) payload.sortOrder = Number(input.sortOrder);
  if (input.color != null) payload.color = String(input.color);
  if (input.icon != null) payload.icon = String(input.icon);

  await updateDoc(doc(db, PACKAGES_COLLECTION, id), payload);
  const saved = await getDoc(doc(db, PACKAGES_COLLECTION, id));
  return mapPackageDoc(saved);
}

/** @param {string} packageId @param {string} newName */
export async function duplicatePackage(packageId, newName) {
  const source = await getPackageById(packageId);
  if (!source) throw new Error('Kaynak paket bulunamadı.');

  return createPackage({
    name: String(newName ?? `${source.name} Plus`).trim(),
    description: source.description,
    monthlyPrice: source.monthlyPrice,
    yearlyPrice: source.yearlyPrice,
    currency: source.currency,
    status: PACKAGE_STATUS.DRAFT,
    limits: source.limits,
    features: source.features,
    modules: source.modules,
    sortOrder: source.sortOrder + 1,
    color: source.color,
    icon: source.icon,
  });
}

/** @param {string} packageId */
export async function togglePackageActiveStatus(packageId) {
  const pkg = await getPackageById(packageId);
  if (!pkg) throw new Error('Paket bulunamadı.');

  const nextStatus =
    pkg.status === PACKAGE_STATUS.ACTIVE ? PACKAGE_STATUS.INACTIVE : PACKAGE_STATUS.ACTIVE;

  return updatePackage(packageId, { status: nextStatus });
}

async function countInstitutionsUsingPackage(packageId, slug) {
  const instSnap = await getDocs(collection(db, 'institutions'));
  return instSnap.docs.filter((d) => {
    const data = d.data();
    const plan = String(data.plan ?? '');
    const packageIdField = String(data.packageId ?? '');
    return packageIdField === packageId || plan === packageId || plan === slug;
  }).length;
}

/** @param {string} packageId */
export async function removePackage(packageId) {
  const id = String(packageId ?? '').trim();
  const snap = await getDoc(doc(db, PACKAGES_COLLECTION, id));
  if (!snap.exists()) throw new Error('Paket bulunamadı.');

  const pkg = mapPackageDoc(snap);
  const usageCount = await countInstitutionsUsingPackage(pkg.id, pkg.slug);

  if (usageCount > 0) {
    await updateDoc(doc(db, PACKAGES_COLLECTION, id), {
      archived: true,
      status: PACKAGE_STATUS.INACTIVE,
      institutionCount: usageCount,
      updatedAt: serverTimestamp(),
    });
    return { archived: true, usageCount };
  }

  await updateDoc(doc(db, PACKAGES_COLLECTION, id), {
    archived: true,
    updatedAt: serverTimestamp(),
  });
  return { archived: true, usageCount: 0 };
}

/** @param {import('../types/package').PackageRecord[]} packages */
export function computePackageDashboardStats(packages) {
  const visible = packages.filter((row) => !row.archived);
  const active = visible.filter((row) => row.status === PACKAGE_STATUS.ACTIVE).length;
  const inactive = visible.filter((row) => row.status === PACKAGE_STATUS.INACTIVE).length;
  const mostUsed = [...visible].sort((a, b) => b.institutionCount - a.institutionCount)[0];

  return {
    total: visible.length,
    active,
    inactive,
    mostUsedName: mostUsed?.institutionCount ? mostUsed.name : '—',
  };
}

/** @param {import('../types/package').PackageRecord} pkg */
export function computePackageRevenueStats(pkg) {
  const count = Number(pkg.institutionCount ?? 0);
  const monthly = Number(pkg.monthlyPrice ?? 0);
  const yearly = Number(pkg.yearlyPrice ?? 0);
  return {
    institutionCount: count,
    monthlyRevenue: count * monthly,
    yearlyRevenue: count * (yearly || monthly * 12),
  };
}

/** Kurum sayılarını günceller */
export async function refreshPackageInstitutionCounts() {
  const snap = await getDocs(collection(db, PACKAGES_COLLECTION));
  await Promise.all(
    snap.docs.map(async (d) => {
      const pkg = mapPackageDoc(d);
      const count = await countInstitutionsUsingPackage(pkg.id, pkg.slug);
      await updateDoc(doc(db, PACKAGES_COLLECTION, d.id), {
        institutionCount: count,
        updatedAt: serverTimestamp(),
      });
    }),
  );
}

export { DEFAULT_CURRENCY };

export {
  buildFallbackPackage,
  findPackageInCatalog,
  getPlanDisplayLabel,
  getPackageLimitValue,
  getSelectablePackagesForInstitutionCreate,
  hasPackageFeature,
  isCustomModuleOverrideForPackage,
  isWithinPackageLimit,
  resolvePackageForInstitution,
  resolvePackageLabelFromCatalog,
  resolvePackageMonthlyPrice,
} from '../utils/packageResolver';

export { formatCurrency, formatPlanPrice } from '../utils/packageFormat';
