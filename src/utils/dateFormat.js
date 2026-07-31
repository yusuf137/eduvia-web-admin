export function formatDateTime(value) {
  if (!value?.toDate) return '—';
  return value.toDate().toLocaleString('tr-TR');
}

export function formatDate(value) {
  if (!value?.toDate) return '—';
  return value.toDate().toLocaleDateString('tr-TR');
}

export function parseDateInput(value) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateInputValue(value) {
  if (!value?.toDate) return '';
  const date = value.toDate();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayDateInputValue() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
