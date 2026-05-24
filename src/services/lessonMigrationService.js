/**
 * Eski lessonType: "qualified" kayıtlarını "group" yapar (manuel tetiklenir).
 */
import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const BATCH_SIZE = 450;

/**
 * @param {{ role: string, institutionId?: string }} opts
 */
export async function countQualifiedLessons({ role, institutionId }) {
  const roleNorm = String(role ?? '').trim();
  const inst = String(institutionId ?? '').trim();

  if (roleNorm !== 'superAdmin' && !inst) {
    throw new Error('Kurum bilgisi gerekli.');
  }

  const q =
    roleNorm === 'superAdmin'
      ? query(collection(db, 'lessons'), where('lessonType', '==', 'qualified'))
      : query(
          collection(db, 'lessons'),
          where('institutionId', '==', inst),
          where('lessonType', '==', 'qualified'),
        );

  const snap = await getDocs(q);
  // eslint-disable-next-line no-console
  console.log('QUALIFIED LESSONS FOUND:', snap.size);
  return { found: snap.size, migrated: 0 };
}

/**
 * @param {{ role: string, institutionId?: string }} opts
 */
export async function migrateQualifiedLessons({ role, institutionId }) {
  const roleNorm = String(role ?? '').trim();
  const inst = String(institutionId ?? '').trim();

  if (roleNorm !== 'superAdmin' && roleNorm !== 'admin' && roleNorm !== 'adminTeacher') {
    throw new Error('Bu işlem için yetkiniz yok.');
  }
  if (roleNorm !== 'superAdmin' && !inst) {
    throw new Error('Kurum bilgisi gerekli.');
  }

  const q =
    roleNorm === 'superAdmin'
      ? query(collection(db, 'lessons'), where('lessonType', '==', 'qualified'))
      : query(
          collection(db, 'lessons'),
          where('institutionId', '==', inst),
          where('lessonType', '==', 'qualified'),
        );

  const snap = await getDocs(q);
  const found = snap.size;
  // eslint-disable-next-line no-console
  console.log('QUALIFIED LESSONS FOUND:', found);

  if (found === 0) {
    return { found: 0, migrated: 0 };
  }

  let migrated = 0;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + BATCH_SIZE);
    chunk.forEach((d) => {
      // eslint-disable-next-line no-console
      console.log('MIGRATED LESSON:', d.id);
      batch.update(doc(db, 'lessons', d.id), { lessonType: 'group' });
      migrated += 1;
    });
    await batch.commit();
  }

  return { found, migrated };
}
