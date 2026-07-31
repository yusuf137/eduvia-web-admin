import { DEFAULT_MODULES } from '../constants/institutionModules';
import { formatPlanPrice as formatPlanPriceValue } from '../utils/packageFormat';
import {
  getPlanDisplayLabel as getPlanDisplayLabelFromCatalog,
  isCustomModuleOverrideForPackage,
  resolvePackageForInstitution,
} from '../utils/packageResolver';

export { formatPlanPriceValue as formatPlanPrice };

/** Firestore `institutions.modules` ile uyumlu kanonik anahtarlar */
export const CANONICAL_MODULE_KEYS = Object.keys(DEFAULT_MODULES);

export const PACKAGE_PLAN_KEYS = ['starter', 'standard', 'pro', 'custom'];

function buildModules(partial) {
  const out = {};
  CANONICAL_MODULE_KEYS.forEach((key) => {
    out[key] = partial[key] === true;
  });
  return out;
}

export const PACKAGE_PRESETS = {
  starter: {
    key: 'starter',
    name: 'Başlangıç',
    description: 'Küçük kurumlar için temel yönetim paketi.',
    monthlyPrice: 1990,
    setupPrice: 7500,
    popular: false,
    modules: buildModules({
      lessons: true,
      attendance: true,
      notifications: true,
      webPanel: true,
      payments: false,
      finance: false,
      scheduleRequests: false,
      makeupLessons: false,
      videoLibrary: false,
      chat: false,
      branches: false,
    }),
    features: [
      'Öğrenci / eğitmen yönetimi',
      'Ders programı',
      'Yoklama',
      'Kayıt kodu sistemi',
      'Temel bildirimler',
      'Web admin panel',
    ],
  },
  standard: {
    key: 'standard',
    name: 'Standart',
    description: 'Ödeme ve finans takibini de isteyen kurumlar için.',
    monthlyPrice: 2990,
    setupPrice: 10000,
    popular: true,
    modules: buildModules({
      lessons: true,
      attendance: true,
      notifications: true,
      webPanel: true,
      payments: true,
      finance: true,
      scheduleRequests: true,
      makeupLessons: true,
      videoLibrary: false,
      chat: false,
      branches: false,
    }),
    features: [
      'Başlangıç paketindeki her şey',
      'Öğrenci ödemeleri',
      'Makbuz görüntüle / yazdır',
      'Finans gelir/gider',
      'Telafi talepleri',
      'Ders değişim talepleri',
      'Ders iptalleri',
      'Bildirim geçmişi',
    ],
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    description: 'Video, mesajlaşma ve gelişmiş takip isteyen kurumlar için.',
    monthlyPrice: 4490,
    setupPrice: 15000,
    popular: false,
    modules: buildModules({
      lessons: true,
      attendance: true,
      notifications: true,
      webPanel: true,
      payments: true,
      finance: true,
      scheduleRequests: true,
      makeupLessons: true,
      videoLibrary: true,
      chat: true,
      branches: true,
    }),
    features: [
      'Standart paketindeki her şey',
      'Video havuzu',
      'Mesajlaşma',
      'Branş yönetimi',
      'Gelişmiş modül seti',
      'Öncelikli destek',
    ],
  },
  custom: {
    key: 'custom',
    name: 'Özel',
    description: 'Çok şubeli veya özel ihtiyaçları olan kurumlar için.',
    monthlyPrice: null,
    setupPrice: null,
    popular: false,
    modules: buildModules(
      CANONICAL_MODULE_KEYS.reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {}),
    ),
    features: [
      'Teklif alın',
      'Çok şube',
      'Özel geliştirme',
      'Kuruma özel raporlar',
      'Öncelikli destek',
      'Geniş ölçekli kullanım',
    ],
  },
};

export function getPackagePreset(planKey) {
  const key = String(planKey ?? '').trim();
  return PACKAGE_PRESETS[key] ?? PACKAGE_PRESETS.custom;
}

export function applyPresetModules(planKey) {
  return { ...getPackagePreset(planKey).modules };
}

export function resolveInstitutionPlan(institution) {
  const rawPlan = String(institution?.plan ?? '').trim();
  const plan = PACKAGE_PLAN_KEYS.includes(rawPlan) ? rawPlan : 'custom';
  const preset = getPackagePreset(plan);
  const planName = String(institution?.planName ?? '').trim() || preset.name;
  return { plan, planName, preset };
}

export function isCustomModuleOverride(planOrPackage, modules, packages = null) {
  if (planOrPackage && typeof planOrPackage === 'object' && planOrPackage.modules) {
    return isCustomModuleOverrideForPackage(planOrPackage, modules);
  }
  if (packages?.length) {
    const institution = { plan: planOrPackage, modules };
    const pkg = resolvePackageForInstitution(institution, packages);
    return isCustomModuleOverrideForPackage(pkg, modules);
  }
  const preset = getPackagePreset(planOrPackage);
  const normalized = modules ?? {};
  return CANONICAL_MODULE_KEYS.some((key) => {
    const current = normalized[key] !== false;
    const expected = preset.modules[key] === true;
    return current !== expected;
  });
}

/** @deprecated packages parametresi ile getPlanDisplayLabelFromCatalog kullanın */
export function getPlanDisplayLabel(institution, packages = null) {
  if (packages?.length) {
    return getPlanDisplayLabelFromCatalog(institution, packages);
  }
  const { plan, planName } = resolveInstitutionPlan(institution);
  if (!institution?.plan) {
    return institution?.planName ? planName : 'Paket seçilmemiş';
  }
  const customized = isCustomModuleOverride(plan, institution?.modules);
  if (customized) {
    return `${planName} + Ek Özellikler`;
  }
  return planName;
}
