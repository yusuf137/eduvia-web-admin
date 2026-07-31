import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import AuditLogDetailModal from '../../components/superadmin/audit/AuditLogDetailModal';
import {
  AuditLogFilters,
  AuditLogStatCards,
  AuditLogTable,
} from '../../components/superadmin/audit/AuditLogPageSections';
import {
  AUDIT_LOG_PAGE_SIZE,
  computeAuditLogStats,
  listAuditLogsPage,
} from '../../services/auditLogService';
import {
  downloadAuditLogsCsv,
  downloadAuditLogsExcel,
  downloadAuditLogsPdf,
} from '../../utils/auditLogExport';
import { parseDateInput } from '../../utils/dateFormat';

export default function AuditLogPage() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({
    todayCount: 0,
    last7DaysCount: 0,
    mostActiveAdmin: '—',
    lastActionAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [viewLog, setViewLog] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [institutionSearch, setInstitutionSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [page, statRows] = await Promise.all([
        listAuditLogsPage({ pageSize: AUDIT_LOG_PAGE_SIZE }),
        computeAuditLogStats(),
      ]);
      setRows(page.rows);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setStats(statRows);
    } catch (e) {
      setError(e?.message ?? 'Aktivite geçmişi yüklenemedi.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const page = await listAuditLogsPage({
        pageSize: AUDIT_LOG_PAGE_SIZE,
        cursor,
      });
      setRows((prev) => [...prev, ...page.rows]);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (e) {
      setError(e?.message ?? 'Daha fazla kayıt yüklenemedi.');
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredRows = useMemo(() => {
    const userQuery = userSearch.trim().toLocaleLowerCase('tr-TR');
    const instQuery = institutionSearch.trim().toLocaleLowerCase('tr-TR');
    const from = dateFrom ? parseDateInput(dateFrom) : null;
    const to = dateTo ? parseDateInput(dateTo) : null;
    if (to) {
      to.setHours(23, 59, 59, 999);
    }

    return rows.filter((row) => {
      const userHaystack = `${row.performedBy} ${row.performedByEmail ?? ''}`.toLocaleLowerCase('tr-TR');
      const matchesUser = !userQuery || userHaystack.includes(userQuery);
      const matchesInstitution =
        !instQuery || String(row.institutionName ?? '').toLocaleLowerCase('tr-TR').includes(instQuery);
      const matchesAction = !actionFilter || row.action === actionFilter;
      const created = row.createdAt?.toDate?.() ?? null;
      const matchesFrom = !from || (created && created >= from);
      const matchesTo = !to || (created && created <= to);
      return matchesUser && matchesInstitution && matchesAction && matchesFrom && matchesTo;
    });
  }, [rows, userSearch, institutionSearch, actionFilter, dateFrom, dateTo]);

  const handleExportCsv = () => {
    downloadAuditLogsCsv(filteredRows);
    setExportOpen(false);
  };

  const handleExportExcel = () => {
    downloadAuditLogsExcel(filteredRows);
    setExportOpen(false);
  };

  const handleExportPdf = () => {
    void downloadAuditLogsPdf(filteredRows).finally(() => setExportOpen(false));
  };

  return (
    <div className="page-stack audit-log-page">
      <div className="page-toolbar">
        <div>
          <h2 className="page-heading">Aktivite Geçmişi</h2>
          <p className="muted">Sistemde gerçekleşen tüm önemli SuperAdmin işlemleri</p>
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
                <button type="button" onClick={() => void handleExportPdf()}>
                  PDF indir
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      <AuditLogStatCards stats={stats} loading={loading} />

      <AuditLogFilters
        userSearch={userSearch}
        onUserSearchChange={setUserSearch}
        institutionSearch={institutionSearch}
        onInstitutionSearchChange={setInstitutionSearch}
        actionFilter={actionFilter}
        onActionFilterChange={setActionFilter}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
      />

      <section className="page-card">
        <AuditLogTable rows={filteredRows} loading={loading} onView={setViewLog} />
        {hasMore ? (
          <div className="audit-log-page__more">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => void loadMore()}
              disabled={loadingMore}>
              {loadingMore ? 'Yükleniyor…' : 'Daha fazla yükle'}
            </button>
          </div>
        ) : null}
      </section>

      <AuditLogDetailModal
        log={viewLog}
        open={Boolean(viewLog)}
        onClose={() => setViewLog(null)}
      />
    </div>
  );
}
