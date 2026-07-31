import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscriptionActionGuard } from '../../contexts/SubscriptionActionGuardContext';
import { isModuleEnabled, normalizeModules } from '../../constants/institutionModules';
import { auth, db } from '../../firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { WEEKDAY_OPTIONS, getLessonTypeLabel } from '../../services/scheduleService';
import {
  fetchScheduleRequests,
  fetchAttendanceRequests,
  fetchMakeupRequests,
  fetchLessonCancellations,
  approveScheduleRequest,
  rejectScheduleRequest,
  approveAttendanceRequest,
  rejectAttendanceRequest,
  approveMakeupLessonRequest,
  rejectMakeupLessonRequest,
  formatRequestedDateTr,
} from '../../services/requestService';

const TABS = [
  { key: 'schedule', label: 'Ders Saat Değişimi' },
  { key: 'attendance', label: 'Geçmiş Yoklama' },
  { key: 'makeup', label: 'Telafi Talepleri' },
  { key: 'cancellations', label: 'Ders İptalleri' },
];

const TAB_MODULE = {
  schedule: 'scheduleRequests',
  attendance: 'attendance',
  makeup: 'makeupLessons',
  cancellations: 'lessons',
};

const STATUS_FILTERS = [
  { key: 'pending', label: 'Bekleyen' },
  { key: 'approved', label: 'Onaylı' },
  { key: 'rejected', label: 'Reddedilen' },
  { key: 'all', label: 'Tümü' },
];

const DAY_LABEL = Object.fromEntries(WEEKDAY_OPTIONS.map((x) => [x.day, x.label]));

function dayToLabel(day) {
  const n = typeof day === 'number' ? day : Number(day);
  return DAY_LABEL[n] ?? `Gün ${n}`;
}

function formatHours(hours) {
  if (!Array.isArray(hours) || !hours.length) return '—';
  return hours.map(String).join(' · ');
}

function changeTypeLabel(type) {
  if (type === 'one_time') return 'Geçici (bu hafta)';
  if (type === 'permanent') return 'Kalıcı';
  return String(type || '—');
}

function statusLabel(status) {
  if (status === 'pending') return 'Bekliyor';
  if (status === 'approved') return 'Onaylandı';
  if (status === 'rejected') return 'Reddedildi';
  if (status === 'cancelled') return 'İptal';
  return String(status || '—');
}

function statusBadgeClass(status) {
  if (status === 'pending') return 'badge badge--warn';
  if (status === 'approved') return 'badge badge--ok';
  if (status === 'rejected') return 'badge badge--danger';
  return 'badge badge--muted';
}

function filterByStatus(rows, statusFilter) {
  if (statusFilter === 'all') return rows;
  return rows.filter((r) => String(r.status ?? '') === statusFilter);
}

function RequestCard({ title, meta, status, children, actions }) {
  return (
    <article className="request-card">
      <div className="request-card__head">
        <h3 className="request-card__title">{title}</h3>
        <span className={statusBadgeClass(status)}>{statusLabel(status)}</span>
      </div>
      <dl className="request-card__meta">{meta}</dl>
      {children}
      {actions ? <div className="request-card__actions">{actions}</div> : null}
    </article>
  );
}

export default function RequestsPage() {
  const { currentUserProfile, institutionModules } = useAuth();
  const { ensureAllowed, resolveActionError } = useSubscriptionActionGuard();
  const institutionId = currentUserProfile?.institutionId ?? '';
  const adminUid = auth.currentUser?.uid ?? '';

  const [activeTab, setActiveTab] = useState('schedule');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [scheduleRows, setScheduleRows] = useState([]);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [makeupRows, setMakeupRows] = useState([]);
  const [cancellationRows, setCancellationRows] = useState([]);
  const [lessonMap, setLessonMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actingKey, setActingKey] = useState('');

  const loadAll = useCallback(async () => {
    if (!institutionId) {
      setLoading(false);
      return;
    }
    // eslint-disable-next-line no-console
    console.log('WEB REQUESTS PROFILE:', currentUserProfile);
    setLoading(true);
    setError('');
    try {
      const [sched, att, makeup, cancels] = await Promise.all([
        fetchScheduleRequests(institutionId),
        fetchAttendanceRequests(institutionId),
        fetchMakeupRequests(institutionId),
        fetchLessonCancellations(institutionId),
      ]);
      setScheduleRows(sched);
      setAttendanceRows(att);
      setMakeupRows(makeup);
      setCancellationRows(cancels);
    } catch (e) {
      setError(e?.message ?? 'Talepler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [institutionId, currentUserProfile]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const visibleTabs = useMemo(() => {
    const mods = normalizeModules(institutionModules);
    return TABS.filter((t) => {
      const mod = TAB_MODULE[t.key];
      return !mod || isModuleEnabled(mods, mod);
    });
  }, [institutionModules]);

  useEffect(() => {
    if (!visibleTabs.some((t) => t.key === activeTab)) {
      setActiveTab(visibleTabs[0]?.key ?? 'schedule');
    }
  }, [visibleTabs, activeTab]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('WEB ACTIVE REQUEST TAB:', activeTab);
    // eslint-disable-next-line no-console
    console.log('WEB VISIBLE REQUEST TABS:', visibleTabs.map((t) => t.label));
  }, [activeTab, visibleTabs]);

  const lessonIdsToLoad = useMemo(() => {
    const ids = new Set();
    scheduleRows.forEach((r) => {
      if (r.lessonId) ids.add(r.lessonId);
    });
    attendanceRows.forEach((r) => {
      if (r.lessonId) ids.add(r.lessonId);
    });
    return [...ids].filter((id) => lessonMap[id] === undefined);
  }, [scheduleRows, attendanceRows, lessonMap]);

  useEffect(() => {
    if (!lessonIdsToLoad.length) return undefined;
    let cancelled = false;
    (async () => {
      const updates = {};
      for (const id of lessonIdsToLoad) {
        try {
          const snap = await getDoc(doc(db, 'lessons', id));
          updates[id] = snap.exists() ? snap.data() : null;
        } catch {
          updates[id] = null;
        }
      }
      if (!cancelled) {
        setLessonMap((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonIdsToLoad.join('|')]);

  const runAction = async (key, fn) => {
    if (!adminUid) {
      setError('Oturum bulunamadı.');
      return;
    }
    if (!ensureAllowed()) {
      return;
    }
    setActingKey(key);
    setError('');
    setSuccess('');
    try {
      const result = await fn();
      if (result?.notificationFailed) {
        setSuccess('Talep reddedildi ama bildirim oluşturulamadı.');
      } else {
        setSuccess('İşlem tamamlandı.');
      }
      await loadAll();
    } catch (e) {
      const msg = resolveActionError(e, 'İşlem başarısız.');
      if (msg) setError(msg);
    } finally {
      setActingKey('');
    }
  };

  const visibleSchedule = useMemo(
    () => filterByStatus(scheduleRows, statusFilter),
    [scheduleRows, statusFilter],
  );
  const visibleAttendance = useMemo(
    () => filterByStatus(attendanceRows, statusFilter),
    [attendanceRows, statusFilter],
  );
  const visibleMakeup = useMemo(
    () => filterByStatus(makeupRows, statusFilter),
    [makeupRows, statusFilter],
  );
  const visibleCancellations = useMemo(() => {
    if (statusFilter === 'all') return cancellationRows;
    if (statusFilter === 'pending') return [];
    return cancellationRows.filter((r) => String(r.status) === statusFilter);
  }, [cancellationRows, statusFilter]);

  const lessonInfo = (lessonId) => {
    const lesson = lessonMap[lessonId];
    if (lesson === undefined) return 'Ders bilgisi yükleniyor…';
    if (!lesson) return 'Ders bulunamadı';
    return `${getLessonTypeLabel(lesson.lessonType)} · ${String(lesson.branch ?? '—')} · ${String(lesson.teacherName ?? '—')}`;
  };

  const renderSchedule = () => {
    if (!visibleSchedule.length) {
      return <p className="muted requests-empty">Kayıt bulunamadı.</p>;
    }
    return visibleSchedule.map((row) => {
      const pending = row.status === 'pending';
      const acting = actingKey === `schedule:${row.id}`;
      return (
        <RequestCard
          key={row.id}
          title={row.studentName}
          status={row.status}
          meta={
            <>
              <div>
                <dt>Öğretmen</dt>
                <dd>{lessonMap[row.lessonId]?.teacherName ?? '—'}</dd>
              </div>
              <div>
                <dt>Ders</dt>
                <dd>{lessonInfo(row.lessonId)}</dd>
              </div>
              <div>
                <dt>Mevcut</dt>
                <dd>
                  {dayToLabel(row.currentDay)} · {formatHours(row.currentHours)}
                </dd>
              </div>
              <div>
                <dt>İstenen</dt>
                <dd>
                  {dayToLabel(row.requestedDay)} · {formatHours(row.requestedHours)}
                </dd>
              </div>
              <div>
                <dt>Tip</dt>
                <dd>{changeTypeLabel(row.changeType)}</dd>
              </div>
              <div>
                <dt>Oluşturulma</dt>
                <dd>{row.createdAtLabel}</dd>
              </div>
            </>
          }
          actions={
            pending ? (
              <>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={acting}
                  onClick={() =>
                    void runAction(`schedule:${row.id}`, () =>
                      approveScheduleRequest(row.id, currentUserProfile),
                    )
                  }>
                  {acting ? '…' : 'Onayla'}
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  disabled={acting}
                  onClick={() =>
                    void runAction(`schedule:${row.id}`, () =>
                      rejectScheduleRequest(row.id, currentUserProfile),
                    )
                  }>
                  Reddet
                </button>
              </>
            ) : null
          }
        />
      );
    });
  };

  const renderAttendance = () => {
    if (!visibleAttendance.length) {
      return <p className="muted requests-empty">Kayıt bulunamadı.</p>;
    }
    return visibleAttendance.map((row) => {
      const pending = row.status === 'pending';
      const acting = actingKey === `attendance:${row.id}`;
      const dateLabel = formatRequestedDateTr(row.requestedDate);
      return (
        <RequestCard
          key={row.id}
          title={`${row.teacherName} — ${dateLabel}`}
          status={row.status}
          meta={
            <>
              <div>
                <dt>Öğretmen</dt>
                <dd>{row.teacherName}</dd>
              </div>
              <div>
                <dt>Öğrenci</dt>
                <dd>{row.studentName}</dd>
              </div>
              <div>
                <dt>İstenen tarih</dt>
                <dd>{dateLabel}</dd>
              </div>
              <div>
                <dt>Ders</dt>
                <dd>{lessonInfo(row.lessonId)}</dd>
              </div>
              <div>
                <dt>Sebep</dt>
                <dd>{row.reason || '—'}</dd>
              </div>
              <div>
                <dt>Oluşturulma</dt>
                <dd>{row.createdAtLabel}</dd>
              </div>
            </>
          }
          actions={
            pending ? (
              <>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={acting}
                  onClick={() =>
                    void runAction(`attendance:${row.id}`, () =>
                      approveAttendanceRequest(row.id, currentUserProfile),
                    )
                  }>
                  {acting ? '…' : 'Onayla'}
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  disabled={acting}
                  onClick={() =>
                    void runAction(`attendance:${row.id}`, () =>
                      rejectAttendanceRequest(row.id, currentUserProfile),
                    )
                  }>
                  Reddet
                </button>
              </>
            ) : null
          }
        />
      );
    });
  };

  const renderMakeup = () => {
    if (!visibleMakeup.length) {
      return <p className="muted requests-empty">Kayıt bulunamadı.</p>;
    }
    return visibleMakeup.map((row) => {
      const pending = row.status === 'pending';
      const acting = actingKey === `makeup:${row.id}`;
      const creditNote = row.creditReserved
        ? row.creditReturned
          ? 'Hak iade edildi'
          : 'Hak düşürüldü (bekliyor)'
        : 'Hak düşürülmedi';
      return (
        <RequestCard
          key={row.id}
          title={row.studentName}
          status={row.status}
          meta={
            <>
              <div>
                <dt>Öğretmen</dt>
                <dd>{row.teacherName}</dd>
              </div>
              <div>
                <dt>Branş</dt>
                <dd>{row.branch || '—'}</dd>
              </div>
              <div>
                <dt>İstenen</dt>
                <dd>
                  {dayToLabel(row.requestedDay)} · {row.requestedHour || formatHours(row.requestedHours)}
                </dd>
              </div>
              <div>
                <dt>Telafi hakkı</dt>
                <dd>{creditNote}</dd>
              </div>
              <div>
                <dt>Oluşturulma</dt>
                <dd>{row.createdAtLabel}</dd>
              </div>
            </>
          }
          actions={
            pending ? (
              <>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={acting}
                  onClick={() =>
                    void runAction(`makeup:${row.id}`, () =>
                      approveMakeupLessonRequest(row.id, currentUserProfile),
                    )
                  }>
                  {acting ? '…' : 'Onayla'}
                </button>
                <button
                  type="button"
                  className="btn btn--danger"
                  disabled={acting}
                  onClick={() =>
                    void runAction(`makeup:${row.id}`, () =>
                      rejectMakeupLessonRequest(row.id, currentUserProfile),
                    )
                  }>
                  Reddet
                </button>
              </>
            ) : null
          }
        />
      );
    });
  };

  const renderCancellations = () => {
    if (!visibleCancellations.length) {
      return <p className="muted requests-empty">İptal kaydı bulunamadı.</p>;
    }
    return visibleCancellations.map((row) => (
      <RequestCard
        key={row.id}
        title={row.studentName}
        status={row.status || 'cancelled'}
        meta={
          <>
            <div>
              <dt>Öğretmen</dt>
              <dd>{row.teacherName}</dd>
            </div>
            <div>
              <dt>Ders tarihi</dt>
              <dd>{formatRequestedDateTr(row.lessonDate)}</dd>
            </div>
            <div>
              <dt>Saat</dt>
              <dd>{formatHours(row.lessonHours)}</dd>
            </div>
            <div>
              <dt>Branş</dt>
              <dd>{row.branch || '—'}</dd>
            </div>
            <div>
              <dt>Sebep</dt>
              <dd>{row.reason || '—'}</dd>
            </div>
            <div>
              <dt>Oluşturulma</dt>
              <dd>{row.createdAtLabel}</dd>
            </div>
          </>
        }
      />
    ));
  };

  return (
    <div className="page-stack requests-page">
      <div className="page-toolbar">
        <div>
          <h2 className="page-heading">Talepler / Onaylar</h2>
          <p className="muted">Yalnızca kurumunuza ait talepler listelenir.</p>
        </div>
      </div>

      <div className="filter-bar requests-tabs">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`filter-bar__btn${activeTab === t.key ? ' filter-bar__btn--active' : ''}`}
            onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab !== 'cancellations' ? (
        <div className="filter-bar requests-status-filter">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`filter-bar__btn filter-bar__btn--sm${statusFilter === f.key ? ' filter-bar__btn--active' : ''}`}
              onClick={() => setStatusFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="muted requests-cancel-hint">Ders iptalleri bilgilendirme amaçlı listelenir.</p>
      )}

      {error ? <div className="alert alert--error">{error}</div> : null}
      {success ? <div className="alert alert--success">{success}</div> : null}

      {loading ? (
        <p className="muted">Talepler yükleniyor…</p>
      ) : (
        <div className="requests-list">
          {activeTab === 'schedule' ? renderSchedule() : null}
          {activeTab === 'attendance' ? renderAttendance() : null}
          {activeTab === 'makeup' ? renderMakeup() : null}
          {activeTab === 'cancellations' ? renderCancellations() : null}
        </div>
      )}
    </div>
  );
}
