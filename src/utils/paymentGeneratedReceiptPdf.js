import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { PAYMENT_METHOD_LABELS } from '../constants/paymentMethod';
import { PAYMENT_STATUS_LABELS } from '../constants/paymentStatus';
import { formatPaymentAmount } from './paymentExport';
import { formatDate } from './dateFormat';

pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs;

/** @type {string|null} */
let logoDataUrlCache = null;

async function loadLogoDataUrl() {
  if (logoDataUrlCache) {
    return logoDataUrlCache;
  }
  const response = await fetch('/eduvia-logo.png');
  if (!response.ok) {
    throw new Error('Eduvia logosu yüklenemedi.');
  }
  const blob = await response.blob();
  logoDataUrlCache = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Logo okunamadı.'));
    reader.readAsDataURL(blob);
  });
  return logoDataUrlCache;
}

/** @param {Date} date */
function formatReceiptCreatedAt(date) {
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * @param {string} raw
 * @param {Date} [date]
 */
export function buildGeneratedReceiptFileName(raw, date = new Date()) {
  const safeName = String(raw ?? 'Kurum')
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^\w.\-çğıöşüÇĞİÖŞÜ]/gi, '')
    .slice(0, 60) || 'Kurum';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `Eduvia_Makbuz_${safeName}_${y}${m}${d}.pdf`;
}

/**
 * @param {{ label: string, value: string }[]} rows
 */
function buildInfoTable(rows) {
  return {
    table: {
      widths: ['38%', '*'],
      body: rows.map((row) => [
        { text: row.label, style: 'fieldLabel', border: [false, false, false, false] },
        { text: row.value || '—', style: 'fieldValue', border: [false, false, false, false] },
      ]),
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 4],
  };
}

/**
 * @param {object} params
 * @param {import('../types/subscriptionPayment').SubscriptionPaymentRecord} params.payment
 * @param {{ name?: string, phone?: string, email?: string }|null} [params.institution]
 * @param {string} [params.authorizedPerson]
 * @param {Date} [params.createdAt]
 */
export async function buildPaymentReceiptPdfBlob({
  payment,
  institution = null,
  authorizedPerson = '—',
  createdAt = new Date(),
}) {
  const logo = await loadLogoDataUrl();
  const institutionName = institution?.name || payment.institutionName || '—';
  const amountText = formatPaymentAmount(payment.amount, payment.currency);
  const methodLabel =
    PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod ?? '—';
  const statusLabel = PAYMENT_STATUS_LABELS[payment.status] ?? payment.status ?? '—';

  /** @type {import('pdfmake/interfaces').TDocumentDefinitions} */
  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [48, 48, 48, 48],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      color: '#1e293b',
      lineHeight: 1.35,
    },
    content: [
      {
        columns: [
          {
            width: '*',
            stack: [
              { image: logo, width: 52, margin: [0, 0, 0, 10] },
              { text: 'Eduvia', style: 'brandTitle' },
              { text: 'Makbuz', style: 'receiptTitle' },
            ],
          },
          {
            width: 'auto',
            alignment: 'right',
            stack: [
              { text: 'Makbuz No', style: 'metaLabel' },
              { text: payment.paymentNumber || '—', style: 'metaValue' },
              { text: 'Oluşturulma Tarihi', style: 'metaLabel', margin: [0, 10, 0, 0] },
              { text: formatReceiptCreatedAt(createdAt), style: 'metaValue' },
            ],
          },
        ],
        margin: [0, 0, 0, 20],
      },
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' },
        ],
        margin: [0, 0, 0, 4],
      },
      { text: 'Kurum Bilgileri', style: 'sectionTitle' },
      buildInfoTable([
        { label: 'Kurum Adı', value: institutionName },
        { label: 'Yetkili Kişi', value: authorizedPerson },
        { label: 'Telefon', value: institution?.phone ?? '—' },
        { label: 'E-posta', value: institution?.email ?? '—' },
      ]),
      { text: 'Ödeme Bilgileri', style: 'sectionTitle' },
      buildInfoTable([
        { label: 'Paket', value: payment.packageName || '—' },
        { label: 'Ödeme Tutarı', value: amountText },
        { label: 'Para Birimi', value: payment.currency || '—' },
        { label: 'Ödeme Tarihi', value: formatDate(payment.paymentDate) },
        { label: 'Sonraki Ödeme Tarihi', value: formatDate(payment.nextPaymentDate) },
        { label: 'Ödeme Yöntemi', value: methodLabel },
        { label: 'İşlem Referans No', value: payment.transactionReference || '—' },
        { label: 'Durum', value: statusLabel },
      ]),
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' },
        ],
        margin: [0, 16, 0, 12],
      },
      { text: 'Not', style: 'footerLabel' },
      {
        text: 'Bu makbuz, kurum abonelik ödemesinin resmi kaydıdır.',
        style: 'footerText',
        margin: [0, 4, 0, 12],
      },
      { text: 'Ödeme Açıklaması', style: 'footerLabel' },
      {
        text: payment.description?.trim() || '—',
        style: 'footerText',
        margin: [0, 4, 0, 0],
      },
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' },
        ],
        margin: [0, 20, 0, 12],
      },
      {
        text: 'Bu belge Eduvia SuperAdmin sistemi tarafından dijital olarak oluşturulmuştur.',
        style: 'disclaimer',
      },
    ],
    styles: {
      brandTitle: { fontSize: 20, bold: true, color: '#2563eb' },
      receiptTitle: { fontSize: 14, color: '#64748b', margin: [0, 2, 0, 0] },
      sectionTitle: {
        fontSize: 11,
        bold: true,
        color: '#2563eb',
        margin: [0, 14, 0, 8],
      },
      metaLabel: { fontSize: 8, color: '#94a3b8' },
      metaValue: { fontSize: 10, bold: true, color: '#0f172a' },
      fieldLabel: { fontSize: 9, color: '#64748b' },
      fieldValue: { fontSize: 10, color: '#0f172a' },
      footerLabel: { fontSize: 9, bold: true, color: '#475569' },
      footerText: { fontSize: 9, color: '#475569' },
      disclaimer: { fontSize: 8, color: '#94a3b8', alignment: 'center' },
    },
  };

  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).getBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('PDF oluşturulamadı.'));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/** @param {Blob} blob @param {string} fileName */
export function downloadPdfBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
