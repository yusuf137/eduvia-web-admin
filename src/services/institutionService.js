import { auth, db } from '../firebase/firebaseConfig';
import {
  DEFAULT_MODULES,
  buildModulesPayload,
  normalizeModules,
} from '../constants/institutionModules';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

export { DEFAULT_MODULES, normalizeModules, buildModulesPayload };

const TR_MAP = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

/** “Eflatun Sanat Merkezi” → “eflatun-sanat-merkezi” */
export function slugifyInstitutionName(raw) {
  let s = String(raw ?? '').trim();
  s = s
    .split('')
    .map((ch) => TR_MAP[ch] ?? ch)
    .join('');
  return s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function mapInstitutionDoc(d) {
  const data = d.data();
  const createdAt = data.createdAt ?? null;
  const modules = normalizeModules(data.modules);
  const plan = String(data.plan ?? '').trim();
  const planName = String(data.planName ?? '').trim();
  return {
    id: d.id,
    name: String(data.name ?? ''),
    slug: String(data.slug ?? ''),
    phone: String(data.phone ?? ''),
    email: String(data.email ?? ''),
    city: String(data.city ?? ''),
    address: String(data.address ?? ''),
    isActive: data.isActive !== false,
    plan: plan || null,
    planName: planName || null,
    modules,
    createdAt,
    createdBy: data.createdBy ?? null,
    updatedAt: data.updatedAt ?? null,
    sortMs: createdAt?.toMillis?.() ?? 0,
  };
}

function sortByCreatedAtDesc(rows) {
  return [...rows].sort((a, b) => b.sortMs - a.sortMs);
}

/** Firestore create için yalnızca kanonik modül anahtarları (legacy videos/makeup hariç). */
function buildInstitutionModulesForCreate(modules) {
  const canonical = normalizeModules(modules);
  const payload = {};
  Object.keys(DEFAULT_MODULES).forEach((key) => {
    payload[key] = canonical[key] !== false;
  });
  return payload;
}

async function syncInstitutionPublic(institutionId, { name, slug, isActive }) {
  const cleanSlug = slugifyInstitutionName(slug);
  if (!cleanSlug || !institutionId) {
    return;
  }

  const publicData = {
    institutionId: String(institutionId),
    name: String(name ?? '').trim(),
    slug: cleanSlug,
    isActive: isActive !== false,
    updatedAt: serverTimestamp(),
  };

  // eslint-disable-next-line no-console
  console.log('SYNC INSTITUTION PUBLIC DATA:', {
    ...publicData,
    updatedAt: '[serverTimestamp]',
  });
  // eslint-disable-next-line no-console
  console.log('SYNC INSTITUTION PUBLIC KEYS:', Object.keys(publicData));

  try {
    await setDoc(doc(db, 'institutionPublic', cleanSlug), publicData);
    // eslint-disable-next-line no-console
    console.log('SYNC INSTITUTION PUBLIC SUCCESS:', cleanSlug);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('SYNC INSTITUTION PUBLIC ERROR:', error.code, error.message);
    throw error;
  }
}

/** Giriş öncesi subdomain çözümlemesi (orderBy yok). */
export async function getInstitutionBySlug(slug) {
  const cleanSlug = slugifyInstitutionName(slug);
  if (!cleanSlug) {
    return null;
  }

  try {
    const publicSnap = await getDoc(doc(db, 'institutionPublic', cleanSlug));
    if (publicSnap.exists()) {
      const data = publicSnap.data();
      return {
        id: String(data.institutionId ?? ''),
        name: String(data.name ?? ''),
        slug: cleanSlug,
        isActive: data.isActive !== false,
      };
    }

    const snap = await getDocs(
      query(collection(db, 'institutions'), where('slug', '==', cleanSlug), limit(1)),
    );
    if (snap.empty) {
      return null;
    }
    return mapInstitutionDoc(snap.docs[0]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('INSTITUTION BY SLUG ERROR:', error.code, error.message);
    throw error;
  }
}

export async function fetchInstitutionById(institutionId) {
  const id = String(institutionId ?? '').trim();
  if (!id) {
    return null;
  }
  try {
    const snap = await getDoc(doc(db, 'institutions', id));
    if (!snap.exists()) {
      return null;
    }
    return mapInstitutionDoc(snap);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('INSTITUTION GET ERROR:', error.code, error.message);
    throw error;
  }
}

export async function listInstitutions() {
  try {
    const snap = await getDocs(collection(db, 'institutions'));
    return sortByCreatedAtDesc(snap.docs.map(mapInstitutionDoc));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('INSTITUTIONS LIST ERROR:', error.code, error.message);
    throw error;
  }
}

export async function isSlugTaken(slug) {
  const cleanSlug = slugifyInstitutionName(slug);
  if (!cleanSlug) {
    return false;
  }

  // eslint-disable-next-line no-console
  console.log('CHECK SLUG START:', cleanSlug);

  try {
    const publicSnap = await getDoc(doc(db, 'institutionPublic', cleanSlug));
    if (publicSnap.exists()) {
      // eslint-disable-next-line no-console
      console.log('CHECK SLUG TAKEN (institutionPublic):', cleanSlug);
      return true;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('CHECK SLUG PUBLIC ERROR:', error.code, error.message);
    throw error;
  }

  try {
    const snap = await getDocs(
      query(collection(db, 'institutions'), where('slug', '==', cleanSlug), limit(1)),
    );
    const taken = !snap.empty;
    // eslint-disable-next-line no-console
    console.log('CHECK SLUG INSTITUTIONS:', cleanSlug, taken ? 'taken' : 'available');
    return taken;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('CHECK SLUG INSTITUTIONS ERROR:', error.code, error.message);
    throw error;
  }
}

export async function createInstitution(
  { name, slug, phone, email, city, address, isActive = true, plan, planName, modules },
  { currentUserProfile } = {},
) {
  const uid = auth.currentUser?.uid;

  // eslint-disable-next-line no-console
  console.log('CREATE INSTITUTION START');
  // eslint-disable-next-line no-console
  console.log('CURRENT USER UID:', uid);
  // eslint-disable-next-line no-console
  console.log('CURRENT USER PROFILE:', currentUserProfile);
  // eslint-disable-next-line no-console
  console.log('CURRENT USER ROLE:', currentUserProfile?.role);

  if (!uid) {
    throw Object.assign(new Error('Oturum bulunamadı.'), { code: 'auth/not-authenticated' });
  }

  if (currentUserProfile?.role !== 'superAdmin') {
    throw Object.assign(new Error('Bu işlem için SuperAdmin yetkisi gerekir.'), {
      code: 'permission-denied',
    });
  }

  const cleanName = String(name ?? '').trim();
  const cleanSlug = slugifyInstitutionName(slug || name);
  if (!cleanName || !cleanSlug) {
    throw new Error('Kurum adı ve slug zorunludur.');
  }

  const modulesPayload = buildInstitutionModulesForCreate(modules);

  try {
    const taken = await isSlugTaken(cleanSlug);
    if (taken) {
      const err = new Error('Bu subdomain zaten kullanılıyor.');
      err.code = 'slug-duplicate';
      throw err;
    }
  } catch (error) {
    if (error.code === 'slug-duplicate') {
      throw error;
    }
    // eslint-disable-next-line no-console
    console.log('CREATE INSTITUTION ABORTED AT SLUG CHECK:', error.code, error.message);
    throw error;
  }

  const cleanPlan = String(plan ?? 'standard').trim() || 'standard';
  const cleanPlanName = String(planName ?? '').trim() || cleanPlan;

  const institutionData = {
    name: cleanName,
    slug: cleanSlug,
    phone: String(phone ?? '').trim(),
    email: String(email ?? '').trim(),
    city: String(city ?? '').trim(),
    address: String(address ?? '').trim(),
    isActive: isActive !== false,
    plan: cleanPlan,
    planName: cleanPlanName,
    modules: modulesPayload,
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // eslint-disable-next-line no-console
  console.log('CREATE INSTITUTION DATA:', {
    ...institutionData,
    modules: modulesPayload,
    createdAt: '[serverTimestamp]',
    updatedAt: '[serverTimestamp]',
  });
  // eslint-disable-next-line no-console
  console.log('CREATE INSTITUTION KEYS:', Object.keys(institutionData));

  let institutionRef;
  try {
    institutionRef = await addDoc(collection(db, 'institutions'), institutionData);
    // eslint-disable-next-line no-console
    console.log('CREATE INSTITUTION SUCCESS:', institutionRef.id);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('CREATE INSTITUTION ERROR:', error.code, error.message);
    throw error;
  }

  try {
    await syncInstitutionPublic(institutionRef.id, {
      name: cleanName,
      slug: cleanSlug,
      isActive: institutionData.isActive,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(
      'CREATE INSTITUTION WARNING: institution created but institutionPublic sync failed:',
      institutionRef.id,
      error.code,
      error.message,
    );
    return {
      id: institutionRef.id,
      slug: cleanSlug,
      publicSyncFailed: true,
    };
  }

  return { id: institutionRef.id, slug: cleanSlug };
}

export async function updateInstitutionModules(institutionId, modules) {
  return updateInstitutionPlanAndModules(institutionId, { modules });
}

export async function updateInstitutionPlanAndModules(
  institutionId,
  { plan, planName, modules },
) {
  const id = String(institutionId ?? '').trim();
  if (!id) {
    throw new Error('Kurum kimliği gerekli.');
  }

  const updateData = {
    updatedAt: serverTimestamp(),
  };

  if (modules != null) {
    updateData.modules = buildModulesPayload(modules);
  }
  if (plan != null) {
    updateData.plan = String(plan).trim() || 'custom';
  }
  if (planName != null) {
    updateData.planName = String(planName).trim();
  }

  // eslint-disable-next-line no-console
  console.log('WEB INSTITUTION UPDATE PLAN/MODULES:', updateData);

  try {
    await updateDoc(doc(db, 'institutions', id), updateData);
    return { id, ...updateData };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB INSTITUTION PLAN/MODULE UPDATE ERROR:', error.code, error.message);
    throw error;
  }
}
