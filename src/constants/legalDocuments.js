/** Firestore `legalDocuments` doküman kimlikleri */
export const LEGAL_DOCUMENT_IDS = {
  termsOfUse: 'terms-of-use',
  privacyPolicy: 'privacy-policy',
  kvkkDisclosure: 'kvkk-disclosure',
};

/**
 * Sabit public URL yolları — App Store / Google Play linkleri için değiştirmeyin.
 * eduviaapp.com SPA rewrite ile bu yollar index.html'e yönlendirilir.
 */
export const LEGAL_PUBLIC_PATHS = {
  termsOfUse: '/kullanici-sozlesmesi',
  privacyPolicy: '/gizlilik-politikasi',
  kvkkDisclosure: '/kvkk-aydinlatma-metni',
};

export const LEGAL_PUBLIC_BASE_URL = 'https://eduviaapp.com';

export const LEGAL_DOCUMENTS = [
  {
    id: LEGAL_DOCUMENT_IDS.termsOfUse,
    path: LEGAL_PUBLIC_PATHS.termsOfUse,
    label: 'Kullanıcı Sözleşmesi',
    defaultTitle: 'Kullanıcı Sözleşmesi',
    hint: 'Kayıt ve uygulama kullanımına ilişkin şartlar.',
  },
  {
    id: LEGAL_DOCUMENT_IDS.privacyPolicy,
    path: LEGAL_PUBLIC_PATHS.privacyPolicy,
    label: 'Gizlilik Politikası',
    defaultTitle: 'Gizlilik Politikası',
    hint: 'Kişisel verilerin işlenmesi ve korunması.',
  },
  {
    id: LEGAL_DOCUMENT_IDS.kvkkDisclosure,
    path: LEGAL_PUBLIC_PATHS.kvkkDisclosure,
    label: 'KVKK Aydınlatma Metni',
    defaultTitle: 'KVKK Aydınlatma Metni',
    hint: '6698 sayılı Kanun kapsamında aydınlatma metni.',
  },
];

/** Trailing slash ve query/hash normalize eder */
export function normalizePublicPath(pathname) {
  const raw = String(pathname ?? '').split('?')[0].split('#')[0];
  if (!raw || raw === '/') {
    return '/';
  }
  const trimmed = raw.endsWith('/') ? raw.slice(0, -1) : raw;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export const LEGAL_PUBLIC_PATH_SET = new Set(LEGAL_DOCUMENTS.map((d) => d.path));

export function getLegalDocumentById(documentId) {
  return LEGAL_DOCUMENTS.find((d) => d.id === documentId) ?? null;
}

export function getLegalDocumentByPath(pathname) {
  const normalized = normalizePublicPath(pathname);
  return LEGAL_DOCUMENTS.find((d) => d.path === normalized) ?? null;
}

export function isLegalPublicPath(pathname) {
  return LEGAL_PUBLIC_PATH_SET.has(normalizePublicPath(pathname));
}

export function getLegalPublicUrl(path) {
  return `${LEGAL_PUBLIC_BASE_URL}${path}`;
}
