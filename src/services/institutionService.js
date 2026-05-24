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
  return {
    id: d.id,
    name: String(data.name ?? ''),
    slug: String(data.slug ?? ''),
    phone: String(data.phone ?? ''),
    email: String(data.email ?? ''),
    city: String(data.city ?? ''),
    address: String(data.address ?? ''),
    isActive: data.isActive !== false,
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

async function syncInstitutionPublic(institutionId, { name, slug, isActive }) {
  const cleanSlug = slugifyInstitutionName(slug);
  if (!cleanSlug || !institutionId) {
    return;
  }
  await setDoc(doc(db, 'institutionPublic', cleanSlug), {
    institutionId: String(institutionId),
    name: String(name ?? '').trim(),
    slug: cleanSlug,
    isActive: isActive !== false,
    updatedAt: serverTimestamp(),
  });
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
  const publicSnap = await getDoc(doc(db, 'institutionPublic', cleanSlug));
  if (publicSnap.exists()) {
    return true;
  }
  const snap = await getDocs(
    query(collection(db, 'institutions'), where('slug', '==', cleanSlug), limit(1)),
  );
  return !snap.empty;
}

export async function createInstitution({
  name,
  slug,
  phone,
  email,
  city,
  address,
  isActive = true,
  modules,
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Oturum bulunamadı.');
  }

  const cleanName = String(name ?? '').trim();
  const cleanSlug = slugifyInstitutionName(slug || name);
  if (!cleanName || !cleanSlug) {
    throw new Error('Kurum adı ve slug zorunludur.');
  }

  const modulesPayload = buildModulesPayload(modules);
  // eslint-disable-next-line no-console
  console.log('WEB INSTITUTION MODULES:', modulesPayload);

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
    console.log('WEB INSTITUTION CREATE ERROR:', error.code, error.message);
    throw error;
  }

  const institutionData = {
    name: cleanName,
    slug: cleanSlug,
    phone: String(phone ?? '').trim(),
    email: String(email ?? '').trim(),
    city: String(city ?? '').trim(),
    address: String(address ?? '').trim(),
    isActive: isActive !== false,
    modules: modulesPayload,
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // eslint-disable-next-line no-console
  console.log('WEB INSTITUTION CREATE DATA:', {
    ...institutionData,
    createdAt: '[serverTimestamp]',
    updatedAt: '[serverTimestamp]',
  });

  try {
    const ref = await addDoc(collection(db, 'institutions'), institutionData);
    await syncInstitutionPublic(ref.id, {
      name: cleanName,
      slug: cleanSlug,
      isActive: institutionData.isActive,
    });
    return { id: ref.id, slug: cleanSlug };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB INSTITUTION CREATE ERROR:', error.code, error.message);
    throw error;
  }
}

export async function updateInstitutionModules(institutionId, modules) {
  const id = String(institutionId ?? '').trim();
  if (!id) {
    throw new Error('Kurum kimliği gerekli.');
  }

  const modulesPayload = buildModulesPayload(modules);
  const updateData = {
    modules: modulesPayload,
    updatedAt: serverTimestamp(),
  };

  // eslint-disable-next-line no-console
  console.log('WEB INSTITUTION UPDATE MODULES:', updateData);

  try {
    await updateDoc(doc(db, 'institutions', id), updateData);
    return { id, modules: modulesPayload };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB INSTITUTION MODULE UPDATE ERROR:', error.code, error.message);
    throw error;
  }
}
