import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { fetchInstitutionById } from './institutionService';

export function formatCurrency(value) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) {
    return '0 TL';
  }
  return `${n.toLocaleString('tr-TR')} TL`;
}

export function formatReceiptDate(value) {
  if (!value) {
    return '—';
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString('tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return value.slice(0, 16);
  }
  if (typeof value.toDate === 'function') {
    return value.toDate().toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return '—';
}

export function monthPeriodLabel(monthKey) {
  const [y, m] = String(monthKey ?? '').split('-').map(Number);
  if (!y || !m) {
    return String(monthKey ?? '—');
  }
  const d = new Date(y, m - 1, 1);
  const label = d.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function validateAdminReceiptAccess(payment, institutionId) {
  const inst = String(institutionId ?? '').trim();
  const payInst = String(payment?.institutionId ?? '').trim();
  if (!inst) {
    return 'Oturum veya kurum bilgisi eksik.';
  }
  if (payInst && payInst !== inst) {
    return 'Bu makbuz bu kuruma ait değil.';
  }
  return null;
}

export function normalizePaymentForReceipt(payment, opts = {}) {
  const fallback = String(opts.receivedByFallback ?? 'Kurum').trim() || 'Kurum';
  return {
    ...payment,
    receiptNo: payment?.receiptNo || 'Makbuz No Yok',
    receivedByName: payment?.receivedByName || fallback,
    date: payment?.date ?? payment?.createdAt ?? null,
    dateLabel: payment?.dateLabel || formatReceiptDate(payment?.date ?? payment?.createdAt),
  };
}

export async function fetchInstitutionForReceipt(institutionId) {
  const inst = String(institutionId ?? '').trim();
  if (!inst) {
    return null;
  }
  try {
    const row = await fetchInstitutionById(inst);
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      name: row.name || 'Kurum',
      phone: row.phone || '',
      email: row.email || '',
      address: row.address || '',
      city: row.city || '',
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('INSTITUTION READ ERROR:', error?.code, error?.message);
    return null;
  }
}

export async function resolveInstitutionForReceipt(institutionId, fallbackName = 'Kurum') {
  let institution = await fetchInstitutionForReceipt(institutionId);
  if (!institution) {
    try {
      const snap = await getDoc(doc(db, 'institutions', String(institutionId)));
      if (snap.exists()) {
        const d = snap.data();
        institution = {
          id: snap.id,
          name: String(d.name ?? '').trim() || fallbackName,
          phone: String(d.phone ?? '').trim(),
          email: String(d.email ?? '').trim(),
          address: String(d.address ?? '').trim(),
          city: String(d.city ?? '').trim(),
        };
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('INSTITUTION FALLBACK READ ERROR:', e?.code, e?.message);
    }
  }
  if (!institution) {
    institution = {
      name: fallbackName,
      phone: '',
      email: '',
      address: '',
      city: '',
    };
  }
  return institution;
}

export function buildReceiptDescription(monthKey) {
  const period = monthPeriodLabel(monthKey);
  return `${period} ayına ait eğitim ödemesi alınmıştır.`;
}

/**
 * @param {{ payment: object, institution: object | null }} params
 */
export function buildReceiptHtml({ payment, institution }) {
  const instName = escapeHtml(institution?.name || 'Kurum');
  const instAddress = escapeHtml(
    [institution?.address, institution?.city].filter(Boolean).join(', ') || '',
  );
  const instPhone = escapeHtml(institution?.phone || '');
  const instEmail = escapeHtml(institution?.email || '');
  const contactParts = [];
  if (instPhone) {
    contactParts.push(`Tel: ${instPhone}`);
  }
  if (instEmail) {
    contactParts.push(instEmail);
  }
  const contactLine = escapeHtml(contactParts.join(' · ') || '—');

  const receiptNo = escapeHtml(payment?.receiptNo || '—');
  const studentName = escapeHtml(payment?.studentName || '—');
  const month = escapeHtml(payment?.month || '—');
  const periodLabel = escapeHtml(monthPeriodLabel(payment?.month));
  const amount = escapeHtml(formatCurrency(payment?.amount));
  const dateStr = escapeHtml(formatReceiptDate(payment?.date ?? payment?.createdAt) || payment?.dateLabel || '—');
  const receivedBy = escapeHtml(payment?.receivedByName || '—');
  const description = escapeHtml(buildReceiptDescription(payment?.month));

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>Makbuz ${receiptNo}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      margin: 0;
      padding: 32px;
      color: #111827;
      background: #fff;
    }
    .receipt {
      max-width: 720px;
      margin: 0 auto;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 28px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 16px;
      margin-bottom: 20px;
      gap: 16px;
    }
    h1 {
      font-size: 22px;
      margin: 0 0 8px;
      letter-spacing: 1px;
    }
    .muted {
      color: #6b7280;
      font-size: 13px;
      line-height: 1.5;
    }
    .org-name {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 15px;
      gap: 12px;
    }
    .label { color: #6b7280; flex-shrink: 0; }
    .value { font-weight: 700; text-align: right; }
    .amount {
      font-size: 24px;
      font-weight: 800;
      color: #111827;
    }
    .note {
      margin-top: 20px;
      padding: 14px;
      background: #f8fafc;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.6;
      color: #374151;
    }
    .footer {
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
    @media print {
      body { padding: 0; }
      .receipt { border: none; border-radius: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div>
        <h1>TAHSİLAT MAKBUZU</h1>
        <div class="org-name">${instName}</div>
        ${instAddress ? `<div class="muted">${instAddress}</div>` : ''}
        <div class="muted">${contactLine}</div>
      </div>
      <div class="muted" style="text-align:right;">
        Makbuz No: <strong>${receiptNo}</strong><br />
        Tarih: ${dateStr}
      </div>
    </div>

    <div class="row"><span class="label">Öğrenci</span><span class="value">${studentName}</span></div>
    <div class="row"><span class="label">Ödeme Ayı</span><span class="value">${periodLabel} (${month})</span></div>
    <div class="row"><span class="label">Tahsil Eden</span><span class="value">${receivedBy}</span></div>
    <div class="row"><span class="label">Tutar</span><span class="value amount">${amount}</span></div>

    <div class="note"><strong>Açıklama:</strong> ${description}</div>

    <div class="footer">Bu makbuz Eduvia sistemi üzerinden oluşturulmuştur.</div>
  </div>
</body>
</html>`;
}

export function printReceipt(payment, institution) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Yazdırma penceresi açılamadı. Lütfen pop-up engelleyiciyi kontrol edin.');
    return;
  }

  const html = buildReceiptHtml({ payment, institution });
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const triggerPrint = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.onafterprint = () => {
      printWindow.close();
    };
  };

  if (printWindow.document.readyState === 'complete') {
    triggerPrint();
  } else {
    printWindow.addEventListener('load', triggerPrint, { once: true });
  }
}

export function paymentRowFromReceiptResult(receipt, institutionId, receivedByFallback = '') {
  const inst = String(receipt?.institutionId ?? institutionId ?? '').trim();
  return {
    id: receipt?.paymentId ?? '',
    institutionId: inst,
    studentId: String(receipt?.studentId ?? ''),
    studentName: String(receipt?.studentName ?? ''),
    amount: Number(receipt?.amount ?? 0),
    month: String(receipt?.month ?? ''),
    receiptNo: String(receipt?.receiptNo ?? ''),
    receivedByName: String(receipt?.receivedByName ?? receivedByFallback),
    dateLabel: String(receipt?.paidAtLabel ?? ''),
    date: receipt?.date ?? new Date(),
  };
}
