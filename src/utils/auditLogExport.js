import { AUDIT_MODULE_LABELS } from '../constants/auditActions';
import { getAuditActionUiLabel } from '../constants/auditActionUiLabels';
import { formatDateTime } from './dateFormat';

/**
 * @param {import('../types/auditLog').AuditLogRecord[]} rows
 */
export function auditLogsToExportRows(rows) {
  const header = [
    'Tarih',
    'Kullanıcı',
    'E-posta',
    'Kurum',
    'Modül',
    'İşlem',
    'Açıklama',
    'IP',
    'Cihaz',
    'Tarayıcı',
  ];

  const body = rows.map((row) => [
    formatDateTime(row.createdAt),
    row.performedBy,
    row.performedByEmail ?? '',
    row.institutionName ?? '',
    AUDIT_MODULE_LABELS[row.module] ?? row.module,
    getAuditActionUiLabel(row.action),
    row.description,
    row.ipAddress ?? '',
    row.device ?? '',
    row.browser ?? '',
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

/** @param {import('../types/auditLog').AuditLogRecord[]} rows */
export function downloadAuditLogsCsv(rows, filename = 'aktivite-gecmisi.csv') {
  const csv = auditLogsToExportRows(rows)
    .map((line) => line.map(escapeCsvCell).join(','))
    .join('\n');

  triggerDownload(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

/** @param {import('../types/auditLog').AuditLogRecord[]} rows */
export function downloadAuditLogsExcel(rows, filename = 'aktivite-gecmisi.xls') {
  const tableRows = auditLogsToExportRows(rows)
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

  triggerDownload(
    new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' }),
    filename,
  );
}

/** @param {import('../types/auditLog').AuditLogRecord[]} rows */
export async function downloadAuditLogsPdf(rows, filename = 'aktivite-gecmisi.pdf') {
  const { default: pdfMake } = await import('pdfmake/build/pdfmake');
  const pdfFonts = await import('pdfmake/build/vfs_fonts');
  pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs;

  const tableBody = [
    [
      { text: 'Tarih', style: 'tableHeader' },
      { text: 'Kullanıcı', style: 'tableHeader' },
      { text: 'Kurum', style: 'tableHeader' },
      { text: 'İşlem', style: 'tableHeader' },
      { text: 'Açıklama', style: 'tableHeader' },
    ],
    ...rows.map((row) => [
      formatDateTime(row.createdAt),
      row.performedBy,
      row.institutionName ?? '—',
      getAuditActionUiLabel(row.action),
      row.description,
    ]),
  ];

  const docDefinition = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [32, 32, 32, 32],
    defaultStyle: { font: 'Roboto', fontSize: 8 },
    content: [
      { text: 'Eduvia — Aktivite Geçmişi', style: 'title', margin: [0, 0, 0, 12] },
      {
        table: {
          headerRows: 1,
          widths: ['14%', '12%', '14%', '16%', '*'],
          body: tableBody,
        },
        layout: 'lightHorizontalLines',
      },
    ],
    styles: {
      title: { fontSize: 14, bold: true, color: '#2563eb' },
      tableHeader: { bold: true, fillColor: '#f1f5f9', color: '#334155' },
    },
  };

  return new Promise((resolve, reject) => {
    pdfMake.createPdf(docDefinition).getBlob((blob) => {
      if (!blob) {
        reject(new Error('PDF oluşturulamadı.'));
        return;
      }
      triggerDownload(blob, filename);
      resolve();
    });
  });
}

/** @param {Blob} blob @param {string} filename */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
