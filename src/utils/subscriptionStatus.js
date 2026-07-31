import { getSubscriptionDisplayStatus } from '../services/subscriptionService';
import {
  getSubscriptionStatusMetaFromKey,
  resolveEffectiveSubscriptionStatus,
} from '../constants/subscriptionStatus';

export function getSubscriptionStatusMeta(subscription, now = new Date()) {
  const key = subscription
    ? resolveEffectiveSubscriptionStatus(subscription, now)
    : getSubscriptionDisplayStatus(subscription, now);
  return getSubscriptionStatusMetaFromKey(key);
}
