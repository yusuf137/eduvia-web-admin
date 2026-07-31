import {
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  Landmark,
  MoreHorizontal,
  Receipt,
  StickyNote,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AUDIT_MODULES,
  AUDIT_MODULE_LABELS,
} from '../../../constants/auditActions';
import { getAuditActionUiLabel } from '../../../constants/auditActionUiLabels';
import {
  AUDIT_TIMELINE_CATEGORY_CLASS,
  AUDIT_TIMELINE_FILTER_OPTIONS,
  AUDIT_TIMELINE_FILTERS,
  getTimelineVisualCategory,
  matchesTimelineFilter,
} from '../../../constants/auditTimelineFilters';
import {
  INSTITUTION_TIMELINE_PAGE_SIZE,
  listInstitutionAuditLogsPage,
} from '../../../services/auditLogService';
import {
  formatTimelineDate,
  formatTimelineTime,
  groupAuditLogsByDateLabel,
} from '../../../utils/auditTimelineHelpers';
import AuditLogDetailModal from './AuditLogDetailModal';

/** @param {string} module */
function TimelineIcon({ module }) {
  const props = { size: 18, strokeWidth: 2.2 };
  switch (module) {
    case AUDIT_MODULES.INSTITUTION:
      return <Building2 {...props} />;
    case AUDIT_MODULES.SUBSCRIPTION:
      return <CreditCard {...props} />;
    case AUDIT_MODULES.PAYMENT:
      return <Landmark {...props} />;
    case AUDIT_MODULES.RECEIPT:
      return <Receipt {...props} />;
    case AUDIT_MODULES.NOTE:
      return <StickyNote {...props} />;
    case AUDIT_MODULES.DEMO:
      return <ClipboardList {...props} />;
    case AUDIT_MODULES.LEGAL:
      return <FileText {...props} />;
    default:
      return <MoreHorizontal {...props} />;
  }
}

/**
 * @param {object} props
 * @param {string} props.institutionId
 */
export default function InstitutionActivityTimeline({ institutionId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [filterKey, setFilterKey] = useState(AUDIT_TIMELINE_FILTERS.ALL);
  const [search, setSearch] = useState('');
  const [viewLog, setViewLog] = useState(null);

  const loadInitial = useCallback(async () => {
    if (!institutionId) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const page = await listInstitutionAuditLogsPage({
        institutionId,
        pageSize: INSTITUTION_TIMELINE_PAGE_SIZE,
      });
      setRows(page.rows);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (e) {
      setError(e?.message ?? 'Aktivite zaman çizelgesi yüklenemedi.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = async () => {
    if (!hasMore || loadingMore || !institutionId) {
      return;
    }
    setLoadingMore(true);
    setError('');
    try {
      const page = await listInstitutionAuditLogsPage({
        institutionId,
        pageSize: INSTITUTION_TIMELINE_PAGE_SIZE,
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
    const queryText = search.trim().toLocaleLowerCase('tr-TR');
    return rows.filter((row) => {
      const matchesFilter = matchesTimelineFilter(filterKey, row.module);
      const matchesSearch =
        !queryText ||
        String(row.description ?? '').toLocaleLowerCase('tr-TR').includes(queryText);
      return matchesFilter && matchesSearch;
    });
  }, [rows, filterKey, search]);

  const groupedRows = useMemo(
    () => groupAuditLogsByDateLabel(filteredRows),
    [filteredRows],
  );

  if (loading) {
    return <p className="muted">Aktivite zaman çizelgesi yükleniyor…</p>;
  }

  return (
    <div className="activity-timeline">
      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="activity-timeline__toolbar">
        <div className="activity-timeline__filters">
          {AUDIT_TIMELINE_FILTER_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`activity-timeline__filter-btn${
                filterKey === option.key ? ' activity-timeline__filter-btn--active' : ''
              }`}
              onClick={() => setFilterKey(option.key)}>
              {option.label}
            </button>
          ))}
        </div>
        <label className="activity-timeline__search">
          <span className="sr-only">Açıklama ara</span>
          <input
            type="search"
            placeholder="Açıklama metninde ara…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      {!rows.length ? (
        <div className="activity-timeline__empty">
          <div className="activity-timeline__empty-icon" aria-hidden="true">
            📋
          </div>
          <p>Bu kuruma ait henüz bir aktivite kaydı bulunmuyor.</p>
        </div>
      ) : !filteredRows.length ? (
        <div className="activity-timeline__empty">
          <p className="muted">Filtreye uygun aktivite kaydı bulunamadı.</p>
        </div>
      ) : (
        <div className="activity-timeline__groups">
          {groupedRows.map((group) => (
            <section key={group.label} className="activity-timeline__group">
              <h4 className="activity-timeline__group-title">{group.label}</h4>
              <div className="activity-timeline__list">
                {group.items.map((log) => {
                  const category = getTimelineVisualCategory(log.module);
                  const dotClass =
                    AUDIT_TIMELINE_CATEGORY_CLASS[category] ??
                    AUDIT_TIMELINE_CATEGORY_CLASS.other;

                  return (
                    <article key={log.id} className="activity-timeline__item">
                      <div className="activity-timeline__track" aria-hidden="true">
                        <span className={`activity-timeline__dot ${dotClass}`}>
                          <TimelineIcon module={log.module} />
                        </span>
                        <span className="activity-timeline__line" />
                      </div>

                      <div className="activity-timeline__card">
                        <div className="activity-timeline__card-head">
                          <div>
                            <h5 className="activity-timeline__title">
                              {getAuditActionUiLabel(log.action)}
                            </h5>
                            <span className="activity-timeline__type muted">
                              {AUDIT_MODULE_LABELS[log.module] ?? log.module}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            onClick={() => setViewLog(log)}>
                            Detayları Gör
                          </button>
                        </div>

                        <div className="activity-timeline__meta">
                          <span className="activity-timeline__user">{log.performedBy || '—'}</span>
                          <span className="activity-timeline__date">
                            {formatTimelineDate(log.createdAt)}
                          </span>
                          <span className="activity-timeline__time">
                            {formatTimelineTime(log.createdAt)}
                          </span>
                        </div>

                        {log.description ? (
                          <p className="activity-timeline__description">{log.description}</p>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {hasMore && filteredRows.length > 0 ? (
        <div className="activity-timeline__more">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => void loadMore()}
            disabled={loadingMore}>
            {loadingMore ? 'Yükleniyor…' : 'Daha Fazla Göster'}
          </button>
        </div>
      ) : null}

      <AuditLogDetailModal
        log={viewLog}
        open={Boolean(viewLog)}
        onClose={() => setViewLog(null)}
      />
    </div>
  );
}
