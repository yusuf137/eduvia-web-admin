import { auth, db } from '../firebase/firebaseConfig';
import { createOrgInviteCode } from './inviteCodeService';
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

function mapUserDoc(d) {
  const data = d.data();
  const createdAt = data.createdAt ?? null;
  return {
    uid: d.id,
    id: d.id,
    name: String(data.name ?? '').trim() || '(İsimsiz)',
    email: String(data.email ?? '').trim(),
    phone: String(data.phone ?? '').trim(),
    parentName: String(data.parentName ?? '').trim(),
    parentPhone: String(data.parentPhone ?? '').trim(),
    notes: String(data.notes ?? '').trim(),
    role: String(data.role ?? '').trim(),
    institutionId: String(data.institutionId ?? '').trim(),
    isActive: data.isActive !== false,
    deletedAt: data.deletedAt ?? null,
    deactivatedAt: data.deactivatedAt ?? null,
    availableDays: Array.isArray(data.availableDays)
      ? [...new Set(data.availableDays.map((n) => Number(n)).filter((n) => n >= 1 && n <= 7))].sort(
          (a, b) => a - b,
        )
      : [],
    makeupCredit:
      typeof data.makeupCredit === 'number' && !Number.isNaN(data.makeupCredit)
        ? data.makeupCredit
        : null,
    createdAt,
    sortMs: createdAt?.toMillis?.() ?? 0,
  };
}

function sortByName(rows) {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

async function assertSameInstitution(userId, callerInstitutionId) {
  const ref = doc(db, 'users', String(userId));
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Kullanıcı bulunamadı.');
  }
  const inst = String(snap.data()?.institutionId ?? '').trim();
  const callerInst = String(callerInstitutionId ?? '').trim();
  if (!callerInst || inst !== callerInst) {
    throw new Error('Bu kullanıcı başka kuruma ait; işlem yapılamaz.');
  }
  return { ref, data: snap.data() };
}

/** Aktif: isActive !== false && deletedAt yok */
export function isUserActive(user) {
  return user.isActive !== false && !user.deletedAt;
}

/** Pasif veya silinmiş */
export function isUserPassive(user) {
  return user.isActive === false || Boolean(user.deletedAt);
}

export function getUserStatusLabel(user) {
  if (user.deletedAt) {
    return 'Silinmiş';
  }
  if (user.isActive === false) {
    return 'Pasif';
  }
  return 'Aktif';
}

export function getUserStatusBadgeClass(user) {
  if (user.deletedAt) {
    return 'badge--danger';
  }
  if (user.isActive === false) {
    return 'badge--muted';
  }
  return 'badge--ok';
}

export function filterByActiveStatus(users, statusFilter) {
  if (statusFilter === 'active') {
    return users.filter(isUserActive);
  }
  if (statusFilter === 'passive') {
    return users.filter(isUserPassive);
  }
  return users;
}

export async function getStudentsByInstitution(institutionId) {
  const inst = String(institutionId ?? '').trim();
  // eslint-disable-next-line no-console
  console.log('GET STUDENTS institutionId:', inst);
  if (!inst) {
    throw new Error('Kurum bilgisi bulunamadı.');
  }
  try {
    const snap = await getDocs(
      query(
        collection(db, 'users'),
        where('institutionId', '==', inst),
        where('role', '==', 'student'),
      ),
    );
    return sortByName(snap.docs.map(mapUserDoc));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('GET STUDENTS ERROR (users):', error.code, error.message);
    throw error;
  }
}

export async function getTeachersByInstitution(institutionId) {
  const inst = String(institutionId ?? '').trim();
  // eslint-disable-next-line no-console
  console.log('GET TEACHERS institutionId:', inst);
  if (!inst) {
    throw new Error('Kurum bilgisi bulunamadı.');
  }
  try {
    const snap = await getDocs(
      query(
        collection(db, 'users'),
        where('institutionId', '==', inst),
        where('role', 'in', ['teacher', 'adminTeacher']),
      ),
    );
    return sortByName(snap.docs.map(mapUserDoc));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('GET TEACHERS ERROR (users):', error.code, error.message);
    throw error;
  }
}

export async function listStudents(institutionId) {
  return getStudentsByInstitution(institutionId);
}

export async function listTeachers(institutionId) {
  return getTeachersByInstitution(institutionId);
}

export async function updateUserProfile(userId, data, callerInstitutionId) {
  // eslint-disable-next-line no-console
  console.log('UPDATE USER:', userId, data);
  const { ref } = await assertSameInstitution(userId, callerInstitutionId);
  const patch = { updatedAt: serverTimestamp() };

  if (data.name !== undefined) {
    patch.name = String(data.name).trim() || '(İsimsiz)';
  }
  if (data.phone !== undefined) {
    patch.phone = String(data.phone).trim();
  }
  if (data.parentName !== undefined) {
    patch.parentName = String(data.parentName).trim();
  }
  if (data.parentPhone !== undefined) {
    patch.parentPhone = String(data.parentPhone).trim();
  }
  if (data.notes !== undefined) {
    patch.notes = String(data.notes).trim();
  }
  if (data.isActive !== undefined) {
    patch.isActive = data.isActive === true;
  }
  if (data.availableDays !== undefined) {
    const days = Array.isArray(data.availableDays)
      ? [...new Set(data.availableDays.map((n) => Number(n)).filter((n) => n >= 1 && n <= 7))].sort(
          (a, b) => a - b,
        )
      : [];
    patch.availableDays = days;
  }

  try {
    await updateDoc(ref, patch);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('UPDATE USER ERROR (users):', error.code, error.message);
    throw error;
  }
}

export async function deactivateUser(userId, currentUserId, callerInstitutionId) {
  // eslint-disable-next-line no-console
  console.log('DEACTIVATE USER:', userId);
  const { ref } = await assertSameInstitution(userId, callerInstitutionId);
  const actor = String(currentUserId ?? auth.currentUser?.uid ?? '').trim();
  try {
    await updateDoc(ref, {
      isActive: false,
      deactivatedAt: serverTimestamp(),
      deactivatedBy: actor || null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('DEACTIVATE USER ERROR (users):', error.code, error.message);
    throw error;
  }
}

export async function reactivateUser(userId, currentUserId, callerInstitutionId) {
  // eslint-disable-next-line no-console
  console.log('REACTIVATE USER:', userId);
  const { ref } = await assertSameInstitution(userId, callerInstitutionId);
  const actor = String(currentUserId ?? auth.currentUser?.uid ?? '').trim();
  try {
    await updateDoc(ref, {
      isActive: true,
      deactivatedAt: deleteField(),
      deactivatedBy: deleteField(),
      deletedAt: deleteField(),
      deletedBy: deleteField(),
      reactivatedAt: serverTimestamp(),
      reactivatedBy: actor || null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('REACTIVATE USER ERROR (users):', error.code, error.message);
    throw error;
  }
}

export async function softDeleteUser(userId, currentUserId, callerInstitutionId) {
  // eslint-disable-next-line no-console
  console.log('SOFT DELETE USER:', userId);
  const { ref } = await assertSameInstitution(userId, callerInstitutionId);
  const actor = String(currentUserId ?? auth.currentUser?.uid ?? '').trim();
  try {
    await updateDoc(ref, {
      isActive: false,
      deletedAt: serverTimestamp(),
      deletedBy: actor || null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('SOFT DELETE USER ERROR (users):', error.code, error.message);
    throw error;
  }
}

export async function createInviteCode({
  institutionId,
  institutionName = '',
  role,
  createdBy,
  callerRole,
}) {
  // eslint-disable-next-line no-console
  console.log('CREATE INVITE CODE:', { institutionId, role, createdBy });
  const uid = String(createdBy ?? auth.currentUser?.uid ?? '').trim();
  if (!uid) {
    throw new Error('Oturum bulunamadı.');
  }
  try {
    return await createOrgInviteCode({
      role,
      institutionId,
      institutionName,
      callerRole,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('CREATE INVITE CODE ERROR (inviteCodes):', error.code, error.message);
    throw error;
  }
}

/** Ders formu: aktif öğretmenler */
export async function listActiveTeachersForLessons(institutionId) {
  try {
    const rows = await getTeachersByInstitution(institutionId);
    return rows.filter(isUserActive);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB TEACHERS LOAD ERROR:', error.code, error.message);
    throw error;
  }
}

/** Ders formu: aktif öğrenciler */
export async function listActiveStudentsForLessons(institutionId) {
  try {
    const rows = await getStudentsByInstitution(institutionId);
    return rows.filter(isUserActive);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB STUDENTS LOAD ERROR:', error.code, error.message);
    throw error;
  }
}
