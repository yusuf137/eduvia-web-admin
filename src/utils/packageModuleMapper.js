import { DEFAULT_MODULES } from '../constants/institutionModules';
import { PACKAGE_FEATURE_KEYS } from '../constants/packageFeatures';

/**
 * Paket özelliklerinden kurum modüllerine türetme.
 * @param {Record<string, boolean>} features
 * @returns {Record<string, boolean>}
 */
export function deriveModulesFromPackageFeatures(features = {}) {
  const modules = { ...DEFAULT_MODULES };

  modules.lessons = true;
  modules.attendance = true;
  modules.webPanel = true;
  modules.notifications = features.notifications === true;
  modules.payments = features.finance === true || features.studentPaymentTracking === true;
  modules.finance = features.finance === true;
  modules.scheduleRequests = features.weeklySchedule === true;
  modules.makeupLessons = features.lessonReminders === true;
  modules.videoLibrary = features.videoPool === true || features.videoTracking === true;
  modules.chat = features.multiAdmin === true;
  modules.branches = features.multiBranch === true;

  return modules;
}

/** @param {Record<string, boolean>} modules */
export function normalizePackageModules(modules) {
  const base = { ...DEFAULT_MODULES };
  Object.keys(base).forEach((key) => {
    base[key] = modules?.[key] === true;
  });
  return base;
}

/** @param {Record<string, boolean>} features @param {Record<string, boolean>|null} [modulesOverride] */
export function resolvePackageModules(features, modulesOverride = null) {
  if (modulesOverride && typeof modulesOverride === 'object') {
    return normalizePackageModules(modulesOverride);
  }
  return deriveModulesFromPackageFeatures(features);
}

/** Paket özellik listesi doğrulama */
export function isKnownPackageFeatureKey(key) {
  return PACKAGE_FEATURE_KEYS.includes(key);
}
