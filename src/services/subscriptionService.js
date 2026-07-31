import { auth, db } from '../firebase/firebaseConfig';
import {
  DEFAULT_TRIAL_DAYS,
  SUBSCRIPTION_STATUS,
  addDays,
  normalizeSubscriptionStatus,
  resolveEffectiveSubscriptionStatus,
} from '../constants/subscriptionStatus';
import { getDefaultMonthlyPriceForPackage, normalizePackageName } from '../constants/packageType';
import { getPackages } from './packageService';
import {
  resolvePackageForInstitution,
  resolvePackageMonthlyPrice,
} from '../utils/packageResolver';
import {
  buildDefaultSubscription,
  normalizeSubscription,
  subscriptionToFirestore,
  toSubscriptionListRow,
} from '../models/subscriptionModel';
import { fetchInstitutionById, updateInstitutionSubscription } from './institutionService';
import { logSubscriptionHistory } from './subscriptionHistoryService';
import { auditLogger } from './auditLogger';
import { AUDIT_MODULES } from '../constants/auditActions';
import {
  buildSubscriptionAuditDescription,
  resolveSubscriptionAuditAction,
  serializeSubscriptionSnapshot,
} from '../utils/auditSubscriptionHelpers';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

const LEGACY_SUBSCRIPTIONS = 'institutionSubscriptions';
const PAYMENTS = 'institutionSubscriptionPayments';

function mapTimestamp(value) {
  if (!value) return null;
  if (value instanceof Timestamp) return value;
  if (value?.toDate) return value;
  return null;
}

function mapPaymentDoc(d) {
  const data = d.data();
  return {
    id: d.id,
    institutionId: String(data.institutionId ?? ''),
    subscriptionId: String(data.subscriptionId ?? ''),
    amount: Number(data.amount ?? 0),
    discount: Number(data.discount ?? 0),
    paymentType: String(data.paymentType ?? 'other'),
    description: String(data.description ?? ''),
    paymentDate: mapTimestamp(data.paymentDate),
    createdAt: mapTimestamp(data.createdAt),
    createdByName: String(data.createdByName ?? ''),
  };
}

function addMonths(date, months = 1) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

/** @param {object} subscription */
export function getSubscriptionDisplayStatus(subscription, now = new Date()) {
  return resolveEffectiveSubscriptionStatus(
    {
      subscriptionStatus: subscription?.status,
      status: subscription?.status,
      endDate: subscription?.endDate,
      trialEndDate: subscription?.endDate,
    },
    now,
  );
}

export function isSubscriptionOverdue(subscription, now = new Date()) {
  const status = getSubscriptionDisplayStatus(subscription, now);
  if (status !== SUBSCRIPTION_STATUS.ACTIVE || !subscription.nextPaymentDate?.toDate) {
    return false;
  }
  const next = subscription.nextPaymentDate.toDate();
  next.setHours(23, 59, 59, 999);
  return next < now;
}

async function readLegacySubscriptionDoc(institutionId) {
  const snap = await getDoc(doc(db, LEGACY_SUBSCRIPTIONS, institutionId));
  if (!snap.exists()) return null;
  return snap.data();
}

async function syncLegacySubscriptionMirror(institutionId, institutionName, subscription) {
  const id = String(institutionId ?? '').trim();
  if (!id) return;
  await setDoc(
    doc(db, LEGACY_SUBSCRIPTIONS, id),
    {
      institutionId: id,
      institutionName: String(institutionName ?? ''),
      package: subscription.packageName,
      packageName: subscription.packageName,
      monthlyFee: subscription.monthlyPrice ?? 0,
      monthlyPrice: subscription.monthlyPrice ?? null,
      subscriptionStatus: subscription.status,
      status: subscription.status,
      startDate: subscription.startDate ?? null,
      endDate: subscription.endDate ?? null,
      renewalDate: subscription.endDate ?? null,
      trialEndDate: subscription.endDate ?? null,
      lastPaymentDate: subscription.lastPaymentDate ?? null,
      nextPaymentDate: subscription.nextPaymentDate ?? null,
      autoRenew: subscription.autoRenew === true,
      cancelledAt: subscription.cancelledAt ?? null,
      suspendedAt: subscription.suspendedAt ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * @param {object} institution
 * @param {object|null} legacyDoc
 * @param {import('../types/package').PackageRecord[]|null} [packages]
 */
function resolveInstitutionSubscription(institution, legacyDoc = null, packages = null) {
  if (institution?.subscription) {
    return normalizeSubscription(institution.subscription, institution, packages);
  }
  if (legacyDoc) {
    return normalizeSubscription(legacyDoc, institution, packages);
  }
  return normalizeSubscription(
    {
      status: institution?.subscriptionStatus,
      packageName: institution?.plan,
    },
    institution,
    packages,
  );
}

export async function fetchSubscriptionByInstitutionId(institutionId) {
  const institution = await fetchInstitutionById(institutionId);
  if (!institution) return null;
  const packages = await getPackages({ includeArchived: true });
  const legacy = await readLegacySubscriptionDoc(institutionId);
  const subscription = resolveInstitutionSubscription(institution, legacy, packages);
  return toSubscriptionListRow(institution.id, institution.name, subscription, {
    packageId: institution.packageId ?? null,
    plan: institution.plan ?? null,
  });
}

export async function listSubscriptions() {
  const packages = await getPackages({ includeArchived: true });
  const snap = await getDocs(collection(db, 'institutions'));
  const rows = await Promise.all(
    snap.docs.map(async (d) => {
      const institution = { id: d.id, ...d.data() };
      const legacy = await readLegacySubscriptionDoc(d.id);
      const subscription = resolveInstitutionSubscription(institution, legacy, packages);
      return toSubscriptionListRow(
        d.id,
        String(institution.name ?? ''),
        subscription,
        {
          packageId: institution.packageId ?? null,
          plan: institution.plan ?? null,
        },
      );
    }),
  );
  return rows.sort((a, b) => a.institutionName.localeCompare(b.institutionName, 'tr'));
}

export async function listSubscriptionPayments(institutionId) {
  const id = String(institutionId ?? '').trim();
  const snap = id
    ? await getDocs(query(collection(db, PAYMENTS), where('institutionId', '==', id)))
    : await getDocs(collection(db, PAYMENTS));
  return snap.docs
    .map(mapPaymentDoc)
    .sort((a, b) => (b.paymentDate?.toMillis?.() ?? 0) - (a.paymentDate?.toMillis?.() ?? 0));
}

/**
 * Kurumda subscription yoksa varsayılan trial oluşturur.
 */
export async function ensureSubscriptionForInstitution(institution) {
  const institutionId = String(institution?.id ?? '').trim();
  if (!institutionId) {
    throw new Error('Kurum kimliği gerekli.');
  }

  const fresh = await fetchInstitutionById(institutionId);
  const target = fresh ?? institution;
  const packages = await getPackages({ includeArchived: true });

  if (target?.subscription?.status) {
    const sub = normalizeSubscription(target.subscription, target, packages);
    await syncLegacySubscriptionMirror(institutionId, target.name, sub);
    return toSubscriptionListRow(institutionId, target.name, sub, {
      packageId: target.packageId ?? null,
      plan: target.plan ?? null,
    });
  }

  const legacy = await readLegacySubscriptionDoc(institutionId);
  if (legacy) {
    const migrated = normalizeSubscription(legacy, target, packages);
    await persistSubscription(institutionId, target.name, migrated, {
      reason: 'Legacy abonelik kaydı nested modele taşındı',
      skipHistory: true,
    });
    return fetchSubscriptionByInstitutionId(institutionId);
  }

  const defaults = buildDefaultSubscription(target, packages);
  const start = defaults._defaultStart ?? new Date();
  const resolvedPkg = resolvePackageForInstitution(target, packages);
  const newSub = normalizeSubscription(
    {
      packageName: defaults.packageName,
      status: SUBSCRIPTION_STATUS.TRIAL,
      monthlyPrice:
        resolvePackageMonthlyPrice(resolvedPkg, null)
        || getDefaultMonthlyPriceForPackage(defaults.packageName),
      startDate: Timestamp.fromDate(start),
      endDate: Timestamp.fromDate(addDays(start, DEFAULT_TRIAL_DAYS)),
      autoRenew: false,
    },
    target,
    packages,
  );

  await persistSubscription(institutionId, target.name, newSub, {
    reason: 'İlk abonelik kaydı oluşturuldu',
    isCreate: true,
  });
  return fetchSubscriptionByInstitutionId(institutionId);
}

export async function bootstrapSubscriptionsFromInstitutions(institutions) {
  const results = await Promise.all(
    institutions.map((institution) => ensureSubscriptionForInstitution(institution)),
  );
  await expireTrialSubscriptionsIfNeeded(results);
  return results.filter(Boolean);
}

async function persistSubscription(
  institutionId,
  institutionName,
  subscription,
  { reason = '', isCreate = false, skipHistory = false, oldSubscription = null } = {},
) {
  const id = String(institutionId ?? '').trim();
  const now = serverTimestamp();
  const previous = oldSubscription ?? null;

  const payload = subscriptionToFirestore({
    ...subscription,
    updatedAt: now,
    createdAt: isCreate ? now : subscription.createdAt ?? now,
  });

  await updateInstitutionSubscription(id, payload);
  await syncLegacySubscriptionMirror(id, institutionName, {
    ...subscription,
    createdAt: payload.createdAt ?? subscription.createdAt,
    updatedAt: payload.updatedAt ?? subscription.updatedAt,
  });

  if (!skipHistory) {
    await logSubscriptionHistory({
      institutionId: id,
      oldStatus: previous?.status ?? null,
      newStatus: subscription.status,
      oldPackage: previous?.packageName ?? null,
      newPackage: subscription.packageName,
      reason,
    });

    auditLogger.log({
      action: resolveSubscriptionAuditAction(subscription.status),
      module: AUDIT_MODULES.SUBSCRIPTION,
      institutionId: id,
      institutionName: institutionName || '',
      description: buildSubscriptionAuditDescription(
        institutionName,
        previous,
        subscription,
        reason,
      ),
      oldData: serializeSubscriptionSnapshot(previous),
      newData: serializeSubscriptionSnapshot(subscription),
    });
  }
}

export async function setSubscriptionStatus(institutionId, subscriptionStatus, extraPatch = {}) {
  const institution = await fetchInstitutionById(institutionId);
  if (!institution) throw new Error('Kurum bulunamadı.');

  const packages = await getPackages({ includeArchived: true });
  const current = resolveInstitutionSubscription(institution, null, packages);
  const status = normalizeSubscriptionStatus(subscriptionStatus);
  const next = { ...current, status, ...extraPatch };

  if (status === SUBSCRIPTION_STATUS.SUSPENDED && !next.suspendedAt) {
    next.suspendedAt = Timestamp.fromDate(new Date());
  }
  if (status === SUBSCRIPTION_STATUS.CANCELLED && !next.cancelledAt) {
    next.cancelledAt = Timestamp.fromDate(new Date());
  }
  if (status === SUBSCRIPTION_STATUS.ACTIVE) {
    next.suspendedAt = next.suspendedAt ?? null;
  }

  await persistSubscription(institutionId, institution.name, next, {
    reason: extraPatch.reason ?? `Durum ${current.status} → ${status}`,
    oldSubscription: current,
  });
  return fetchSubscriptionByInstitutionId(institutionId);
}

export async function updateSubscription(institutionId, patch) {
  const institution = await fetchInstitutionById(institutionId);
  if (!institution) throw new Error('Kurum bulunamadı.');

  const packages = await getPackages({ includeArchived: true });
  const current = resolveInstitutionSubscription(institution, null, packages);
  const nextStatus = patch.subscriptionStatus != null
    ? normalizeSubscriptionStatus(patch.subscriptionStatus)
    : current.status;

  /** @type {import('../models/subscriptionModel').InstitutionSubscription} */
  const next = {
    ...current,
    status: nextStatus,
    packageName: patch.packageName != null
      ? normalizePackageName(patch.packageName)
      : patch.package != null
        ? normalizePackageName(patch.package)
        : current.packageName,
    monthlyPrice: patch.monthlyPrice != null
      ? Number(patch.monthlyPrice)
      : patch.monthlyFee != null
        ? Number(patch.monthlyFee)
        : current.monthlyPrice,
    autoRenew: patch.autoRenew != null ? patch.autoRenew === true : current.autoRenew,
  };

  if (patch.startDate instanceof Date) next.startDate = Timestamp.fromDate(patch.startDate);
  if (patch.endDate instanceof Date) next.endDate = Timestamp.fromDate(patch.endDate);
  if (patch.trialEndDate instanceof Date) next.endDate = Timestamp.fromDate(patch.trialEndDate);
  if (patch.lastPaymentDate instanceof Date) {
    next.lastPaymentDate = Timestamp.fromDate(patch.lastPaymentDate);
  }
  if (patch.nextPaymentDate instanceof Date) {
    next.nextPaymentDate = Timestamp.fromDate(patch.nextPaymentDate);
  }

  if (nextStatus === SUBSCRIPTION_STATUS.SUSPENDED) {
    next.suspendedAt = Timestamp.fromDate(new Date());
  }
  if (nextStatus === SUBSCRIPTION_STATUS.CANCELLED) {
    next.cancelledAt = Timestamp.fromDate(new Date());
  }

  await persistSubscription(institutionId, institution.name, next, {
    reason: patch.reason ?? 'Abonelik güncellendi',
    oldSubscription: current,
  });
  return fetchSubscriptionByInstitutionId(institutionId);
}

export async function suspendSubscription(institutionId) {
  return setSubscriptionStatus(institutionId, SUBSCRIPTION_STATUS.SUSPENDED, {
    reason: 'Abonelik askıya alındı',
  });
}

export async function activateSubscription(institutionId) {
  return setSubscriptionStatus(institutionId, SUBSCRIPTION_STATUS.ACTIVE, {
    reason: 'Abonelik aktif edildi',
  });
}

export async function cancelSubscription(institutionId) {
  return setSubscriptionStatus(institutionId, SUBSCRIPTION_STATUS.CANCELLED, {
    reason: 'Abonelik iptal edildi',
  });
}

/** @deprecated */
export async function deactivateSubscription(institutionId) {
  return suspendSubscription(institutionId);
}

export async function expireTrialSubscriptionsIfNeeded(subscriptions, now = new Date()) {
  const toExpire = subscriptions.filter((row) => {
    const effective = getSubscriptionDisplayStatus(row, now);
    return row.status === SUBSCRIPTION_STATUS.TRIAL && effective === SUBSCRIPTION_STATUS.EXPIRED;
  });

  await Promise.all(
    toExpire.map((row) =>
      setSubscriptionStatus(row.institutionId, SUBSCRIPTION_STATUS.EXPIRED, {
        reason: 'Trial süresi doldu (otomatik)',
      }),
    ),
  );
  return toExpire.length;
}

export async function addSubscriptionPayment(institutionId, input) {
  const id = String(institutionId ?? '').trim();
  if (!id) throw new Error('Kurum kimliği gerekli.');

  const institution = await fetchInstitutionById(id);
  if (!institution) throw new Error('Kurum bulunamadı.');

  const packages = await getPackages({ includeArchived: true });
  const current = resolveInstitutionSubscription(institution, null, packages);
  const amount = Number(input.amount ?? 0);
  const discount = Number(input.discount ?? 0);
  const paymentDate = input.paymentDate instanceof Date ? input.paymentDate : new Date();

  await addDoc(collection(db, PAYMENTS), {
    institutionId: id,
    subscriptionId: id,
    amount,
    discount,
    paymentType: String(input.paymentType ?? 'other'),
    description: String(input.description ?? ''),
    paymentDate: Timestamp.fromDate(paymentDate),
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid ?? null,
    createdByName: String(input.createdByName ?? auth.currentUser?.displayName ?? 'SuperAdmin'),
  });

  const next = {
    ...current,
    lastPaymentDate: Timestamp.fromDate(paymentDate),
    nextPaymentDate: Timestamp.fromDate(addMonths(paymentDate, 1)),
  };

      await persistSubscription(id, institution.name, next, {
        reason: 'Ödeme kaydı eklendi',
        oldSubscription: current,
        skipHistory: true,
      });

  return fetchSubscriptionByInstitutionId(id);
}

export function computeSubscriptionDashboardStats(subscriptions, payments, now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const activeCount = subscriptions.filter(
    (item) => getSubscriptionDisplayStatus(item, now) === SUBSCRIPTION_STATUS.ACTIVE,
  ).length;

  const expectedRevenue = subscriptions
    .filter((item) => {
      const status = getSubscriptionDisplayStatus(item, now);
      return status === SUBSCRIPTION_STATUS.ACTIVE || status === SUBSCRIPTION_STATUS.TRIAL;
    })
    .reduce((sum, item) => sum + Number(item.monthlyPrice ?? item.monthlyFee ?? 0), 0);

  const collectedThisMonth = payments
    .filter((payment) => {
      const date = payment.paymentDate?.toDate?.();
      return date && date >= monthStart && date <= monthEnd;
    })
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

  const overdueCount = subscriptions.filter((item) => isSubscriptionOverdue(item, now)).length;

  return { activeCount, expectedRevenue, collectedThisMonth, overdueCount };
}

export function getPackageLabel(packageKey) {
  return normalizePackageName(packageKey);
}
