import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import RejectedInstitutionFormModal from '../../components/superadmin/rejectedInstitutions/RejectedInstitutionFormModal';
import { RejectedInstitutionDetailModal } from '../../components/superadmin/rejectedInstitutions/RejectedInstitutionDetailModal';
import RejectedInstitutionFilters, {
  RejectedInstitutionStatCards,
} from '../../components/superadmin/rejectedInstitutions/RejectedInstitutionFilters';
import RejectedInstitutionTable from '../../components/superadmin/rejectedInstitutions/RejectedInstitutionTable';
import {
  computeRejectedInstitutionStats,
  createRejectedInstitution,
  listRejectedInstitutions,
  softDeleteRejectedInstitution,
  updateRejectedInstitution,
} from '../../services/rejectedInstitutionService';
import {
  downloadRejectedInstitutionsCsv,
  downloadRejectedInstitutionsExcel,
} from '../../utils/rejectedInstitutionExport';
import { parseDateInput } from '../../utils/dateFormat';

export default function RejectedInstitutionsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);

  const [institutionSearch, setInstitutionSearch] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [recontactFilter, setRecontactFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await listRejectedInstitutions();
      setRows(list);
    } catch (e) {
      setError(e?.message ?? 'Kayıtlar yüklenemedi.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => computeRejectedInstitutionStats(rows), [rows]);

  const filteredRows = useMemo(() => {
    const instQuery = institutionSearch.trim().toLocaleLowerCase('tr-TR');
    const phoneQuery = phoneSearch.trim().toLocaleLowerCase('tr-TR');
    const from = dateFrom ? parseDateInput(dateFrom) : null;
    const to = dateTo ? parseDateInput(dateTo) : null;
    if (to) {
      to.setHours(23, 59, 59, 999);
    }

    return rows.filter((row) => {
      const matchesInstitution =
        !instQuery || row.institutionName.toLocaleLowerCase('tr-TR').includes(instQuery);
      const matchesPhone =
        !phoneQuery || row.phone.toLocaleLowerCase('tr-TR').includes(phoneQuery);
      const matchesReason = !reasonFilter || row.reason === reasonFilter;
      const rejectedDate = row.rejectedAt?.toDate?.() ?? row.createdAt?.toDate?.() ?? null;
      const matchesFrom = !from || (rejectedDate && rejectedDate >= from);
      const matchesTo = !to || (rejectedDate && rejectedDate <= to);
      const matchesRecontact =
        !recontactFilter
        || (recontactFilter === 'yes' && row.recontact)
        || (recontactFilter === 'no' && !row.recontact);

      return (
        matchesInstitution
        && matchesPhone
        && matchesReason
        && matchesFrom
        && matchesTo
        && matchesRecontact
      );
    });
  }, [
    rows,
    institutionSearch,
    phoneSearch,
    reasonFilter,
    dateFrom,
    dateTo,
    recontactFilter,
  ]);

  const handleCreate = async (payload) => {
    await createRejectedInstitution(payload);
    await load();
  };

  const handleUpdate = async (payload) => {
    if (!editRecord) return;
    await updateRejectedInstitution(editRecord.id, payload);
    await load();
  };

  const handleDelete = async (record) => {
    const ok = window.confirm(`${record.institutionName} kaydı silinsin mi? (Soft delete)`);
    if (!ok) return;

    setActingId(record.id);
    setError('');
    try {
      await softDeleteRejectedInstitution(record.id);
      await load();
    } catch (e) {
      setError(e?.message ?? 'Kayıt silinemedi.');
    } finally {
      setActingId('');
    }
  };

  const handleExportCsv = () => {
    downloadRejectedInstitutionsCsv(filteredRows);
    setExportOpen(false);
  };

  const handleExportExcel = () => {
    downloadRejectedInstitutionsExcel(filteredRows);
    setExportOpen(false);
  };

  return (
    <div className="page-stack rejected-institutions-page">
      <div className="page-toolbar">
        <div>
          <h2 className="page-heading">Red Veren Kurumlar</h2>
          <p className="muted">Teklifimizi reddeden veya Eduvia kullanmak istemeyen kurumlar</p>
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
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setEditRecord(null);
              setFormOpen(true);
            }}>
            <Plus size={16} />
            Yeni Kayıt
          </button>
        </div>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      <RejectedInstitutionStatCards stats={stats} loading={loading} />

      <RejectedInstitutionFilters
        institutionSearch={institutionSearch}
        onInstitutionSearchChange={setInstitutionSearch}
        phoneSearch={phoneSearch}
        onPhoneSearchChange={setPhoneSearch}
        reasonFilter={reasonFilter}
        onReasonFilterChange={setReasonFilter}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        recontactFilter={recontactFilter}
        onRecontactFilterChange={setRecontactFilter}
      />

      <RejectedInstitutionTable
        rows={filteredRows}
        loading={loading}
        actingId={actingId}
        onView={setViewRecord}
        onEdit={(record) => {
          setEditRecord(record);
          setFormOpen(true);
        }}
        onDelete={(record) => void handleDelete(record)}
      />

      <RejectedInstitutionFormModal
        open={formOpen}
        initial={editRecord}
        onClose={() => {
          setFormOpen(false);
          setEditRecord(null);
        }}
        onSubmit={editRecord ? handleUpdate : handleCreate}
      />

      <RejectedInstitutionDetailModal
        record={viewRecord}
        open={Boolean(viewRecord)}
        onClose={() => setViewRecord(null)}
        onEdit={() => {
          setEditRecord(viewRecord);
          setViewRecord(null);
          setFormOpen(true);
        }}
      />
    </div>
  );
}
