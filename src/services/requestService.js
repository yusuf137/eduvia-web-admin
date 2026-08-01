import { auth, db } from '../firebase/firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { LESSON_CANCELLATIONS_COLLECTION, LESSON_CANCELLATION_STATUS } from '../constants/lessonCancellationCollection';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../constants/auditActions';
import { auditLogger } from './auditLogger';
import { syncStudentMakeupCredit } from './makeupCreditService';
import {
  buildHoursFromStart,
  resolveLessonDurationHours,
  withNormalizedLessonTypeOnUpdate,
} from './lessonService';
import { weekStartDateMondayLocal } from './scheduleService';
import {
  createInstitutionNotification,
  SCHEDULE_REQUEST_APPROVED,
  SCHEDULE_REQUEST_REJECTED,
  ATTENDANCE_REQUEST_APPROVED,
  ATTENDANCE_REQUEST_REJECTED,
  MAKEUP_LESSON_CREATED,
  MAKEUP_LESSON_REJECTED,
  LESSON_CANCELLATION_APPROVED,
  LESSON_CANCELLATION_REJECTED,
} from './notificationService';

function normalizeHour(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (/^\d{1,2}$/.test(s)) return `${String(Number(s)).padStart(2, '0')}:00`;
  const m = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return s;
  return `${String(Number(m[1])).padStart(2, '0')}:${String(Number(m[2])).padStart(2, '0')}`;
}

function busySlotDocId({ teacherId, day, hour }) {
  const hourNorm = normalizeHour(hour).replace(':', '-');
  return `${String(teacherId)}_${String(day)}_${hourNorm}`;
}

function sortByCreatedAt(rows) {
  return [...rows].sort(
    (a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0),
  );
}

function mapTimestamp(ts) {
  if (!ts?.toDate) {
    return { label: '—', ms: 0 };
  }
  const d = ts.toDate();
  return { label: d.toLocaleString('tr-TR'), ms: d.getTime() };
}

function normalizeLessonHours(lesson) {
  if (Array.isArray(lesson?.hours) && lesson.hours.length) {
    return lesson.hours.map(String);
  }
  if (lesson?.startHour) {
    return [String(lesson.startHour)];
  }
  return [];
}

function buildResolvedScheduleRequestData(existing, status) {
  return {
    institutionId: existing.institutionId,
    studentId: existing.studentId,
    studentName: existing.studentName,
    lessonId: existing.lessonId,
    teacherId: existing.teacherId,
    currentDay: existing.currentDay,
    currentHours: existing.currentHours,
    requestedDay: existing.requestedDay,
    requestedHours: existing.requestedHours,
    changeType: existing.changeType,
    createdAt: existing.createdAt,
    status,
    resolvedAt: serverTimestamp(),
  };
}

function buildResolvedMakeupRequestData(existing, status, adminUid, { creditReturned } = {}) {
  return {
    institutionId: existing.institutionId,
    studentId: existing.studentId,
    studentName: existing.studentName,
    teacherId: existing.teacherId,
    teacherName: existing.teacherName,
    branch: existing.branch,
    requestedDay: existing.requestedDay,
    requestedHour: existing.requestedHour,
    requestedHours: existing.requestedHours,
    teacherAvailableDays: existing.teacherAvailableDays,
    sourceLessonId: existing.sourceLessonId,
    creditReserved: existing.creditReserved === true,
    creditReturned: creditReturned === true,
    createdAt: existing.createdAt,
    status,
    resolvedAt: serverTimestamp(),
    resolvedBy: String(adminUid ?? ''),
  };
}

export function assertAdminCanManageRequest(currentUserProfile, requestInstitutionId) {
  const role = String(currentUserProfile?.role ?? '').trim();
  if (role !== 'admin') {
    throw new Error('Yalnızca kurum admini talep işleyebilir.');
  }
  const inst = String(currentUserProfile?.institutionId ?? '').trim();
  if (!inst) {
    throw new Error('Profilinizde kurum bilgisi yok.');
  }
  if (String(requestInstitutionId ?? '').trim() !== inst) {
    throw new Error('Bu talep sizin kurumunuza ait değil.');
  }
  return inst;
}

async function assertLessonInstitution(lessonId, institutionId) {
  const snap = await getDoc(doc(db, 'lessons', String(lessonId)));
  if (!snap.exists()) {
    throw new Error('Ders bulunamadı.');
  }
  const lessonInst = String(snap.data()?.institutionId ?? '').trim();
  if (lessonInst !== institutionId) {
    throw new Error('Ders kurum bilgisi eşleşmiyor.');
  }
  return snap.data();
}

async function hasTeacherConflict({ teacherId, day, requestedHours, ignoreLessonId, institutionId }) {
  const snap = await getDocs(
    query(
      collection(db, 'lessons'),
      where('institutionId', '==', institutionId),
      where('teacherId', '==', String(teacherId)),
      where('day', '==', Number(day)),
    ),
  );
  const requestedSet = new Set((requestedHours || []).map(String));
  return snap.docs.some((d) => {
    if (d.id === ignoreLessonId) return false;
    const existing = Array.isArray(d.data()?.hours) ? d.data().hours.map(String) : [];
    return existing.some((h) => requestedSet.has(h));
  });
}

function mapScheduleDoc(d) {
  const data = d.data();
  const { label, ms } = mapTimestamp(data.createdAt);
  return {
    id: d.id,
    institutionId: String(data.institutionId ?? ''),
    studentId: String(data.studentId ?? ''),
    studentName: String(data.studentName ?? '').trim() || '(İsimsiz)',
    lessonId: String(data.lessonId ?? ''),
    teacherId: String(data.teacherId ?? ''),
    currentDay: Number(data.currentDay ?? 0),
    currentHours: Array.isArray(data.currentHours) ? data.currentHours.map(String) : [],
    requestedDay: Number(data.requestedDay ?? 0),
    requestedHours: Array.isArray(data.requestedHours) ? data.requestedHours.map(String) : [],
    changeType: String(data.changeType ?? ''),
    status: String(data.status ?? 'pending'),
    createdAt: data.createdAt ?? null,
    createdAtLabel: label,
    createdAtMs: ms,
  };
}

function mapAttendanceDoc(d) {
  const data = d.data();
  const { label, ms } = mapTimestamp(data.createdAt);
  return {
    id: d.id,
    institutionId: String(data.institutionId ?? ''),
    teacherId: String(data.teacherId ?? ''),
    teacherName: String(data.teacherName ?? '').trim() || '(İsimsiz)',
    lessonId: String(data.lessonId ?? ''),
    studentId: String(data.studentId ?? ''),
    studentName: String(data.studentName ?? '').trim() || '(İsimsiz)',
    requestedDate: String(data.requestedDate ?? ''),
    reason: String(data.reason ?? ''),
    status: String(data.status ?? 'pending'),
    createdAt: data.createdAt ?? null,
    createdAtLabel: label,
    createdAtMs: ms,
  };
}

function mapMakeupDoc(d) {
  const data = d.data();
  const { label, ms } = mapTimestamp(data.createdAt);
  return {
    id: d.id,
    institutionId: String(data.institutionId ?? ''),
    studentId: String(data.studentId ?? ''),
    studentName: String(data.studentName ?? '').trim() || '(İsimsiz)',
    teacherId: String(data.teacherId ?? ''),
    teacherName: String(data.teacherName ?? '').trim() || '(İsimsiz)',
    branch: String(data.branch ?? ''),
    requestedDay: Number(data.requestedDay ?? 0),
    requestedHour: String(data.requestedHour ?? ''),
    requestedHours: Array.isArray(data.requestedHours) ? data.requestedHours.map(String) : [],
    creditReserved: data.creditReserved === true,
    creditReturned: data.creditReturned === true,
    status: String(data.status ?? 'pending'),
    createdAt: data.createdAt ?? null,
    createdAtLabel: label,
    createdAtMs: ms,
  };
}

function mapCancellationDoc(d) {
  const data = d.data();
  const { label, ms } = mapTimestamp(data.createdAt);
  return {
    id: d.id,
    institutionId: String(data.institutionId ?? ''),
    studentId: String(data.studentId ?? ''),
    studentName: String(data.studentName ?? '').trim() || '(İsimsiz)',
    teacherId: String(data.teacherId ?? ''),
    teacherName: String(data.teacherName ?? '').trim() || '(İsimsiz)',
    lessonId: String(data.lessonId ?? ''),
    lessonDate: String(data.lessonDate ?? ''),
    weekStartDate: String(data.weekStartDate ?? ''),
    lessonHours: Array.isArray(data.lessonHours) ? data.lessonHours.map(String) : [],
    reason: String(data.reason ?? ''),
    branch: String(data.branch ?? ''),
    status: String(data.status ?? LESSON_CANCELLATION_STATUS.PENDING),
    reviewedBy: data.reviewedBy ?? null,
    reviewedAt: data.reviewedAt ?? null,
    createdAt: data.createdAt ?? null,
    createdAtLabel: label,
    createdAtMs: ms,
  };
}

export async function fetchScheduleRequests(institutionId) {
  const inst = String(institutionId ?? '').trim();
  if (!inst) return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'requests'), where('institutionId', '==', inst)),
    );
    return sortByCreatedAt(snap.docs.map(mapScheduleDoc));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB SCHEDULE REQUESTS LOAD ERROR:', error.code, error.message);
    throw error;
  }
}

export async function fetchAttendanceRequests(institutionId) {
  const inst = String(institutionId ?? '').trim();
  if (!inst) return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'attendanceRequests'), where('institutionId', '==', inst)),
    );
    return sortByCreatedAt(snap.docs.map(mapAttendanceDoc));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB ATTENDANCE REQUESTS LOAD ERROR:', error.code, error.message);
    throw error;
  }
}

export async function fetchMakeupRequests(institutionId) {
  const inst = String(institutionId ?? '').trim();
  if (!inst) return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'makeupLessonRequests'), where('institutionId', '==', inst)),
    );
    return sortByCreatedAt(snap.docs.map(mapMakeupDoc));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB MAKEUP REQUESTS LOAD ERROR:', error.code, error.message);
    throw error;
  }
}

export async function fetchLessonCancellations(institutionId) {
  const inst = String(institutionId ?? '').trim();
  if (!inst) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, LESSON_CANCELLATIONS_COLLECTION),
        where('institutionId', '==', inst),
      ),
    );
    const rows = sortByCreatedAt(snap.docs.map(mapCancellationDoc));
    // eslint-disable-next-line no-console
    console.log('[WEB] fetchLessonCancellations:', {
      institutionId: inst,
      rawCount: snap.docs.length,
      mappedCount: rows.length,
    });
    return rows;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB CANCELLATIONS LOAD ERROR:', error.code, error.message);
    throw error;
  }
}

/**
 * Kurum admini için canlı ders iptali dinleyicisi.
 * @param {string} institutionId
 * @param {(rows: object[]) => void} onData
 * @param {(error: Error) => void} [onError]
 * @returns {() => void}
 */
export function subscribeLessonCancellations(institutionId, onData, onError) {
  const inst = String(institutionId ?? '').trim();
  if (!inst) {
    onData([]);
    return () => {};
  }

  const q = query(
    collection(db, LESSON_CANCELLATIONS_COLLECTION),
    where('institutionId', '==', inst),
  );

  return onSnapshot(
    q,
    (snap) => {
      const rows = sortByCreatedAt(snap.docs.map(mapCancellationDoc));
      // eslint-disable-next-line no-console
      console.log('[WEB] subscribeLessonCancellations snapshot:', {
        institutionId: inst,
        rawCount: snap.docs.length,
        mappedCount: rows.length,
      });
      onData(rows);
    },
    (error) => {
      // eslint-disable-next-line no-console
      console.log('WEB CANCELLATIONS LISTENER ERROR:', error.code, error.message);
      onError?.(error);
    },
  );
}

export async function approveScheduleRequest(requestId, currentUserProfile) {
  const adminUid = String(auth.currentUser?.uid ?? '').trim();
  const reqRef = doc(db, 'requests', requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error('Talep bulunamadı.');
  const req = reqSnap.data();
  const inst = assertAdminCanManageRequest(currentUserProfile, req.institutionId);
  if (req.status !== 'pending') throw new Error('Bu talep daha önce işlenmiş.');

  const lesson = await assertLessonInstitution(req.lessonId, inst);
  const requestedDay = Number(req.requestedDay);
  const requestedHours = Array.isArray(req.requestedHours) ? req.requestedHours.map(String) : [];
  if (!requestedHours.length) throw new Error('Talep saatleri geçersiz.');

  const conflict = await hasTeacherConflict({
    teacherId: String(req.teacherId ?? ''),
    day: requestedDay,
    requestedHours,
    ignoreLessonId: String(req.lessonId ?? ''),
    institutionId: inst,
  });
  if (conflict) throw new Error('Bu öğretmenin seçilen gün ve saatte başka dersi var');

  const expectedCount = resolveLessonDurationHours(lesson);
  if (requestedHours.length !== expectedCount) {
    throw new Error('Talep saatleri ders süresiyle uyuşmuyor.');
  }

  const changeType = req.changeType === 'one_time' ? 'one_time' : 'permanent';
  const lessonRef = doc(db, 'lessons', String(req.lessonId ?? ''));
  const resolvedRequestData = buildResolvedScheduleRequestData(req, 'approved');

  // eslint-disable-next-line no-console
  console.log('WEB REQUEST DATA:', req);
  // eslint-disable-next-line no-console
  console.log('WEB APPROVE DATA:', resolvedRequestData);

  try {
    await runTransaction(db, async (transaction) => {
      const freshReq = await transaction.get(reqRef);
      if (!freshReq.exists() || freshReq.data()?.status !== 'pending') {
        throw new Error('Talep güncellendi.');
      }
      if (changeType === 'permanent') {
        transaction.update(
          lessonRef,
          withNormalizedLessonTypeOnUpdate(lesson, {
            institutionId: inst,
            day: requestedDay,
            hours: requestedHours,
            startHour: requestedHours[0],
          }),
        );
      } else {
        const overrideData = {
          institutionId: inst,
          lessonId: String(req.lessonId ?? ''),
          studentId: String(req.studentId ?? ''),
          teacherId: String(req.teacherId ?? ''),
          originalDay: typeof lesson.day === 'number' ? lesson.day : Number(lesson.day) || 0,
          originalHours: normalizeLessonHours(lesson),
          overrideDay: requestedDay,
          overrideHours: requestedHours,
          weekStartDate: weekStartDateMondayLocal(),
          requestId: String(requestId),
          createdAt: serverTimestamp(),
        };
        transaction.set(doc(collection(db, 'lessonOverrides')), overrideData);
      }
      transaction.update(reqRef, resolvedRequestData);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB REQUEST APPROVE ERROR:', error.code, error.message);
    throw error;
  }

  const studentName = String(req.studentName ?? '').trim() || '(İsimsiz)';
  try {
    await Promise.all([
      createInstitutionNotification({
        institutionId: inst,
        userId: String(req.studentId ?? ''),
        title: 'Ders Değişikliği Onaylandı',
        message: 'Ders saat değişiklik talebiniz onaylandı.',
        type: SCHEDULE_REQUEST_APPROVED,
      }),
      createInstitutionNotification({
        institutionId: inst,
        userId: String(req.teacherId ?? ''),
        title: 'Ders Değişikliği Onaylandı',
        message: `${studentName} için ders değişikliği onaylandı.`,
        type: SCHEDULE_REQUEST_APPROVED,
      }),
    ]);
  } catch {
    /* bildirim hatası ana akışı bozmasın */
  }
}

function collectionNameForRejectType(type) {
  if (type === 'schedule') return 'requests';
  if (type === 'attendance') return 'attendanceRequests';
  if (type === 'makeup') return 'makeupLessonRequests';
  return null;
}

function rejectNotificationType(type) {
  if (type === 'schedule') return SCHEDULE_REQUEST_REJECTED;
  if (type === 'attendance') return ATTENDANCE_REQUEST_REJECTED;
  return MAKEUP_LESSON_REJECTED;
}

function rejectNotificationUserId(request, type) {
  if (type === 'attendance') return String(request.teacherId ?? '');
  return String(request.studentId ?? '');
}

/**
 * @param {{ id: string, institutionId?: string, status?: string, studentId?: string, teacherId?: string, creditReserved?: boolean, creditReturned?: boolean }} request
 * @param {'schedule' | 'attendance' | 'makeup'} type
 * @returns {Promise<{ rejected: boolean, notificationFailed: boolean }>}
 */
export async function rejectRequest(request, type, currentUserProfile) {
  const adminUid = String(auth.currentUser?.uid ?? '').trim();
  if (!adminUid) {
    throw new Error('Oturum bulunamadı.');
  }

  const requestId = String(request?.id ?? '').trim();
  const collectionName = collectionNameForRejectType(type);
  if (!requestId || !collectionName) {
    throw new Error('Geçersiz talep veya tip.');
  }

  const inst = assertAdminCanManageRequest(currentUserProfile, request.institutionId);
  if (String(request.institutionId ?? '').trim() !== inst) {
    throw new Error('Bu talep bu kuruma ait değil.');
  }
  if (String(request.status ?? '') !== 'pending') {
    throw new Error('Bu talep daha önce işlenmiş.');
  }

  const rejectData = {
    status: 'rejected',
    reviewedBy: adminUid,
    reviewedAt: serverTimestamp(),
  };

  // eslint-disable-next-line no-console
  console.log('WEB REJECT TYPE:', type);
  // eslint-disable-next-line no-console
  console.log('WEB REJECT REQUEST:', request);
  // eslint-disable-next-line no-console
  console.log('WEB REJECT REQUEST ID:', requestId);
  // eslint-disable-next-line no-console
  console.log('WEB REJECT DATA:', rejectData);
  // eslint-disable-next-line no-console
  console.log('WEB REJECT DATA KEYS:', Object.keys(rejectData));

  const requestRef = doc(db, collectionName, requestId);
  let makeupCreditReturn = null;

  if (type === 'makeup') {
    try {
      // eslint-disable-next-line no-console
      console.log('REJECT STEP 1: makeup request + credit return transaction başlıyor');
      await runTransaction(db, async (transaction) => {
        const requestSnap = await transaction.get(requestRef);
        if (!requestSnap.exists()) {
          throw new Error('Talep bulunamadı.');
        }
        const requestData = requestSnap.data();
        if (String(requestData.institutionId ?? '').trim() !== inst) {
          throw new Error('Kurum eşleşmiyor.');
        }
        if (requestData.status !== 'pending') {
          throw new Error('Talep zaten işlenmiş.');
        }

        const updateData = { ...rejectData };
        if (requestData.creditReserved === true && requestData.creditReturned !== true) {
          const userRef = doc(db, 'users', String(requestData.studentId ?? request.studentId ?? ''));
          const userSnap = await transaction.get(userRef);
          if (!userSnap.exists()) {
            throw new Error('Öğrenci profili bulunamadı.');
          }
          if (String(userSnap.data()?.institutionId ?? '').trim() !== inst) {
            throw new Error('Öğrenci kurum bilgisi eşleşmiyor.');
          }
          const previousCredit = Number(userSnap.data()?.makeupCredit ?? 0);
          const newCredit = previousCredit + 1;
          updateData.creditReturned = true;
          transaction.update(userRef, { makeupCredit: newCredit });
          makeupCreditReturn = { previousCredit, newCredit };
        }
        transaction.update(requestRef, updateData);
      });
      // eslint-disable-next-line no-console
      console.log('REJECT STEP 1 OK');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('WEB REQUEST REJECT UPDATE ERROR:', error.code, error.message);
      throw error;
    }
  } else {
    try {
      // eslint-disable-next-line no-console
      console.log('REJECT STEP 1: request update başlıyor', collectionName);
      await updateDoc(requestRef, rejectData);
      // eslint-disable-next-line no-console
      console.log('REJECT STEP 1 OK');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('WEB REQUEST REJECT UPDATE ERROR:', error.code, error.message);
      throw error;
    }
  }

  let notificationFailed = false;
  try {
    // eslint-disable-next-line no-console
    console.log('REJECT STEP 3: notification create başlıyor');
    const notificationData = {
      institutionId: inst,
      userId: rejectNotificationUserId(request, type),
      title: 'Talebiniz Reddedildi',
      message: 'Talebiniz kurum tarafından reddedildi.',
      type: rejectNotificationType(type),
      createdAt: serverTimestamp(),
      read: false,
    };
    await createInstitutionNotification(notificationData);
    // eslint-disable-next-line no-console
    console.log('REJECT STEP 3 OK');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB REJECT NOTIFICATION ERROR:', error.code, error.message);
    notificationFailed = true;
  }

  if (type === 'makeup') {
    const studentName = String(request.studentName ?? '').trim() || '(İsimsiz)';
    auditLogger.log({
      action: AUDIT_ACTIONS.MAKEUP_LESSON_REQUEST_REJECTED,
      module: AUDIT_MODULES.REQUEST,
      institutionId: inst,
      description: `${studentName} telafi talebi reddedildi.`,
      newData: { requestId, studentId: request.studentId },
    });
    if (makeupCreditReturn) {
      auditLogger.log({
        action: AUDIT_ACTIONS.MAKEUP_CREDIT_RETURNED,
        module: AUDIT_MODULES.REQUEST,
        institutionId: inst,
        description: `${studentName} için rezerve telafi hakkı geri verildi (${makeupCreditReturn.previousCredit} → ${makeupCreditReturn.newCredit}).`,
        newData: {
          requestId,
          studentId: request.studentId,
          previousCredit: makeupCreditReturn.previousCredit,
          newCredit: makeupCreditReturn.newCredit,
        },
      });
    }
  }

  return { rejected: true, notificationFailed };
}

export async function rejectScheduleRequest(requestId, currentUserProfile) {
  const snap = await getDoc(doc(db, 'requests', requestId));
  if (!snap.exists()) throw new Error('Talep bulunamadı.');
  return rejectRequest({ id: snap.id, ...snap.data() }, 'schedule', currentUserProfile);
}

export async function rejectAttendanceRequest(requestId, currentUserProfile) {
  const snap = await getDoc(doc(db, 'attendanceRequests', requestId));
  if (!snap.exists()) throw new Error('Talep bulunamadı.');
  return rejectRequest({ id: snap.id, ...snap.data() }, 'attendance', currentUserProfile);
}

export async function rejectMakeupLessonRequest(requestId, currentUserProfile) {
  const snap = await getDoc(doc(db, 'makeupLessonRequests', requestId));
  if (!snap.exists()) throw new Error('Talep bulunamadı.');
  return rejectRequest({ id: snap.id, ...snap.data() }, 'makeup', currentUserProfile);
}

export async function approveAttendanceRequest(requestId, currentUserProfile) {
  const snap = await getDoc(doc(db, 'attendanceRequests', requestId));
  if (!snap.exists()) throw new Error('Talep bulunamadı.');
  const row = { id: snap.id, ...snap.data() };
  const inst = assertAdminCanManageRequest(currentUserProfile, row.institutionId);
  if (row.status !== 'pending') throw new Error('Talep zaten işlenmiş.');

  const approveData = {
    status: 'approved',
    reviewedBy: String(auth.currentUser?.uid ?? '').trim(),
    reviewedAt: serverTimestamp(),
  };

  // eslint-disable-next-line no-console
  console.log('WEB APPROVE DATA:', approveData);

  try {
    await updateDoc(doc(db, 'attendanceRequests', requestId), approveData);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB REQUEST APPROVE ERROR:', error.code, error.message);
    throw error;
  }

  const dateLabel = String(row.requestedDate ?? '');
  try {
    await createInstitutionNotification({
      institutionId: inst,
      userId: String(row.teacherId ?? ''),
      title: 'Geçmiş yoklama onayı',
      message: `${dateLabel} tarihi için geçmiş yoklama giriş talebiniz onaylandı.`,
      type: ATTENDANCE_REQUEST_APPROVED,
    });
  } catch {
    /* ignore */
  }
}

export async function approveMakeupLessonRequest(requestId, currentUserProfile) {
  const adminUid = String(auth.currentUser?.uid ?? '').trim();
  const reqRef = doc(db, 'makeupLessonRequests', requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) throw new Error('Talep bulunamadı.');
  const req = reqSnap.data();
  const inst = assertAdminCanManageRequest(currentUserProfile, req.institutionId);
  if (req.status !== 'pending') throw new Error('Talep zaten işlenmiş.');

  const teacherLessons = await getDocs(
    query(
      collection(db, 'lessons'),
      where('institutionId', '==', inst),
      where('teacherId', '==', String(req.teacherId)),
      where('day', '==', Number(req.requestedDay)),
    ),
  );
  const conflict = teacherLessons.docs.some((d) => {
    const hrs = Array.isArray(d.data()?.hours) ? d.data().hours.map(String) : [];
    return hrs.includes(String(req.requestedHour));
  });
  if (conflict) {
    throw new Error('Bu öğretmenin seçilen gün ve saatte başka dersi var');
  }

  const lessonRef = doc(collection(db, 'lessons'));
  const requestedHours = Array.isArray(req.requestedHours)
    ? req.requestedHours.map(String)
    : [String(req.requestedHour)];
  const resolvedRequestData = buildResolvedMakeupRequestData(req, 'approved', adminUid, {
    creditReturned: req.creditReturned === true,
  });

  const lessonData = {
    institutionId: inst,
    teacherId: String(req.teacherId),
    teacherName: String(req.teacherName),
    studentIds: [String(req.studentId)],
    studentNames: [String(req.studentName)],
    lessonType: 'makeup',
    branch: String(req.branch ?? ''),
    day: Number(req.requestedDay),
    startHour: String(req.requestedHour),
    hours: requestedHours,
    teacherAvailableDays: Array.isArray(req.teacherAvailableDays)
      ? req.teacherAvailableDays.map(Number)
      : [Number(req.requestedDay)],
    duration: 1,
    pricePerLesson: 0,
    isMakeup: true,
    createdByStudent: String(req.studentId),
    createdAt: serverTimestamp(),
  };

  // eslint-disable-next-line no-console
  console.log('WEB REQUEST DATA:', req);
  // eslint-disable-next-line no-console
  console.log('WEB APPROVE DATA:', { lessonData, resolvedRequestData });

  try {
    await runTransaction(db, async (transaction) => {
      const freshReq = await transaction.get(reqRef);
      if (!freshReq.exists() || freshReq.data()?.status !== 'pending') {
        throw new Error('Talep güncellendi.');
      }
      transaction.set(lessonRef, lessonData);
      transaction.update(reqRef, resolvedRequestData);

      (requestedHours || []).map((h) => normalizeHour(h)).filter(Boolean).forEach((hour) => {
        const slotRef = doc(db, 'teacherBusySlots', busySlotDocId({
          teacherId: req.teacherId,
          day: req.requestedDay,
          hour,
        }));
        transaction.set(slotRef, {
          institutionId: inst,
          teacherId: String(req.teacherId),
          day: Number(req.requestedDay),
          hour: normalizeHour(hour),
          lessonId: lessonRef.id,
          isMakeup: true,
          createdAt: serverTimestamp(),
        });
      });
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB REQUEST APPROVE ERROR:', error.code, error.message);
    throw error;
  }

  try {
    await Promise.all([
      createInstitutionNotification({
        institutionId: inst,
        userId: String(req.teacherId ?? ''),
        title: 'Yeni Telafi Dersi',
        message: `${String(req.studentName)} sizinle telafi dersi oluşturuldu.`,
        type: MAKEUP_LESSON_CREATED,
      }),
      createInstitutionNotification({
        institutionId: inst,
        userId: String(req.studentId ?? ''),
        title: 'Telafi Talebi Onaylandı',
        message: 'Telafi ders talebiniz onaylandı.',
        type: MAKEUP_LESSON_CREATED,
      }),
    ]);
  } catch {
    /* ignore */
  }

  const studentName = String(req.studentName ?? '').trim() || '(İsimsiz)';
  auditLogger.log({
    action: AUDIT_ACTIONS.MAKEUP_LESSON_REQUEST_APPROVED,
    module: AUDIT_MODULES.REQUEST,
    institutionId: inst,
    description: `${studentName} telafi talebi onaylandı.`,
    newData: { requestId, studentId: req.studentId, lessonId: lessonRef.id },
  });
  auditLogger.log({
    action: AUDIT_ACTIONS.MAKEUP_LESSON_CREATED_FROM_REQUEST,
    module: AUDIT_MODULES.REQUEST,
    institutionId: inst,
    description: `${studentName} için telafi dersi oluşturuldu.`,
    newData: {
      requestId,
      lessonId: lessonRef.id,
      teacherId: req.teacherId,
      day: req.requestedDay,
      hour: req.requestedHour,
    },
  });

  return { lessonId: lessonRef.id };
}

export function formatRequestedDateTr(dateKey) {
  const [y, m, d] = String(dateKey).split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function approveLessonCancellation(cancellationId, currentUserProfile) {
  const adminUid = String(auth.currentUser?.uid ?? '').trim();
  const ref = doc(db, LESSON_CANCELLATIONS_COLLECTION, String(cancellationId));
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Talep bulunamadı.');
  }
  const row = snap.data();
  const inst = assertAdminCanManageRequest(currentUserProfile, row.institutionId);
  if (String(row.status ?? '') !== LESSON_CANCELLATION_STATUS.PENDING) {
    throw new Error('Bu talep daha önce işlenmiş.');
  }

  const approveData = {
    status: LESSON_CANCELLATION_STATUS.APPROVED,
    reviewedBy: adminUid,
    reviewedAt: serverTimestamp(),
  };

  await updateDoc(ref, approveData);

  let creditResult = null;
  try {
    creditResult = await syncStudentMakeupCredit(String(row.studentId ?? ''));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('MAKEUP CREDIT SYNC ERROR:', error?.message ?? error);
  }

  const studentName = String(row.studentName ?? '').trim() || '(İsimsiz)';
  const lessonDateLabel = formatRequestedDateTr(String(row.lessonDate ?? ''));

  auditLogger.log({
    action: AUDIT_ACTIONS.LESSON_CANCELLATION_REQUEST_APPROVED,
    module: AUDIT_MODULES.REQUEST,
    institutionId: inst,
    description: `${studentName} ders iptal talebi onaylandı (${lessonDateLabel}).`,
    newData: { cancellationId: String(cancellationId), studentId: row.studentId, lessonId: row.lessonId },
  });

  if (creditResult?.creditIncreased) {
    auditLogger.log({
      action: AUDIT_ACTIONS.MAKEUP_CREDIT_GRANTED,
      module: AUDIT_MODULES.REQUEST,
      institutionId: inst,
      description: `${studentName} için telafi hakkı güncellendi (${creditResult.previousCredit} → ${creditResult.newCredit}).`,
      newData: {
        studentId: row.studentId,
        previousCredit: creditResult.previousCredit,
        newCredit: creditResult.newCredit,
        cancellationId: String(cancellationId),
      },
    });
  }

  try {
    await Promise.all([
      createInstitutionNotification({
        institutionId: inst,
        userId: String(row.studentId ?? ''),
        title: 'Ders İptal Talebiniz Onaylandı',
        message: `${lessonDateLabel} tarihli ders iptal talebiniz onaylandı.`,
        type: LESSON_CANCELLATION_APPROVED,
      }),
      createInstitutionNotification({
        institutionId: inst,
        userId: String(row.teacherId ?? ''),
        title: 'Ders İptal Edildi',
        message: `${studentName}, ${lessonDateLabel} tarihli dersini iptal etti.`,
        type: LESSON_CANCELLATION_APPROVED,
      }),
    ]);
  } catch {
    /* bildirim hatası ana akışı bozmasın */
  }
}

export async function rejectLessonCancellation(cancellationId, currentUserProfile) {
  const adminUid = String(auth.currentUser?.uid ?? '').trim();
  const ref = doc(db, LESSON_CANCELLATIONS_COLLECTION, String(cancellationId));
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Talep bulunamadı.');
  }
  const row = { id: snap.id, ...snap.data() };
  const inst = assertAdminCanManageRequest(currentUserProfile, row.institutionId);
  if (String(row.status ?? '') !== LESSON_CANCELLATION_STATUS.PENDING) {
    throw new Error('Bu talep daha önce işlenmiş.');
  }

  const rejectData = {
    status: LESSON_CANCELLATION_STATUS.REJECTED,
    reviewedBy: adminUid,
    reviewedAt: serverTimestamp(),
  };

  await updateDoc(ref, rejectData);

  const studentName = String(row.studentName ?? '').trim() || '(İsimsiz)';
  const lessonDateLabel = formatRequestedDateTr(String(row.lessonDate ?? ''));

  auditLogger.log({
    action: AUDIT_ACTIONS.LESSON_CANCELLATION_REQUEST_REJECTED,
    module: AUDIT_MODULES.REQUEST,
    institutionId: inst,
    description: `${studentName} ders iptal talebi reddedildi (${lessonDateLabel}).`,
    newData: { cancellationId: String(cancellationId), studentId: row.studentId, lessonId: row.lessonId },
  });

  try {
    await createInstitutionNotification({
      institutionId: inst,
      userId: String(row.studentId ?? ''),
      title: 'Ders İptal Talebiniz Reddedildi',
      message: `${lessonDateLabel} tarihli ders iptal talebiniz reddedildi.`,
      type: LESSON_CANCELLATION_REJECTED,
    });
  } catch {
    /* ignore */
  }

  return { rejected: true };
}

export { buildHoursFromStart };
