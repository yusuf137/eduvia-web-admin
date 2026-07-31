import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import PaymentHistoryStatCards from '../../components/superadmin/payments/PaymentHistoryStatCards';
import PaymentHistoryFilters from '../../components/superadmin/payments/PaymentHistoryFilters';
import PaymentHistoryTable from '../../components/superadmin/payments/PaymentHistoryTable';
import AddSubscriptionPaymentModal from '../../components/superadmin/payments/AddSubscriptionPaymentModal';
import SubscriptionPaymentDetailModal from '../../components/superadmin/payments/SubscriptionPaymentDetailModal';
import PaymentReceiptUploadModal from '../../components/superadmin/payments/PaymentReceiptUploadModal';
import {
  computePaymentHistoryStats,
  getSubscriptionPaymentById,
  listSubscriptionPaymentRecords,
  softDeleteSubscriptionPayment,
} from '../../services/subscriptionPaymentService';
import { removePaymentReceipt } from '../../services/paymentReceiptService';
import { generateAndSavePaymentReceiptPdf } from '../../services/generatedReceiptService';
import { downloadPaymentsCsv, downloadPaymentsExcel } from '../../utils/paymentExport';
import { parseDateInput } from '../../utils/dateFormat';

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState('');
  const [receiptBusy, setReceiptBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [viewPayment, setViewPayment] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [receiptUploadPayment, setReceiptUploadPayment] = useState(null);
  const [receiptUploadMode, setReceiptUploadMode] = useState('upload');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await listSubscriptionPaymentRecords();
      setPayments(rows);
    } catch (e) {
      setError(e?.message ?? 'Ödeme geçmişi yüklenemedi.');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshPayment = useCallback(async (paymentId) => {
    const updated = await getSubscriptionPaymentById(paymentId);
    if (!updated) return;
    setPayments((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    setViewPayment((prev) => (prev?.id === updated.id ? updated : prev));
  }, []);

  const stats = useMemo(() => computePaymentHistoryStats(payments), [payments]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    const from = dateFrom ? parseDateInput(dateFrom) : null;
    const to = dateTo ? parseDateInput(dateTo) : null;
    if (to) {
      to.setHours(23, 59, 59, 999);
    }

    return payments.filter((row) => {
      const matchesSearch =
        !query || row.institutionName.toLocaleLowerCase('tr-TR').includes(query);
      const paymentDate = row.paymentDate?.toDate?.() ?? null;
      const matchesFrom = !from || (paymentDate && paymentDate >= from);
      const matchesTo = !to || (paymentDate && paymentDate <= to);
      const matchesStatus = !statusFilter || row.status === statusFilter;
      const matchesMethod = !methodFilter || row.paymentMethod === methodFilter;
      return matchesSearch && matchesFrom && matchesTo && matchesStatus && matchesMethod;
    });
  }, [payments, search, dateFrom, dateTo, statusFilter, methodFilter]);

  const handleDelete = async (payment) => {
    if (
      !window.confirm(
        `${payment.paymentNumber} numaralı ödeme kaydı silinsin mi? (Soft delete)`,
      )
    ) {
      return;
    }
    setActingId(payment.id);
    setError('');
    try {
      await softDeleteSubscriptionPayment(payment.id);
      await load();
    } catch (e) {
      setError(e?.message ?? 'Ödeme silinemedi.');
    } finally {
      setActingId('');
    }
  };

  const openReceiptUpload = (payment, mode = 'upload') => {
    setReceiptUploadMode(mode);
    setReceiptUploadPayment(payment);
  };

  const handleViewReceipt = (payment) => {
    if (payment.receiptUrl) {
      window.open(payment.receiptUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleViewGeneratedReceipt = (payment) => {
    if (payment.generatedReceiptUrl) {
      window.open(payment.generatedReceiptUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleGeneratePdfReceipt = async (payment) => {
    const isRegenerate = Boolean(payment.generatedReceiptUrl);
    const message = isRegenerate
      ? `${payment.paymentNumber} için yeni PDF makbuz oluşturulsun mu? (Eski sürüm korunur)`
      : `${payment.paymentNumber} için PDF makbuz oluşturulsun mu?`;
    if (!window.confirm(message)) {
      return;
    }

    setReceiptBusy(true);
    setActingId(payment.id);
    setError('');
    try {
      await generateAndSavePaymentReceiptPdf(payment);
      await refreshPayment(payment.id);
    } catch (e) {
      setError(e?.message ?? 'PDF makbuz oluşturulamadı.');
    } finally {
      setReceiptBusy(false);
      setActingId('');
    }
  };

  const handleDeleteReceipt = async (payment) => {
    if (!window.confirm('Makbuz silinsin mi?')) {
      return;
    }
    setReceiptBusy(true);
    setActingId(payment.id);
    setError('');
    try {
      await removePaymentReceipt(payment);
      await refreshPayment(payment.id);
    } catch (e) {
      setError(e?.message ?? 'Makbuz silinemedi.');
    } finally {
      setReceiptBusy(false);
      setActingId('');
    }
  };

  const handleReceiptSaved = async () => {
    if (receiptUploadPayment?.id) {
      await refreshPayment(receiptUploadPayment.id);
    } else {
      await load();
    }
  };

  const handleExportCsv = () => {
    downloadPaymentsCsv(filteredRows);
    setExportOpen(false);
  };

  const handleExportExcel = () => {
    downloadPaymentsExcel(filteredRows);
    setExportOpen(false);
  };

  return (
    <div className="page-stack payment-history-page">
      <div className="page-toolbar">
        <div>
          <h2 className="page-heading">Ödeme Geçmişi</h2>
          <p className="muted">Kurum abonelik tahsilatları ve ödeme kayıtları</p>
        </div>
        <div className="page-toolbar__actions">
          <div className="export-dropdown">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setExportOpen((value) => !value)}>
              <Download size={16} />
              Dışa Aktar
            </button>
            {exportOpen ? (
              <div className="export-dropdown__menu">
                <button type="button" onClick={handleExportCsv}>
                  CSV indir
                </button>
                <button type="button" onClick={handleExportExcel}>
                  Excel indir
                </button>
              </div>
            ) : null}
          </div>
          <button type="button" className="btn btn--primary" onClick={() => setAddOpen(true)}>
            <Plus size={16} />
            Yeni Ödeme
          </button>
        </div>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      <PaymentHistoryStatCards stats={stats} loading={loading} />

      <PaymentHistoryFilters
        search={search}
        onSearchChange={setSearch}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        methodFilter={methodFilter}
        onMethodFilterChange={setMethodFilter}
      />

      <section className="page-card">
        <PaymentHistoryTable
          rows={filteredRows}
          loading={loading}
          onView={setViewPayment}
          onDelete={(row) => void handleDelete(row)}
          onViewReceipt={handleViewReceipt}
          onViewGeneratedReceipt={handleViewGeneratedReceipt}
          onUploadReceipt={(row) => openReceiptUpload(row, 'upload')}
          onReplaceReceipt={(row) => openReceiptUpload(row, 'replace')}
          onDeleteReceipt={(row) => void handleDeleteReceipt(row)}
          onGeneratePdfReceipt={(row) => void handleGeneratePdfReceipt(row)}
          actingId={actingId}
        />
      </section>

      <AddSubscriptionPaymentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => void load()}
      />

      <SubscriptionPaymentDetailModal
        payment={viewPayment}
        open={Boolean(viewPayment)}
        onClose={() => setViewPayment(null)}
        receiptBusy={receiptBusy}
        onUploadReceipt={(row) => openReceiptUpload(row, 'upload')}
        onReplaceReceipt={(row) => openReceiptUpload(row, 'replace')}
        onDeleteReceipt={(row) => void handleDeleteReceipt(row)}
        onGeneratePdfReceipt={(row) => void handleGeneratePdfReceipt(row)}
      />

      <PaymentReceiptUploadModal
        payment={receiptUploadPayment}
        open={Boolean(receiptUploadPayment)}
        mode={receiptUploadMode}
        onClose={() => setReceiptUploadPayment(null)}
        onSaved={() => void handleReceiptSaved()}
      />
    </div>
  );
}
