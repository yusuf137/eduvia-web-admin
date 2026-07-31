import { AUDIT_MODULES } from './auditActions';

export const AUDIT_TIMELINE_FILTERS = Object.freeze({
  ALL: 'all',
  INSTITUTION: 'institution',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  RECEIPT: 'receipt',
  NOTE: 'note',
  DEMO: 'demo',
  OTHER: 'other',
});

export const AUDIT_TIMELINE_FILTER_OPTIONS = Object.freeze([
  { key: AUDIT_TIMELINE_FILTERS.ALL, label: 'Hepsi' },
  { key: AUDIT_TIMELINE_FILTERS.INSTITUTION, label: 'Kurum' },
  { key: AUDIT_TIMELINE_FILTERS.SUBSCRIPTION, label: 'Abonelik' },
  { key: AUDIT_TIMELINE_FILTERS.PAYMENT, label: 'Ödeme' },
  { key: AUDIT_TIMELINE_FILTERS.RECEIPT, label: 'Makbuz' },
  { key: AUDIT_TIMELINE_FILTERS.NOTE, label: 'Not' },
  { key: AUDIT_TIMELINE_FILTERS.DEMO, label: 'Demo' },
  { key: AUDIT_TIMELINE_FILTERS.OTHER, label: 'Diğer' },
]);

/** @param {string} module */
export function getTimelineFilterKeyForModule(module) {
  switch (module) {
    case AUDIT_MODULES.INSTITUTION:
      return AUDIT_TIMELINE_FILTERS.INSTITUTION;
    case AUDIT_MODULES.SUBSCRIPTION:
      return AUDIT_TIMELINE_FILTERS.SUBSCRIPTION;
    case AUDIT_MODULES.PAYMENT:
      return AUDIT_TIMELINE_FILTERS.PAYMENT;
    case AUDIT_MODULES.RECEIPT:
      return AUDIT_TIMELINE_FILTERS.RECEIPT;
    case AUDIT_MODULES.NOTE:
      return AUDIT_TIMELINE_FILTERS.NOTE;
    case AUDIT_MODULES.DEMO:
      return AUDIT_TIMELINE_FILTERS.DEMO;
    default:
      return AUDIT_TIMELINE_FILTERS.OTHER;
  }
}

/** @param {string} filterKey @param {string} module */
export function matchesTimelineFilter(filterKey, module) {
  if (filterKey === AUDIT_TIMELINE_FILTERS.ALL) {
    return true;
  }
  return getTimelineFilterKeyForModule(module) === filterKey;
}

/** @param {string} module */
export function getTimelineVisualCategory(module) {
  switch (module) {
    case AUDIT_MODULES.INSTITUTION:
      return 'institution';
    case AUDIT_MODULES.SUBSCRIPTION:
      return 'subscription';
    case AUDIT_MODULES.PAYMENT:
      return 'payment';
    case AUDIT_MODULES.RECEIPT:
      return 'receipt';
    case AUDIT_MODULES.NOTE:
      return 'note';
    case AUDIT_MODULES.DEMO:
      return 'demo';
    case AUDIT_MODULES.LEGAL:
      return 'legal';
    default:
      return 'other';
  }
}

export const AUDIT_TIMELINE_CATEGORY_CLASS = Object.freeze({
  institution: 'activity-timeline__dot--institution',
  subscription: 'activity-timeline__dot--subscription',
  payment: 'activity-timeline__dot--payment',
  receipt: 'activity-timeline__dot--receipt',
  note: 'activity-timeline__dot--note',
  demo: 'activity-timeline__dot--demo',
  legal: 'activity-timeline__dot--legal',
  other: 'activity-timeline__dot--other',
});
