import { getRejectionReasonLabel } from '../constants/rejectionReasons';
import { formatDate, formatDateTime } from './dateFormat';

/**
 * @param {import('../types/rejectedInstitution').RejectedInstitutionRecord[]} rows
 */
export function rejectedInstitutionsToExportRows(rows) {
  const header = [
    'Kurum Adı',
    'Yetkili Kişi',
    'Telefon',
    'E-posta',
    'Red Sebebi',
    'Not',
    'Red Tarihi',
    'Tekrar Aranabilir',
    'Eklenme Tarihi',
    'Son Güncelleme',
  ];

  const body = rows.map((row) => [
    row.institutionName,
    row.contactPerson,
    row.phone,
    row.email,
    getRejectionReasonLabel(row.reason, row.customReason),
    row.notes,
    formatDate(row.rejectedAt),
    row.recontact ? 'Evet' : 'Hayır',
    formatDateTime(row.createdAt),
    formatDateTime(row.updatedAt),
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

/**
 * @param {import('../types/rejectedInstitution').RejectedInstitutionRecord[]} rows
 * @param {string} [filename]
 */
export function downloadRejectedInstitutionsCsv(rows, filename = 'red-veren-kurumlar.csv') {
  const csv = rejectedInstitutionsToExportRows(rows)
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

/**
 * @param {import('../types/rejectedInstitution').RejectedInstitutionRecord[]} rows
 * @param {string} [filename]
 */
export function downloadRejectedInstitutionsExcel(rows, filename = 'red-veren-kurumlar.xls') {
  const tableRows = rejectedInstitutionsToExportRows(rows)
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
