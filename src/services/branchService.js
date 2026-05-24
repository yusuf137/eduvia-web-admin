import { auth, db } from '../firebase/firebaseConfig';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

export function normalizeBranchName(name) {
  return String(name ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR');
}

function mapBranchDoc(d) {
  const x = d.data();
  const levels = Array.isArray(x.levels) ? x.levels.map((l) => String(l).trim()).filter(Boolean) : [];
  const createdAt = x.createdAt ?? null;
  return {
    id: d.id,
    institutionId: String(x.institutionId ?? ''),
    name: String(x.name ?? '').trim(),
    nameNormalized: normalizeBranchName(x.name),
    levels,
    isActive: x.isActive !== false,
    createdBy: String(x.createdBy ?? ''),
    createdByName: String(x.createdByName ?? ''),
    createdAt,
    createdAtLabel: createdAt?.toDate
      ? createdAt.toDate().toLocaleString('tr-TR')
      : '—',
  };
}

function sortBranchesByName(rows) {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

async function fetchBranchesRaw(institutionId) {
  const inst = String(institutionId ?? '').trim();
  if (!inst) {
    return [];
  }
  const snap = await getDocs(
    query(collection(db, 'branches'), where('institutionId', '==', inst)),
  );
  return sortBranchesByName(snap.docs.map(mapBranchDoc));
}

/** Ders/video formları: yalnızca aktif branşlar */
export async function listBranches(institutionId) {
  try {
    const rows = await fetchBranchesRaw(institutionId);
    return rows.filter((b) => b.isActive);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB BRANCHES LOAD ERROR:', error.code, error.message);
    throw error;
  }
}

/** Branş yönetimi: tüm branşlar (aktif + pasif) */
export async function fetchAllBranches(institutionId) {
  try {
    return await fetchBranchesRaw(institutionId);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB BRANCHES LOAD ERROR:', error.code, error.message);
    throw error;
  }
}

export async function findDuplicateBranchName(institutionId, name, excludeId = '') {
  const normalized = normalizeBranchName(name);
  if (!normalized) {
    return null;
  }
  const rows = await fetchBranchesRaw(institutionId);
  return (
    rows.find(
      (b) => b.nameNormalized === normalized && String(b.id) !== String(excludeId ?? ''),
    ) ?? null
  );
}

export async function createBranch({
  institutionId,
  name,
  levels,
  createdBy,
  createdByName,
}) {
  const inst = String(institutionId ?? '').trim();
  const uid = String(createdBy ?? auth.currentUser?.uid ?? '').trim();
  const n = String(name ?? '').trim();
  if (!inst) {
    throw new Error('Kurum bilgisi bulunamadı.');
  }
  if (!n) {
    throw new Error('Branş adı zorunludur.');
  }

  const dup = await findDuplicateBranchName(inst, n);
  if (dup) {
    throw new Error(`"${dup.name}" adlı branş bu kurumda zaten var.`);
  }

  const levelList = (Array.isArray(levels) ? levels : [])
    .map((l) => String(l).trim())
    .filter(Boolean);

  const branchData = {
    institutionId: inst,
    name: n,
    levels: levelList,
    isActive: true,
    createdBy: uid,
    createdByName: String(createdByName ?? '').trim(),
    createdAt: serverTimestamp(),
  };

  // eslint-disable-next-line no-console
  console.log('WEB BRANCH DATA:', branchData);

  try {
    const ref = await addDoc(collection(db, 'branches'), branchData);
    return { id: ref.id };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB BRANCH CREATE ERROR:', error.code, error.message);
    throw error;
  }
}

export async function updateBranch(branchId, payload, callerInstitutionId) {
  const id = String(branchId ?? '').trim();
  const callerInst = String(callerInstitutionId ?? '').trim();
  if (!id) {
    throw new Error('Branş bulunamadı.');
  }

  const ref = doc(db, 'branches', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Branş bulunamadı.');
  }
  const existing = snap.data();
  const inst = String(existing.institutionId ?? '').trim();
  if (callerInst && callerInst !== inst) {
    throw new Error('Bu branş başka kuruma ait; düzenlenemez.');
  }

  const nextName =
    payload.name !== undefined ? String(payload.name).trim() : String(existing.name ?? '');
  if (!nextName) {
    throw new Error('Branş adı zorunludur.');
  }

  const dup = await findDuplicateBranchName(inst, nextName, id);
  if (dup) {
    throw new Error(`"${dup.name}" adlı branş bu kurumda zaten var.`);
  }

  const updateData = {
    institutionId: inst,
    name: nextName,
    levels:
      payload.levels !== undefined
        ? (Array.isArray(payload.levels) ? payload.levels : [])
            .map((l) => String(l).trim())
            .filter(Boolean)
        : Array.isArray(existing.levels)
          ? existing.levels.map((l) => String(l).trim()).filter(Boolean)
          : [],
    isActive: payload.isActive !== undefined ? payload.isActive === true : existing.isActive === true,
    createdBy: existing.createdBy,
    createdByName: existing.createdByName,
    createdAt: existing.createdAt,
  };

  // eslint-disable-next-line no-console
  console.log('WEB BRANCH UPDATE DATA:', {
    name: updateData.name,
    levels: updateData.levels,
    isActive: updateData.isActive,
  });

  try {
    await updateDoc(ref, updateData);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB BRANCH UPDATE ERROR:', error.code, error.message);
    throw error;
  }
}

export async function deactivateBranch(branchId, callerInstitutionId) {
  return updateBranch(branchId, { isActive: false }, callerInstitutionId);
}
