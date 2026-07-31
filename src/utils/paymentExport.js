import { PAYMENT_METHOD_LABELS } from '../constants/paymentMethod';
import { PAYMENT_STATUS_LABELS } from '../constants/paymentStatus';
import { formatCurrency } from '../utils/packageFormat';
import { formatDate, formatDateTime } from './dateFormat';

/**
 * @param {import('../types/subscriptionPayment').SubscriptionPaymentRecord[]} rows
 */
export function paymentsToCsvRows(rows) {
  const header = [
    'Ödeme No',
    'Kurum',
    'Paket',
    'Tutar',
    'Para Birimi',
    'Ödeme Tarihi',
    'Sonraki Ödeme',
    'Yöntem',
    'Durum',
    'İşlem Referans No',
    'Açıklama',
    'Oluşturan',
    'Oluşturulma',
  ];

  const body = rows.map((row) => [
    row.paymentNumber,
    row.institutionName,
    row.packageName,
    String(row.amount ?? 0),
    row.currency,
    formatDate(row.paymentDate),
    formatDate(row.nextPaymentDate),
    PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod,
    PAYMENT_STATUS_LABELS[row.status] ?? row.status,
    row.transactionReference ?? '',
    row.description ?? '',
    row.createdByName ?? '',
    formatDateTime(row.createdAt),
  ]);

  return [header, ...body];
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** @param {import('../types/subscriptionPayment').SubscriptionPaymentRecord[]} rows */
export function downloadPaymentsCsv(rows, filename = 'odeme-gecmisi.csv') {
  const csv = paymentsToCsvRows(rows)
    .map((line) => line.map(escapeCsvCell).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** @param {import('../types/subscriptionPayment').SubscriptionPaymentRecord[]} rows */
export function downloadPaymentsExcel(rows, filename = 'odeme-gecmisi.xls') {
  const tableRows = paymentsToCsvRows(rows)
    .map(
      (line) =>
        `<tr>${line.map((cell) => `<td>${String(cell ?? '').replace(/</g, '&lt;')}</td>`).join('')}</tr>`,
    )
    .join('');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"></head>
<body><table>${tableRows}</table></body></html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** @param {number} amount @param {string} [currency] */
export function formatPaymentAmount(amount, currency = 'TRY') {
  if (currency === 'TRY') {
    return formatCurrency(amount);
  }
  return `${Number(amount ?? 0).toLocaleString('tr-TR')} ${currency}`;
}
