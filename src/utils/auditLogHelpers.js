import { getAuditActionUiLabel } from '../constants/auditActionUiLabels';

/** @param {unknown} value */
export function sanitizeAuditData(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === 'function') {
    try {
      return value.toDate().toISOString();
    } catch {
      return String(value);
    }
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditData(item));
  }
  if (typeof value === 'object') {
    /** @type {Record<string, unknown>} */
    const out = {};
    Object.entries(value).forEach(([key, item]) => {
      if (item === undefined) return;
      out[key] = sanitizeAuditData(item);
    });
    return out;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  return String(value);
}

export function detectBrowserName() {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  return 'Unknown';
}

export function detectDeviceType() {
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return 'Mobile';
  if (/Tablet|iPad/i.test(ua)) return 'Tablet';
  return 'Desktop';
}

/** @type {string|null} */
let cachedIpAddress = null;

export async function resolveClientIpAddress() {
  if (cachedIpAddress) return cachedIpAddress;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const data = await response.json();
    cachedIpAddress = String(data?.ip ?? '').trim() || null;
    return cachedIpAddress;
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown>|null|undefined} oldData
 * @param {Record<string, unknown>|null|undefined} newData
 */
export function getChangedAuditFields(oldData, newData) {
  const oldObj = oldData ?? {};
  const newObj = newData ?? {};
  const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  /** @type {string[]} */
  const changed = [];
  keys.forEach((key) => {
    const oldVal = JSON.stringify(oldObj[key] ?? null);
    const newVal = JSON.stringify(newObj[key] ?? null);
    if (oldVal !== newVal) {
      changed.push(key);
    }
  });
  return changed;
}

/** @param {import('../types/auditLog').AuditLogRecord|null|undefined} log */
export function formatAuditActivityLine(log) {
  if (!log) return '';
  const time = log.createdAt?.toDate?.()
    ? log.createdAt.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : '—';
  const user = log.performedBy || 'Sistem';
  const text = log.description || getAuditActionUiLabel(log.action);
  return { time, user, text };
}

/** @param {import('../types/auditLog').AuditLogRecord} log */
export function isAuditUpdateAction(log) {
  return Boolean(log.oldData && log.newData && getChangedAuditFields(log.oldData, log.newData).length > 0);
}
