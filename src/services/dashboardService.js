import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { fetchBalance, filterPaymentsByMonth } from './financeService';
import { fetchPayments, currentMonthKey } from './paymentService';
import { fetchVideoUnlocks } from './videoService';
import {
  fetchScheduleRequests,
  fetchAttendanceRequests,
  fetchMakeupRequests,
} from './requestService';
import { listStudents, listTeachers, isUserActive } from './userService';

function buildPendingItems(schedule, attendance, makeup) {
  const items = [];
  schedule
    .filter((r) => r.status === 'pending')
    .forEach((r) => {
      items.push({
        id: r.id,
        type: 'schedule',
        label: 'Ders saat değişimi',
        title: r.studentName || '—',
        sortMs: r.createdAtMs ?? 0,
      });
    });
  attendance
    .filter((r) => r.status === 'pending')
    .forEach((r) => {
      items.push({
        id: r.id,
        type: 'attendance',
        label: 'Geçmiş yoklama',
        title: `${r.teacherName} · ${r.studentName}`,
        sortMs: r.createdAtMs ?? 0,
      });
    });
  makeup
    .filter((r) => r.status === 'pending')
    .forEach((r) => {
      items.push({
        id: r.id,
        type: 'makeup',
        label: 'Telafi',
        title: r.studentName || '—',
        sortMs: r.createdAtMs ?? 0,
      });
    });
  return items.sort((a, b) => b.sortMs - a.sortMs);
}

/**
 * @param {string} institutionId
 */
export async function fetchAdminDashboard(institutionId) {
  const inst = String(institutionId ?? '').trim();
  const monthKey = currentMonthKey();

  if (!inst) {
    throw new Error('Kurum bilgisi bulunamadı.');
  }

  try {
    const [
      usersStudents,
      usersTeachers,
      lessonsSnap,
      payments,
      balance,
      unlocks,
      scheduleReqs,
      attendanceReqs,
      makeupReqs,
    ] = await Promise.all([
      listStudents(inst),
      listTeachers(inst),
      getDocs(query(collection(db, 'lessons'), where('institutionId', '==', inst))),
      fetchPayments(inst),
      fetchBalance(inst),
      fetchVideoUnlocks(inst),
      fetchScheduleRequests(inst),
      fetchAttendanceRequests(inst),
      fetchMakeupRequests(inst),
    ]);

    const activeStudents = usersStudents.filter(isUserActive).length;
    const activeTeachers = usersTeachers.filter(isUserActive).length;
    const activeLessons = lessonsSnap.size;

    const monthPayments = filterPaymentsByMonth(payments, monthKey);
    const monthPaymentTotal = monthPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const pendingItems = buildPendingItems(scheduleReqs, attendanceReqs, makeupReqs);
    const pendingCount = pendingItems.length;

    const videoUnlockTotal = unlocks.length;
    const videoUnwatched = unlocks.filter((u) => !u.watched).length;

    const recentPayments = [...payments]
      .sort((a, b) => b.sortMs - a.sortMs)
      .slice(0, 5);

    const recentUnlocks = [...unlocks]
      .sort((a, b) => b.unlockedAtMs - a.unlockedAtMs)
      .slice(0, 5);

    return {
      monthKey,
      stats: {
        activeStudents,
        activeTeachers,
        activeLessons,
        monthPaymentTotal,
        currentBalance: Number(balance.currentBalance ?? 0) || 0,
        pendingCount,
        videoUnlockTotal,
        videoUnwatched,
      },
      recentPayments,
      pendingItems: pendingItems.slice(0, 8),
      recentUnlocks,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB DASHBOARD LOAD ERROR:', error.code, error.message);
    throw error;
  }
}
