import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { LESSON_CANCELLATIONS_COLLECTION, isEffectiveCancellationStatus } from '../constants/lessonCancellationCollection';

export const WEEKDAY_OPTIONS = [
  { day: 1, label: 'Pazartesi' },
  { day: 2, label: 'Salı' },
  { day: 3, label: 'Çarşamba' },
  { day: 4, label: 'Perşembe' },
  { day: 5, label: 'Cuma' },
  { day: 6, label: 'Cumartesi' },
  { day: 7, label: 'Pazar' },
];

/** Mobil AdminTeacherScheduleScreen ile aynı aralık: 08:00–23:00 */
export const SCHEDULE_HOURS = Array.from({ length: 16 }, (_, i) =>
  `${String(i + 8).padStart(2, '0')}:00`,
);

/** Grid anahtarı için saat: "9:00" → "09:00" */
export function normalizeHourKey(hour) {
  const raw = String(hour ?? '').trim();
  const m = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) {
    return raw;
  }
  return `${String(parseInt(m[1], 10)).padStart(2, '0')}:${m[2]}`;
}

export const LESSON_TYPE_LABELS = {
  private: 'Özel Ders',
  group: 'Grup Ders',
  makeup: 'Telafi',
};

export function normalizeLessonType(lessonType) {
  const lt = String(lessonType ?? '');
  if (lt === 'qualified') {
    return 'group';
  }
  if (lt === 'private' || lt === 'group' || lt === 'makeup') {
    return lt;
  }
  return 'group';
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
  if (lt === 'group' || lt === 'qualified') {
    return true;
  }
  if (lt === 'private' || lt === 'makeup') {
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

function formatDateKeyLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function weekStartDateMondayLocal(date = new Date()) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return formatDateKeyLocal(copy);
}

export function addWeeks(dateKey, deltaWeeks) {
  const [y, m, d] = String(dateKey).split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + deltaWeeks * 7);
  return formatDateKeyLocal(dt);
}

export function weekTitle(weekStartDate) {
  const [y, m, d] = String(weekStartDate).split('-').map(Number);
  const start = new Date(y, (m || 1) - 1, d || 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (dt) =>
    dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  return `${fmt(start)} - ${fmt(end)}`;
}

export function weekStartDateFromDateKey(dateKey) {
  const dk = String(dateKey ?? '').trim();
  if (dk.length !== 10) {
    return weekStartDateMondayLocal();
  }
  const [y, m, d] = dk.split('-').map(Number);
  return weekStartDateMondayLocal(new Date(y, (m || 1) - 1, d || 1));
}

function mapLessonDoc(d) {
  const data = d.data();
  const ids = Array.isArray(data.studentIds) ? data.studentIds.map(String) : [];
  const names = Array.isArray(data.studentNames) ? data.studentNames.map(String) : [];
  const hours = Array.isArray(data.hours) ? data.hours.map(String) : [];
  const lt = String(data.lessonType ?? '');
  const lessonType =
    lt === 'private'
      ? 'private'
      : lt === 'makeup'
        ? 'makeup'
        : lt === 'group' || lt === 'qualified'
          ? 'group'
          : ids.length > 1
            ? 'group'
            : 'private';

  return {
    id: d.id,
    institutionId: String(data.institutionId ?? '').trim(),
    teacherId: String(data.teacherId ?? ''),
    teacherName: String(data.teacherName ?? '').trim(),
    studentIds: ids,
    studentNames: names,
    lessonType,
    isMakeup: data.isMakeup === true || lessonType === 'makeup',
    branch: String(data.branch ?? '').trim(),
    day: (() => {
      const n = typeof data.day === 'number' ? data.day : Number(data.day);
      return Number.isInteger(n) && n >= 1 && n <= 7 ? n : 0;
    })(),
    startHour: String(data.startHour ?? ''),
    hours,
    duration: typeof data.duration === 'number' ? data.duration : Number(data.duration) || 0,
    pricePerLesson:
      typeof data.pricePerLesson === 'number' ? data.pricePerLesson : Number(data.pricePerLesson) || 0,
    createdAt: data.createdAt ?? null,
  };
}

function mapOverrideDoc(d) {
  const data = d.data();
  return {
    id: d.id,
    institutionId: String(data.institutionId ?? '').trim(),
    lessonId: String(data.lessonId ?? ''),
    studentId: String(data.studentId ?? ''),
    teacherId: String(data.teacherId ?? ''),
    originalDay: Number(data.originalDay) || 0,
    originalHours: Array.isArray(data.originalHours) ? data.originalHours.map(String) : [],
    overrideDay: Number(data.overrideDay) || 0,
    overrideHours: Array.isArray(data.overrideHours) ? data.overrideHours.map(String) : [],
    weekStartDate: String(data.weekStartDate ?? '').trim(),
    requestId: String(data.requestId ?? ''),
    createdAt: data.createdAt ?? null,
  };
}

function mapCancellationDoc(d) {
  const data = d.data();
  return {
    id: d.id,
    institutionId: String(data.institutionId ?? '').trim(),
    studentId: String(data.studentId ?? ''),
    lessonId: String(data.lessonId ?? ''),
    teacherId: String(data.teacherId ?? ''),
    lessonDate: String(data.lessonDate ?? '').trim(),
    weekStartDate: String(data.weekStartDate ?? '').trim(),
    status: String(data.status ?? '').trim(),
    lessonHours: Array.isArray(data.lessonHours) ? data.lessonHours.map(String) : [],
  };
}

export function normalizeHours(lesson) {
  if (Array.isArray(lesson.hours) && lesson.hours.length) {
    return lesson.hours.map((h) => normalizeHourKey(h));
  }
  if (lesson.startHour) {
    return [normalizeHourKey(lesson.startHour)];
  }
  return [];
}

export function formatHoursDisplay(hours) {
  const list = normalizeHours({ hours });
  if (!list.length) {
    return '—';
  }
  return list.join(' · ');
}

function filterOverridesForWeek(overrides, weekStartDate) {
  const ws = String(weekStartDate ?? '').trim();
  return (overrides || []).filter((ov) => String(ov.weekStartDate ?? '') === ws);
}

function filterCancellationsForWeek(cancellations, weekStartDate, teacherId = null) {
  const ws = String(weekStartDate ?? '').trim();
  const tid = teacherId ? String(teacherId) : null;
  return (cancellations || []).filter((c) => {
    if (!isEffectiveCancellationStatus(c.status)) {
      return false;
    }
    if (tid && String(c.teacherId ?? '') !== tid) {
      return false;
    }
    const cWeek = String(c.weekStartDate ?? '').trim();
    if (cWeek) {
      return cWeek === ws;
    }
    return weekStartDateFromDateKey(c.lessonDate) === ws;
  });
}

/** Mobil ile aynı: override uygula, eski saatte normal dersi gösterme */
export function applyLessonOverridesForDisplay(lessons, overrides) {
  const byLessonId = new Map();
  (overrides || []).forEach((ov) => {
    const lid = String(ov.lessonId ?? '');
    if (!lid) {
      return;
    }
    if (!byLessonId.has(lid)) {
      byLessonId.set(lid, []);
    }
    byLessonId.get(lid).push(ov);
  });

  const output = [];
  (lessons || []).forEach((lesson) => {
    const related = byLessonId.get(String(lesson.id)) ?? [];
    if (!related.length) {
      output.push({
        ...lesson,
        sourceType: 'lesson',
        baseLessonId: String(lesson.id),
        overrideDocId: null,
        isTemporary: false,
      });
      return;
    }

    const studentIds = Array.isArray(lesson.studentIds) ? lesson.studentIds.map(String) : [];
    const studentNames = Array.isArray(lesson.studentNames) ? lesson.studentNames.map(String) : [];
    const oneToOne = studentIds.length === 1;
    const first = related[0];

    if (oneToOne && String(first.studentId ?? '') === String(studentIds[0] ?? '')) {
      output.push({
        ...lesson,
        sourceType: 'override',
        baseLessonId: String(lesson.id),
        overrideDocId: String(first.id ?? ''),
        day: Number(first.overrideDay) || lesson.day,
        hours: Array.isArray(first.overrideHours) ? first.overrideHours.map(String) : lesson.hours,
        startHour:
          Array.isArray(first.overrideHours) && first.overrideHours.length
            ? String(first.overrideHours[0])
            : lesson.startHour,
        isTemporary: true,
      });
      return;
    }

    const overriddenStudentIds = new Set(related.map((ov) => String(ov.studentId ?? '')));
    const remainingPairs = studentIds
      .map((sid, idx) => ({ sid, sname: studentNames[idx] ?? '(İsimsiz)' }))
      .filter((p) => !overriddenStudentIds.has(String(p.sid)));

    if (remainingPairs.length > 0) {
      output.push({
        ...lesson,
        sourceType: 'lesson',
        baseLessonId: String(lesson.id),
        overrideDocId: null,
        studentIds: remainingPairs.map((p) => p.sid),
        studentNames: remainingPairs.map((p) => p.sname),
        isTemporary: false,
      });
    }

    related.forEach((ov) => {
      const sid = String(ov.studentId ?? '');
      const idx = studentIds.indexOf(sid);
      const sname = idx >= 0 ? studentNames[idx] : '(İsimsiz)';
      output.push({
        ...lesson,
        sourceType: 'override',
        baseLessonId: String(lesson.id),
        overrideDocId: String(ov.id ?? ''),
        id: `${lesson.id}__override__${ov.id}`,
        day: Number(ov.overrideDay) || lesson.day,
        hours: Array.isArray(ov.overrideHours) ? ov.overrideHours.map(String) : [],
        startHour:
          Array.isArray(ov.overrideHours) && ov.overrideHours.length
            ? String(ov.overrideHours[0])
            : '',
        studentIds: [sid],
        studentNames: [sname],
        isTemporary: true,
      });
    });
  });

  return output;
}

function buildCancellationStudentMap(cancellations, weekStartDate) {
  const map = new Map();
  filterCancellationsForWeek(cancellations, weekStartDate).forEach((c) => {
    const lid = String(c.lessonId ?? '');
    const sid = String(c.studentId ?? '');
    if (!lid || !sid) {
      return;
    }
    if (!map.has(lid)) {
      map.set(lid, new Set());
    }
    map.get(lid).add(sid);
  });
  return map;
}

function isPrivateLesson(lesson) {
  if (isGroupLessonType(lesson)) {
    return false;
  }
  const lt = String(lesson.lessonType ?? '');
  if (lt === 'private' || lt === 'makeup') {
    return true;
  }
  const ids = Array.isArray(lesson.studentIds) ? lesson.studentIds : [];
  return ids.length <= 1;
}

export function applyCancellationsToLessonsForWeek(lessons, cancellations, weekStartDate) {
  const cancelMap = buildCancellationStudentMap(cancellations, weekStartDate);
  const visible = [];

  (lessons || []).forEach((lesson) => {
    const baseId = String(lesson.baseLessonId ?? lesson.id ?? '');
    const cancelledStudents = cancelMap.get(baseId) ?? new Set();
    if (!cancelledStudents.size) {
      visible.push(lesson);
      return;
    }

    const studentIds = Array.isArray(lesson.studentIds) ? lesson.studentIds.map(String) : [];
    const studentNames = Array.isArray(lesson.studentNames) ? lesson.studentNames.map(String) : [];

    if (isPrivateLesson(lesson)) {
      const sid = String(studentIds[0] ?? '');
      if (sid && cancelledStudents.has(sid)) {
        return;
      }
      visible.push(lesson);
      return;
    }

    const remainingIds = [];
    const remainingNames = [];
    studentIds.forEach((sid, idx) => {
      if (cancelledStudents.has(String(sid))) {
        return;
      }
      remainingIds.push(sid);
      remainingNames.push(String(studentNames[idx] ?? '').trim() || '(İsimsiz)');
    });

    if (!remainingIds.length) {
      return;
    }

    visible.push({
      ...lesson,
      studentIds: remainingIds,
      studentNames: remainingNames,
    });
  });

  return visible;
}

export function buildScheduleGridMap(lessons) {
  const map = new Map();
  (lessons || []).forEach((lesson) => {
    const day = Number(lesson.day);
    if (!Number.isInteger(day) || day < 1 || day > 7) {
      return;
    }
    normalizeHours(lesson).forEach((hour) => {
      const key = `${day}|${hour}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(lesson);
    });
  });
  return map;
}

export async function fetchLessonsForTeacher(institutionId, teacherId) {
  const inst = String(institutionId ?? '').trim();
  const tid = String(teacherId ?? '').trim();
  // eslint-disable-next-line no-console
  console.log('FETCH LESSONS institutionId:', inst, 'teacherId:', tid);
  if (!inst || !tid) {
    return [];
  }
  try {
    const snap = await getDocs(
      query(
        collection(db, 'lessons'),
        where('institutionId', '==', inst),
        where('teacherId', '==', tid),
      ),
    );
    const rows = snap.docs.map(mapLessonDoc);
    // eslint-disable-next-line no-console
    console.log('FETCH LESSONS COUNT:', rows.length, rows);
    return rows;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB WEEKLY LESSONS ERROR:', error.code, error.message);
    throw error;
  }
}

export async function fetchOverridesForTeacher(institutionId, teacherId) {
  const inst = String(institutionId ?? '').trim();
  const tid = String(teacherId ?? '').trim();
  if (!inst || !tid) {
    return [];
  }
  try {
    const snap = await getDocs(
      query(
        collection(db, 'lessonOverrides'),
        where('institutionId', '==', inst),
        where('teacherId', '==', tid),
      ),
    );
    return snap.docs.map(mapOverrideDoc);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB WEEKLY OVERRIDES ERROR:', error.code, error.message);
    throw error;
  }
}

export async function fetchCancellationsForInstitution(institutionId) {
  const inst = String(institutionId ?? '').trim();
  if (!inst) {
    return [];
  }
  try {
    const snap = await getDocs(
      query(collection(db, LESSON_CANCELLATIONS_COLLECTION), where('institutionId', '==', inst)),
    );
    return snap.docs.map(mapCancellationDoc);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB WEEKLY CANCELLATIONS ERROR:', error.code, error.message);
    throw error;
  }
}

export function buildEffectiveSchedule({
  lessons,
  overrides,
  cancellations,
  weekStartDate,
  teacherId,
}) {
  const weekOverrides = filterOverridesForWeek(overrides, weekStartDate);
  const weekCancellations = filterCancellationsForWeek(cancellations, weekStartDate, teacherId);
  const withOverrides = applyLessonOverridesForDisplay(lessons, weekOverrides);
  return applyCancellationsToLessonsForWeek(withOverrides, weekCancellations, weekStartDate);
}
