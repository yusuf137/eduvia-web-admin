import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

function mapUserDoc(d) {
  const data = d.data();
  const createdAt = data.createdAt ?? null;
  return {
    uid: d.id,
    name: String(data.name ?? '').trim() || '(İsimsiz)',
    email: String(data.email ?? '').trim(),
    role: String(data.role ?? '').trim(),
    institutionId: String(data.institutionId ?? '').trim(),
    isActive: data.isActive !== false,
    deletedAt: data.deletedAt ?? null,
    makeupCredit:
      typeof data.makeupCredit === 'number' && !Number.isNaN(data.makeupCredit)
        ? data.makeupCredit
        : null,
    createdAt,
    sortMs: createdAt?.toMillis?.() ?? 0,
  };
}

function sortByCreatedAtDesc(rows) {
  return [...rows].sort((a, b) => b.sortMs - a.sortMs);
}

/** Aktif: isActive !== false && deletedAt yok */
export function isUserActive(user) {
  return user.isActive !== false && !user.deletedAt;
}

/** Pasif: isActive === false veya deletedAt var */
export function isUserPassive(user) {
  return user.isActive === false || Boolean(user.deletedAt);
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

async function listUsersByInstitution(institutionId) {
  const inst = String(institutionId ?? '').trim();
  if (!inst) {
    throw new Error('Kurum bilgisi bulunamadı.');
  }
  const snap = await getDocs(
    query(collection(db, 'users'), where('institutionId', '==', inst)),
  );
  return sortByCreatedAtDesc(snap.docs.map(mapUserDoc));
}

export async function listStudents(institutionId) {
  try {
    const rows = await listUsersByInstitution(institutionId);
    return rows.filter((u) => u.role === 'student');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB STUDENTS LIST ERROR:', error.code, error.message);
    throw error;
  }
}

export async function listTeachers(institutionId) {
  try {
    const rows = await listUsersByInstitution(institutionId);
    return rows.filter((u) => u.role === 'teacher' || u.role === 'adminTeacher');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB TEACHERS LIST ERROR:', error.code, error.message);
    throw error;
  }
}

function parseAvailableDays(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return [...new Set(raw.map((n) => Number(n)).filter((n) => n >= 1 && n <= 7))].sort((a, b) => a - b);
}

function mapTeacherForLesson(d) {
  const data = d.data();
  return {
    id: d.id,
    name: String(data.name ?? '').trim() || '(İsimsiz)',
    email: String(data.email ?? '').trim(),
    role: String(data.role ?? '').trim(),
    institutionId: String(data.institutionId ?? '').trim(),
    availableDays: parseAvailableDays(data.availableDays),
    isActive: data.isActive !== false,
    deletedAt: data.deletedAt ?? null,
  };
}

function mapStudentForLesson(d) {
  const data = d.data();
  return {
    id: d.id,
    name: String(data.name ?? '').trim() || '(İsimsiz)',
    email: String(data.email ?? '').trim(),
    role: String(data.role ?? '').trim(),
    institutionId: String(data.institutionId ?? '').trim(),
    isActive: data.isActive !== false,
    deletedAt: data.deletedAt ?? null,
  };
}

/** Ders formu: aktif öğretmenler */
export async function listActiveTeachersForLessons(institutionId) {
  try {
    const inst = String(institutionId ?? '').trim();
    if (!inst) {
      throw new Error('Kurum bilgisi bulunamadı.');
    }
    const snap = await getDocs(
      query(collection(db, 'users'), where('institutionId', '==', inst)),
    );
    return snap.docs
      .map(mapTeacherForLesson)
      .filter(
        (u) =>
          (u.role === 'teacher' || u.role === 'adminTeacher') &&
          isUserActive(u),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB TEACHERS LOAD ERROR:', error.code, error.message);
    throw error;
  }
}

/** Ders formu: aktif öğrenciler */
export async function listActiveStudentsForLessons(institutionId) {
  try {
    const inst = String(institutionId ?? '').trim();
    if (!inst) {
      throw new Error('Kurum bilgisi bulunamadı.');
    }
    const snap = await getDocs(
      query(collection(db, 'users'), where('institutionId', '==', inst)),
    );
    return snap.docs
      .map(mapStudentForLesson)
      .filter((u) => u.role === 'student' && isUserActive(u))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB STUDENTS LOAD ERROR:', error.code, error.message);
    throw error;
  }
}
