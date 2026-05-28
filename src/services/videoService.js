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
import { resolveVideoListName } from '../utils/videoListLabels';

function mapVideoDoc(d) {
  const x = d.data();
  const createdAt = x.createdAt ?? null;
  const mapped = {
    id: d.id,
    institutionId: String(x.institutionId ?? ''),
    title: String(x.title ?? ''),
    description: String(x.description ?? ''),
    url: String(x.url ?? ''),
    branch: String(x.branch ?? ''),
    level: Number(x.level ?? 1) || 1,
    listName: String(x.listName ?? '').trim(),
    listDescription: String(x.listDescription ?? '').trim(),
    songName: String(x.songName ?? ''),
    createdBy: String(x.createdBy ?? ''),
    createdByName: String(x.createdByName ?? ''),
    createdAt,
    createdAtMs: createdAt?.toMillis?.() ?? 0,
    createdAtLabel: createdAt?.toDate
      ? createdAt.toDate().toLocaleString('tr-TR')
      : '—',
    isActive: x.isActive !== false,
  };
  return {
    ...mapped,
    listName: resolveVideoListName(mapped),
  };
}

function mapUnlockDoc(d) {
  const x = d.data();
  const unlockedAt = x.unlockedAt ?? null;
  const watchedAt = x.watchedAt ?? null;
  return {
    id: d.id,
    institutionId: String(x.institutionId ?? ''),
    videoId: String(x.videoId ?? ''),
    studentId: String(x.studentId ?? ''),
    studentName: String(x.studentName ?? '').trim() || '(İsimsiz)',
    teacherId: String(x.teacherId ?? ''),
    teacherName: String(x.teacherName ?? '').trim() || '(İsimsiz)',
    unlockedAt,
    unlockedAtMs: unlockedAt?.toMillis?.() ?? 0,
    unlockedAtLabel: unlockedAt?.toDate
      ? unlockedAt.toDate().toLocaleString('tr-TR')
      : '—',
    watched: x.watched === true,
    watchedAt,
    watchedAtLabel: watchedAt?.toDate
      ? watchedAt.toDate().toLocaleString('tr-TR')
      : '—',
  };
}

function sortVideosByCreatedAt(rows) {
  return [...rows].sort((a, b) => b.createdAtMs - a.createdAtMs);
}

function sortUnlocksByUnlockedAt(rows) {
  return [...rows].sort((a, b) => b.unlockedAtMs - a.unlockedAtMs);
}

export async function fetchVideoLibrary(institutionId) {
  const inst = String(institutionId ?? '').trim();
  if (!inst) {
    return [];
  }
  try {
    const snap = await getDocs(
      query(collection(db, 'videoLibrary'), where('institutionId', '==', inst)),
    );
    return sortVideosByCreatedAt(snap.docs.map(mapVideoDoc));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB VIDEO LIBRARY LOAD ERROR:', error.code, error.message);
    throw error;
  }
}

export async function createVideo({
  title,
  description,
  url,
  branch,
  listName,
  listDescription,
  songName,
  institutionId,
  createdBy,
  createdByName,
}) {
  const inst = String(institutionId ?? '').trim();
  const uid = String(createdBy ?? auth.currentUser?.uid ?? '').trim();
  if (!inst) {
    throw new Error('Kurum bilgisi bulunamadı.');
  }
  const t = String(title ?? '').trim();
  if (!t) {
    throw new Error('Başlık zorunludur.');
  }

  const videoData = {
    institutionId: inst,
    title: t,
    description: String(description ?? '').trim(),
    url: String(url ?? '').trim(),
    branch: String(branch ?? '').trim().toLowerCase(),
    listName: String(listName ?? '').trim() || 'Genel Liste',
    listDescription: String(listDescription ?? '').trim(),
    level: 1,
    songName: String(songName ?? '').trim(),
    createdBy: uid,
    createdByName: String(createdByName ?? '').trim(),
    createdAt: serverTimestamp(),
    isActive: true,
  };

  // eslint-disable-next-line no-console
  console.log('WEB VIDEO LIBRARY DATA:', videoData);

  try {
    const ref = await addDoc(collection(db, 'videoLibrary'), videoData);
    return { id: ref.id };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB VIDEO CREATE ERROR:', error.code, error.message);
    throw error;
  }
}

/**
 * Rules tam doküman güncellemesi ister; institutionId / createdBy / createdAt korunur.
 */
export async function updateVideo(videoId, payload, callerInstitutionId) {
  const id = String(videoId ?? '').trim();
  const callerInst = String(callerInstitutionId ?? '').trim();
  if (!id) {
    throw new Error('Video bulunamadı.');
  }

  const ref = doc(db, 'videoLibrary', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Video bulunamadı.');
  }
  const existing = snap.data();
  const inst = String(existing.institutionId ?? '').trim();
  if (!inst) {
    throw new Error('Video kaydında kurum bilgisi yok.');
  }
  if (callerInst && callerInst !== inst) {
    throw new Error('Bu video başka kuruma ait; düzenlenemez.');
  }

  const updateData = {
    institutionId: inst,
    title: payload.title !== undefined ? String(payload.title).trim() : String(existing.title ?? ''),
    description:
      payload.description !== undefined
        ? String(payload.description).trim()
        : String(existing.description ?? ''),
    url: payload.url !== undefined ? String(payload.url).trim() : String(existing.url ?? ''),
    branch:
      payload.branch !== undefined
        ? String(payload.branch).trim().toLowerCase()
        : String(existing.branch ?? ''),
    listName:
      payload.listName !== undefined
        ? String(payload.listName).trim() || 'Genel Liste'
        : resolveVideoListName(existing),
    listDescription:
      payload.listDescription !== undefined
        ? String(payload.listDescription).trim()
        : String(existing.listDescription ?? ''),
    level: Number(existing.level) || 1,
    songName:
      payload.songName !== undefined ? String(payload.songName).trim() : String(existing.songName ?? ''),
    createdBy: existing.createdBy,
    createdByName: existing.createdByName,
    createdAt: existing.createdAt,
    isActive: payload.isActive !== undefined ? payload.isActive === true : existing.isActive === true,
  };

  // eslint-disable-next-line no-console
  console.log('WEB VIDEO UPDATE DATA:', {
    title: updateData.title,
    description: updateData.description,
    url: updateData.url,
    branch: updateData.branch,
    listName: updateData.listName,
    songName: updateData.songName,
    isActive: updateData.isActive,
  });

  try {
    await updateDoc(ref, updateData);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB VIDEO UPDATE ERROR:', error.code, error.message);
    throw error;
  }
}

export async function deactivateVideo(videoId, callerInstitutionId) {
  return updateVideo(videoId, { isActive: false }, callerInstitutionId);
}

export async function fetchVideoUnlocks(institutionId) {
  const inst = String(institutionId ?? '').trim();
  if (!inst) {
    return [];
  }
  try {
    const snap = await getDocs(
      query(collection(db, 'videoUnlocks'), where('institutionId', '==', inst)),
    );
    const rows = sortUnlocksByUnlockedAt(snap.docs.map(mapUnlockDoc));
    // eslint-disable-next-line no-console
    console.log('WEB VIDEO UNLOCKS:', rows);
    return rows;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB VIDEO TRACKING LOAD ERROR:', error.code, error.message);
    throw error;
  }
}

/** unlockedAt üzerinden YYYY-MM-DD */
export function unlockDateKey(row) {
  const ts = row?.unlockedAt;
  if (!ts?.toDate) {
    return '';
  }
  const d = ts.toDate();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function filterUnlocksByDateRange(rows, dateFrom, dateTo) {
  const from = String(dateFrom ?? '').trim();
  const to = String(dateTo ?? '').trim();
  if (!from && !to) {
    return rows;
  }
  return rows.filter((row) => {
    const dk = unlockDateKey(row);
    if (!dk) {
      return false;
    }
    if (from && dk < from) {
      return false;
    }
    if (to && dk > to) {
      return false;
    }
    return true;
  });
}
