/** Makbuz sayaç yardımcıları — doc id: `{institutionId}_{YYYYMM}` */

export function currentMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function receiptCounterPeriodFromMonth(monthKey) {
  return String(monthKey ?? '').replace('-', '').slice(0, 6);
}

export function receiptCounterDocId(institutionId, monthKey) {
  const inst = String(institutionId ?? '').trim();
  const period = receiptCounterPeriodFromMonth(monthKey);
  return `${inst}_${period}`;
}

/** Makbuz no: `YYYYMM-0001` */
export function formatReceiptNo(period, seq) {
  const n = Number(seq);
  if (!Number.isFinite(n) || n < 1 || n > 9999) {
    throw new Error('Makbuz sıra numarası sınırı aşıldı.');
  }
  return `${period}-${String(Math.floor(n)).padStart(4, '0')}`;
}
