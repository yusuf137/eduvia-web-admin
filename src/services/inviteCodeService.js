import { auth, db } from '../firebase/firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 8;

export const ORG_INVITE_ROLES = ['student', 'teacher', 'adminTeacher'];

const ROLE_LABELS = {
  student: 'Öğrenci',
  teacher: 'Öğretmen',
  adminTeacher: 'Admin Öğretmen',
  admin: 'Kurum Admin',
};

export function inviteRoleLabel(role) {
  return ROLE_LABELS[role] ?? role;
}

function randomInviteCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function mapInviteDoc(d) {
  const data = d.data();
  const createdAt = data.createdAt ?? null;
  return {
    id: d.id,
    code: String(data.code ?? d.id),
    role: String(data.role ?? ''),
    institutionId: String(data.institutionId ?? ''),
    institutionName: String(data.institutionName ?? ''),
    used: data.used === true,
    usedBy: data.usedBy ?? null,
    usedAt: data.usedAt ?? null,
    createdBy: data.createdBy ?? null,
    createdAt,
    sortMs: createdAt?.toMillis?.() ?? 0,
  };
}

function sortByCreatedAtDesc(rows) {
  return [...rows].sort((a, b) => b.sortMs - a.sortMs);
}

/** SuperAdmin: tüm admin davet kodları */
export async function listAdminInviteCodes(institutionId = null) {
  try {
    const snap = await getDocs(
      query(collection(db, 'inviteCodes'), where('role', '==', 'admin')),
    );
    let rows = sortByCreatedAtDesc(snap.docs.map(mapInviteDoc));
    const inst = String(institutionId ?? '').trim();
    if (inst) {
      rows = rows.filter((r) => r.institutionId === inst);
    }
    return rows;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('ADMIN CODES LIST ERROR:', error.code, error.message);
    throw error;
  }
}

export async function createAdminInviteCode(institutionId, institutionName) {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Oturum bulunamadı.');
  }
  const inst = String(institutionId ?? '').trim();
  const instName = String(institutionName ?? '').trim();
  if (!inst) {
    throw new Error('Kurum seçin.');
  }

  // eslint-disable-next-line no-console
  console.log('CREATE ADMIN INVITE CODE START:', inst);

  const maxAttempts = 25;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = randomInviteCode();
    const ref = doc(db, 'inviteCodes', code);
    const inviteCodeData = {
      code,
      role: 'admin',
      institutionId: inst,
      institutionName: instName || '—',
      used: false,
      usedBy: null,
      usedAt: null,
      createdBy: uid,
      createdAt: serverTimestamp(),
    };

    try {
      const existing = await getDoc(ref);
      if (existing.exists()) {
        continue;
      }

      // eslint-disable-next-line no-console
      console.log('CREATE ADMIN INVITE CODE DATA:', {
        ...inviteCodeData,
        createdAt: '[serverTimestamp]',
      });

      await setDoc(ref, inviteCodeData);
      // eslint-disable-next-line no-console
      console.log('CREATE ADMIN INVITE CODE SUCCESS:', code);
      return code;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('CREATE ADMIN INVITE CODE ERROR:', error.code, error.message);
      throw error;
    }
  }

  throw new Error('Benzersiz kod üretilemedi; tekrar deneyin.');
}

/** Kurum admini: kendi kurumunun davet kodları */
export async function listOrgInviteCodes(institutionId) {
  const inst = String(institutionId ?? '').trim();
  if (!inst) {
    throw new Error('Kurum bilgisi bulunamadı.');
  }
  try {
    const snap = await getDocs(
      query(collection(db, 'inviteCodes'), where('institutionId', '==', inst)),
    );
    return sortByCreatedAtDesc(snap.docs.map(mapInviteDoc));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB INVITE CODES LIST ERROR:', error.code, error.message);
    throw error;
  }
}

/**
 * Kurum admini davet kodu (student | teacher | adminTeacher).
 * @param {{ role: string, institutionId: string, institutionName?: string, callerRole: string }} params
 */
export async function createOrgInviteCode({
  role,
  institutionId,
  institutionName = '',
  callerRole,
}) {
  if (callerRole !== 'admin') {
    throw new Error('Yalnızca kurum admini davet kodu oluşturabilir.');
  }
  const inst = String(institutionId ?? '').trim();
  if (!inst) {
    throw new Error('Kurum bilgisi bulunamadı.');
  }
  const inviteRole = String(role ?? '').trim();
  if (!ORG_INVITE_ROLES.includes(inviteRole)) {
    throw new Error('Geçersiz rol. Yalnızca öğrenci, öğretmen veya admin öğretmen seçilebilir.');
  }
  if (inviteRole === 'admin' || inviteRole === 'superAdmin') {
    throw new Error('Bu rol için davet kodu oluşturulamaz.');
  }

  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('Oturum bulunamadı.');
  }

  const maxAttempts = 25;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = randomInviteCode();
    const ref = doc(db, 'inviteCodes', code);
    try {
      const existing = await getDoc(ref);
      if (existing.exists()) {
        continue;
      }
      await setDoc(ref, {
        code,
        role: inviteRole,
        institutionId: inst,
        institutionName: String(institutionName ?? '').trim(),
        used: false,
        usedBy: null,
        usedAt: null,
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
      return code;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('WEB INVITE CODE CREATE ERROR:', error.code, error.message);
      throw error;
    }
  }

  throw new Error('Benzersiz kod üretilemedi; tekrar deneyin.');
}
