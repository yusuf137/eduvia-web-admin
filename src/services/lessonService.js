import { db } from '../firebase/firebaseConfig';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';

export const LESSON_TYPES = {
  PRIVATE: 'private',
  GROUP: 'group',
};

export const LESSON_TYPE_LABELS = {
  private: 'Özel Ders',
  group: 'Grup Ders',
};

export const DURATION_HOUR_OPTIONS = [1, 2, 3];

export const WEEKDAY_OPTIONS = [
  { day: 1, label: 'Pazartesi' },
  { day: 2, label: 'Salı' },
  { day: 3, label: 'Çarşamba' },
  { day: 4, label: 'Perşembe' },
  { day: 5, label: 'Cuma' },
  { day: 6, label: 'Cumartesi' },
  { day: 7, label: 'Pazar' },
];

export const START_HOUR_OPTIONS = (() => {
  const out = [];
  for (let h = 7; h <= 21; h += 1) {
    out.push(`${String(h).padStart(2, '0')}:00`);
  }
  return out;
})();

export function normalizeLessonType(lessonType) {
  const lt = String(lessonType ?? '');
  if (lt === 'qualified') {
    return LESSON_TYPES.GROUP;
  }
  if (lt === LESSON_TYPES.PRIVATE || lt === LESSON_TYPES.GROUP || lt === 'makeup') {
    return lt;
  }
  return LESSON_TYPES.GROUP;
}

export function getLessonTypeLabel(type) {
  if (type === 'private') {
    return 'Özel Ders';
  }
  if (type === 'makeup') {
    return 'Telafi';
  }
  return 'Grup Ders';
}

export function isGroupLessonType(lessonOrType) {
  const lt =
    typeof lessonOrType === 'string' ? lessonOrType : String(lessonOrType?.lessonType ?? '');
  if (lt === LESSON_TYPES.GROUP || lt === 'qualified') {
    return true;
  }
  if (lt === LESSON_TYPES.PRIVATE || lt === 'makeup') {
    return false;
  }
  const ids =
    typeof lessonOrType === 'object' && lessonOrType
      ? Array.isArray(lessonOrType.studentIds)
        ? lessonOrType.studentIds
        : []
      : [];
  return ids.length > 1;
}

export function withNormalizedLessonTypeOnUpdate(lesson, fields) {
  const payload = { ...fields };
  if (String(lesson?.lessonType ?? '') === 'qualified') {
    payload.lessonType = LESSON_TYPES.GROUP;
  }
  return payload;
}

export function resolveLessonTypeFromStudentCount(count) {
  const n = Math.trunc(Number(count));
  if (!Number.isFinite(n) || n < 1) {
    throw new Error('Lütfen en az bir öğrenci seçin.');
  }
  return n === 1 ? LESSON_TYPES.PRIVATE : LESSON_TYPES.GROUP;
}

export function startHourOptionsForDuration(durationHours) {
  const count = Math.min(3, Math.max(1, Math.trunc(Number(durationHours) || 1)));
  return START_HOUR_OPTIONS.filter((label) => {
    const hh = parseInt(label.slice(0, 2), 10);
    return hh + count - 1 <= 21;
  });
}

export function buildHoursFromStart(startHour, count) {
  const m = String(startHour ?? '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) {
    return [];
  }
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const hh = h + i;
    out.push(`${String(hh).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return out;
}

export function resolveLessonDurationHours(lesson) {
  const fromDuration =
    typeof lesson?.duration === 'number' && !Number.isNaN(lesson.duration)
      ? Math.trunc(lesson.duration)
      : Number(lesson?.duration);
  if (Number.isFinite(fromDuration) && fromDuration >= 1 && fromDuration <= 3) {
    return fromDuration;
  }
  const hours = Array.isArray(lesson?.hours) ? lesson.hours : [];
  if (hours.length >= 1 && hours.length <= 3) {
    return hours.length;
  }
  return 1;
}

function normalizeHour(raw) {
  const s = String(raw ?? '').trim();
  if (!s) {
    return '';
  }
  if (/^\d{1,2}$/.test(s)) {
    return `${String(Number(s)).padStart(2, '0')}:00`;
  }
  const m = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) {
    return s;
  }
  return `${String(Number(m[1])).padStart(2, '0')}:${String(Number(m[2])).padStart(2, '0')}`;
}

function busySlotDocId({ teacherId, day, hour }) {
  const hourNorm = normalizeHour(hour).replace(':', '-');
  return `${String(teacherId)}_${String(day)}_${hourNorm}`;
}

function assertSameInstitution(users, institutionId) {
  const inst = String(institutionId ?? '').trim();
  for (const u of users) {
    if (String(u.institutionId ?? '') !== inst) {
      throw new Error('Seçilen kullanıcı bu kuruma ait değil.');
    }
  }
}

export async function checkTeacherBusyConflict({
  institutionId,
  teacherId,
  day,
  hours,
}) {
  const inst = String(institutionId ?? '').trim();
  const d = Math.trunc(Number(day));
  try {
    const snap = await getDocs(
      query(
        collection(db, 'teacherBusySlots'),
        where('institutionId', '==', inst),
        where('teacherId', '==', String(teacherId)),
        where('day', '==', d),
      ),
    );
    const selected = new Set((hours || []).map((h) => normalizeHour(h)).filter(Boolean));
    return snap.docs.some((docSnap) => {
      const slotHour = normalizeHour(docSnap.data()?.hour);
      return selected.has(slotHour);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB BUSY SLOT CHECK ERROR:', error.code, error.message);
    throw error;
  }
}

export async function addBusySlotsForLesson({
  lessonId,
  teacherId,
  day,
  hours,
  institutionId,
  isMakeup = false,
}) {
  const inst = String(institutionId ?? '').trim();
  const batch = writeBatch(db);

  (Array.isArray(hours) ? hours : [])
    .map((h) => normalizeHour(h))
    .filter(Boolean)
    .forEach((hour) => {
      const busySlotData = {
        institutionId: inst,
        teacherId: String(teacherId),
        day: Number(day),
        hour: normalizeHour(hour),
        lessonId: String(lessonId),
        isMakeup: isMakeup === true,
        createdAt: serverTimestamp(),
      };
      batch.set(doc(db, 'teacherBusySlots', busySlotDocId({ teacherId, day, hour })), busySlotData);
    });

  try {
    await batch.commit();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB BUSY SLOT CREATE ERROR:', error.code, error.message);
    throw error;
  }
}

export async function createLessonForAdmin({
  currentUserProfile,
  teacher,
  students,
  branch,
  day,
  startHour,
  durationHours,
  pricePerLesson,
}) {
  const inst = String(currentUserProfile?.institutionId ?? '').trim();
  if (!inst || currentUserProfile?.role !== 'admin') {
    throw new Error('Yalnızca kurum admini ders oluşturabilir.');
  }

  // eslint-disable-next-line no-console
  console.log('WEB LESSON CREATE PROFILE:', currentUserProfile);

  if (!teacher?.id) {
    throw new Error('Öğretmen seçin.');
  }
  assertSameInstitution([teacher], inst);

  const studentList = students || [];
  const ids = studentList.map((s) => String(s.id)).filter(Boolean);
  const names = studentList.map((s) => String(s.name ?? '').trim() || '(İsimsiz)');
  if (ids.length !== names.length) {
    throw new Error('Öğrenci listesi geçersiz.');
  }
  assertSameInstitution(studentList, inst);

  const lessonType = resolveLessonTypeFromStudentCount(ids.length);
  const durationNum = Math.min(3, Math.max(1, Math.trunc(Number(durationHours) || 1)));
  const hours = buildHoursFromStart(startHour, durationNum);
  if (hours.length !== durationNum) {
    throw new Error('Geçerli bir başlangıç saati ve süre seçin.');
  }

  const d = Math.trunc(Number(day));
  if (!Number.isFinite(d) || d < 1 || d > 7) {
    throw new Error('Geçersiz gün.');
  }

  let allowedDays = Array.isArray(teacher.availableDays) ? [...teacher.availableDays] : [];
  if (!allowedDays.length) {
    allowedDays = [1, 2, 3, 4, 5, 6, 7];
  }
  if (!allowedDays.includes(d)) {
    throw new Error('Eğitmen bu gün için müsait değil.');
  }

  const price = Number(pricePerLesson);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error('Ücret geçerli bir sayı olmalı (0 veya üzeri).');
  }

  const br = String(branch ?? '').trim();
  if (!br) {
    throw new Error('Branş girin.');
  }

  const hasConflict = await checkTeacherBusyConflict({
    institutionId: inst,
    teacherId: teacher.id,
    day: d,
    hours,
  });
  if (hasConflict) {
    throw new Error('Bu öğretmenin seçilen gün ve saatte başka dersi var.');
  }

  const lessonRef = doc(collection(db, 'lessons'));
  const hoursList = hours.map((h) => String(h));
  const teacherAvailableDaysList = allowedDays.map((n) => Math.trunc(Number(n)));

  const lessonData = {
    institutionId: inst,
    teacherId: String(teacher.id),
    teacherName: String(teacher.name ?? '').trim() || '(İsimsiz)',
    studentIds: ids,
    studentNames: names,
    lessonType,
    branch: br,
    day: d,
    startHour: String(hoursList[0] ?? ''),
    hours: hoursList,
    teacherAvailableDays: teacherAvailableDaysList,
    duration: durationNum,
    pricePerLesson: price,
    createdAt: serverTimestamp(),
  };

  // eslint-disable-next-line no-console
  console.log('WEB LESSON DATA:', lessonData);
  // eslint-disable-next-line no-console
  console.log('WEB LESSON DATA KEYS:', Object.keys(lessonData));

  try {
    await setDoc(lessonRef, lessonData);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB LESSON CREATE ERROR:', error.code, error.message);
    throw error;
  }

  try {
    await addBusySlotsForLesson({
      lessonId: lessonRef.id,
      teacherId: teacher.id,
      day: d,
      hours: hoursList,
      institutionId: inst,
    });
  } catch (error) {
    try {
      await deleteDoc(lessonRef);
    } catch {
      /* rollback best effort */
    }
    throw error;
  }

  return { lessonId: lessonRef.id, lessonType };
}
