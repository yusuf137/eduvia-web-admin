import { Timestamp } from 'firebase/firestore';
import { fetchInstitutionById, updateInstitutionSubscription } from './institutionService';
import { normalizeSubscription, subscriptionToFirestore } from '../models/subscriptionModel';

/** @param {object} institution */
export function resolveInstitutionSubscription(institution) {
  if (institution?.subscription) {
    return normalizeSubscription(institution.subscription, institution);
  }
  return normalizeSubscription(
    {
      status: institution?.subscriptionStatus,
      packageName: institution?.plan,
    },
    institution,
  );
}

function addMonths(date, months = 1) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

/**
 * Başarılı ödeme sonrası kurum subscription alanını günceller.
 * @param {object} institution
 * @param {{ paymentDate: Date, nextPaymentDate?: Date|null }} paymentInfo
 */
export async function persistSubscriptionFromPayment(institution, paymentInfo) {
  const institutionId = String(institution?.id ?? '').trim();
  if (!institutionId) return;

  const current = resolveInstitutionSubscription(institution);
  const paymentDate = paymentInfo.paymentDate instanceof Date ? paymentInfo.paymentDate : new Date();
  const nextDate =
    paymentInfo.nextPaymentDate instanceof Date
      ? paymentInfo.nextPaymentDate
      : addMonths(paymentDate, 1);

  const next = {
    ...current,
    lastPaymentDate: Timestamp.fromDate(paymentDate),
    nextPaymentDate: Timestamp.fromDate(nextDate),
  };

  const payload = subscriptionToFirestore({
    ...next,
  });

  await updateInstitutionSubscription(institutionId, payload);
}

export { fetchInstitutionById };
