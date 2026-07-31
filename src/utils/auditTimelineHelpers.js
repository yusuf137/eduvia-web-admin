/**
 * @param {import('../types/auditLog').AuditLogRecord[]} logs
 * @returns {{ label: string, items: import('../types/auditLog').AuditLogRecord[] }[]}
 */
export function groupAuditLogsByDateLabel(logs) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  /** @type {{ label: string, items: import('../types/auditLog').AuditLogRecord[] }[]} */
  const groups = [];
  /** @type {Map<string, number>} */
  const indexByLabel = new Map();

  logs.forEach((log) => {
    const date = log.createdAt?.toDate?.();
    if (!date) {
      return;
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    let label;
    if (dayStart.getTime() === todayStart.getTime()) {
      label = 'BUGÜN';
    } else if (dayStart.getTime() === yesterdayStart.getTime()) {
      label = 'DÜN';
    } else {
      label = date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }

    if (!indexByLabel.has(label)) {
      indexByLabel.set(label, groups.length);
      groups.push({ label, items: [] });
    }
    groups[indexByLabel.get(label)].items.push(log);
  });

  return groups;
}

/** @param {import('firebase/firestore').Timestamp|null|undefined} value */
export function formatTimelineDate(value) {
  if (!value?.toDate) {
    return '—';
  }
  return value.toDate().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** @param {import('firebase/firestore').Timestamp|null|undefined} value */
export function formatTimelineTime(value) {
  if (!value?.toDate) {
    return '—';
  }
  return value.toDate().toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
