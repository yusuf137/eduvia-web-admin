import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { listActiveTeachersForLessons } from '../../services/userService';
import {
  WEEKDAY_OPTIONS,
  SCHEDULE_HOURS,
  getLessonTypeLabel,
  isGroupLessonType,
  normalizeLessonType,
  weekStartDateMondayLocal,
  addWeeks,
  weekTitle,
  buildScheduleGridMap,
  buildEffectiveSchedule,
  fetchLessonsForTeacher,
  fetchOverridesForTeacher,
  fetchCancellationsForInstitution,
  formatHoursDisplay,
  normalizeHours,
} from '../../services/scheduleService';

function dayLabel(day) {
  return WEEKDAY_OPTIONS.find((d) => d.day === Number(day))?.label ?? String(day);
}

function lessonTags(lesson, hasConflict) {
  const tags = [];
  if (lesson.isTemporary || lesson.sourceType === 'override') {
    tags.push({ key: 'temp', label: 'Geçici' });
  }
  if (lesson.isMakeup || lesson.lessonType === 'makeup') {
    tags.push({ key: 'makeup', label: 'Telafi' });
  }
  if (hasConflict) {
    tags.push({ key: 'conflict', label: 'Çakışma' });
  }
  return tags;
}

export default function WeeklySchedulePage() {
  const { currentUserProfile } = useAuth();
  const institutionId = currentUserProfile?.institutionId ?? '';

  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [weekStartDate, setWeekStartDate] = useState(() => weekStartDateMondayLocal());
  const [lessons, setLessons] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [cancellations, setCancellations] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!institutionId) {
      setLoadingTeachers(false);
      return () => {};
    }
    let cancelled = false;
    setLoadingTeachers(true);
    void listActiveTeachersForLessons(institutionId)
      .then((list) => {
        if (!cancelled) {
          setTeachers(list);
          setSelectedTeacherId((prev) => {
            const stillValid = prev && list.some((t) => String(t.id) === String(prev));
            if (stillValid) {
              return prev;
            }
            return list[0]?.id ? String(list[0].id) : '';
          });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.log('WEB WEEKLY TEACHERS ERROR:', e?.code, e?.message);
          setError(e?.message ?? 'Öğretmenler yüklenemedi.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingTeachers(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [institutionId]);

  const loadSchedule = useCallback(async () => {
    if (!institutionId || !selectedTeacherId) {
      setLessons([]);
      setOverrides([]);
      setCancellations([]);
      return;
    }

    // eslint-disable-next-line no-console
    console.log('WEB WEEKLY PROFILE:', currentUserProfile);
    // eslint-disable-next-line no-console
    console.log('WEB SELECTED TEACHER:', selectedTeacherId);
    // eslint-disable-next-line no-console
    console.log('WEB WEEK START:', weekStartDate);

    setLoadingSchedule(true);
    setError('');
    try {
      const [lessonRows, overrideRows, cancelRows] = await Promise.all([
        fetchLessonsForTeacher(institutionId, selectedTeacherId),
        fetchOverridesForTeacher(institutionId, selectedTeacherId),
        fetchCancellationsForInstitution(institutionId),
      ]);
      setLessons(lessonRows);
      setOverrides(overrideRows);
      setCancellations(cancelRows);
      // eslint-disable-next-line no-console
      console.log('WEB LESSONS:', lessonRows);
      // eslint-disable-next-line no-console
      console.log('WEB OVERRIDES:', overrideRows);
      // eslint-disable-next-line no-console
      console.log('WEB CANCELLATIONS:', cancelRows);
    } catch (e) {
      setError(e?.message ?? 'Program yüklenemedi.');
    } finally {
      setLoadingSchedule(false);
    }
  }, [institutionId, selectedTeacherId, weekStartDate, currentUserProfile]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const selectedTeacher = useMemo(
    () => teachers.find((t) => String(t.id) === String(selectedTeacherId)) ?? null,
    [teachers, selectedTeacherId],
  );

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('SELECTED TEACHER ID:', selectedTeacherId);
    // eslint-disable-next-line no-console
    console.log('SELECTED TEACHER:', selectedTeacher);
  }, [selectedTeacherId, selectedTeacher]);

  const effectiveLessons = useMemo(
    () =>
      buildEffectiveSchedule({
        lessons,
        overrides,
        cancellations,
        weekStartDate,
        teacherId: selectedTeacherId,
      }),
    [lessons, overrides, cancellations, weekStartDate, selectedTeacherId],
  );

  const gridMap = useMemo(() => buildScheduleGridMap(effectiveLessons), [effectiveLessons]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('EFFECTIVE LESSONS:', effectiveLessons.length, effectiveLessons);
    // eslint-disable-next-line no-console
    console.log('GRID MAP SIZE:', gridMap.size);
  }, [effectiveLessons, gridMap]);

  const isCurrentWeek = weekStartDate === weekStartDateMondayLocal();

  return (
    <div className="page-stack weekly-schedule-page">
      <h2 className="page-heading">Haftalık Program</h2>

      <div className="weekly-toolbar">
        <label className="weekly-toolbar__field">
          Öğretmen
          <select
            value={selectedTeacherId}
            onChange={(e) => {
              const nextId = e.target.value;
              // eslint-disable-next-line no-console
              console.log('SELECTED TEACHER ID:', nextId);
              setSelectedTeacherId(nextId);
            }}
            disabled={loadingTeachers || teachers.length === 0}>
            <option value="">Seçin</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <div className="weekly-week-nav">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setWeekStartDate((w) => addWeeks(w, -1))}>
            ‹ Önceki hafta
          </button>
          <button
            type="button"
            className={`btn btn--ghost${isCurrentWeek ? ' weekly-week-nav__current' : ''}`}
            onClick={() => setWeekStartDate(weekStartDateMondayLocal())}>
            Bu hafta
          </button>
          <span className="weekly-week-nav__title">{weekTitle(weekStartDate)}</span>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setWeekStartDate((w) => addWeeks(w, 1))}>
            Sonraki hafta ›
          </button>
        </div>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      {loadingTeachers ? (
        <p className="muted">Öğretmenler yükleniyor…</p>
      ) : teachers.length === 0 ? (
        <div className="page-card">
          <p className="muted">Aktif öğretmen bulunamadı.</p>
        </div>
      ) : loadingSchedule ? (
        <p className="muted">Program yükleniyor…</p>
      ) : !selectedTeacherId ? (
        <div className="page-card">
          <p className="muted">Program için öğretmen seçin.</p>
        </div>
      ) : (
        <div className="weekly-grid-scroll">
          <table className="weekly-grid">
            <thead>
              <tr>
                <th className="weekly-grid__corner">Saat</th>
                {WEEKDAY_OPTIONS.map((d) => (
                  <th key={d.day} className="weekly-grid__day-head">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCHEDULE_HOURS.map((hour) => (
                <tr key={hour}>
                  <th className="weekly-grid__hour">{hour}</th>
                  {WEEKDAY_OPTIONS.map((d) => {
                    const cellLessons = gridMap.get(`${d.day}|${hour}`) ?? [];
                    const hasConflict = cellLessons.length > 1;
                    return (
                      <td key={`${d.day}-${hour}`} className="weekly-grid__cell">
                        {cellLessons.length === 0 ? (
                          <span className="weekly-grid__empty">—</span>
                        ) : (
                          <div className="weekly-cell-lessons">
                            {cellLessons.map((lesson, idx) => {
                              const tags = lessonTags(lesson, hasConflict);
                              const isGroup = isGroupLessonType(lesson);
                              const cardType = normalizeLessonType(lesson.lessonType);
                              return (
                                <button
                                  key={`${lesson.id}-${idx}`}
                                  type="button"
                                  className={`schedule-card schedule-card--${cardType}${
                                    lesson.isTemporary ? ' schedule-card--temp' : ''
                                  }${lesson.isMakeup ? ' schedule-card--makeup' : ''}`}
                                  onClick={() =>
                                    setDetail({
                                      lesson,
                                      teacherName: selectedTeacher?.name ?? lesson.teacherName,
                                      hasConflict,
                                    })
                                  }>
                                  <div className="schedule-card__time">
                                    {formatHoursDisplay(normalizeHours(lesson))}
                                  </div>
                                  <div className="schedule-card__branch">{lesson.branch || '—'}</div>
                                  <div className="schedule-card__type">
                                    {getLessonTypeLabel(lesson.lessonType)}
                                    {isGroup ? ` (${lesson.studentIds?.length ?? 0} kişi)` : ''}
                                  </div>
                                  <div className="schedule-card__students">
                                    {(lesson.studentNames || []).join(', ') || '—'}
                                  </div>
                                  <div className="schedule-card__price">
                                    {lesson.pricePerLesson != null
                                      ? `${lesson.pricePerLesson} ₺`
                                      : '—'}
                                  </div>
                                  {tags.length ? (
                                    <div className="schedule-card__tags">
                                      {tags.map((t) => (
                                        <span key={t.key} className={`schedule-tag schedule-tag--${t.key}`}>
                                          {t.label}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setDetail(null)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}>
            <h3>Ders detayı</h3>
            <dl className="summary-dl">
              <div>
                <dt>Öğretmen</dt>
                <dd>{detail.teacherName || '—'}</dd>
              </div>
              <div>
                <dt>Öğrenci(ler)</dt>
                <dd>{(detail.lesson.studentNames || []).join(', ') || '—'}</dd>
              </div>
              <div>
                <dt>Branş</dt>
                <dd>{detail.lesson.branch || '—'}</dd>
              </div>
              <div>
                <dt>Ders tipi</dt>
                <dd>{getLessonTypeLabel(detail.lesson.lessonType)}</dd>
              </div>
              <div>
                <dt>Gün / saat</dt>
                <dd>
                  {dayLabel(detail.lesson.day)} · {formatHoursDisplay(normalizeHours(detail.lesson))}
                </dd>
              </div>
              <div>
                <dt>Ücret</dt>
                <dd>
                  {detail.lesson.pricePerLesson != null
                    ? `${detail.lesson.pricePerLesson} ₺`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Geçici</dt>
                <dd>{detail.lesson.isTemporary || detail.lesson.sourceType === 'override' ? 'Evet' : 'Hayır'}</dd>
              </div>
              <div>
                <dt>Telafi</dt>
                <dd>{detail.lesson.isMakeup || detail.lesson.lessonType === 'makeup' ? 'Evet' : 'Hayır'}</dd>
              </div>
              <div>
                <dt>lessonId</dt>
                <dd>
                  <code className="code-pill">{detail.lesson.baseLessonId ?? detail.lesson.id}</code>
                </dd>
              </div>
              {detail.hasConflict ? (
                <div>
                  <dt>Not</dt>
                  <dd>Bu saatte çakışan birden fazla ders var.</dd>
                </div>
              ) : null}
            </dl>
            <button type="button" className="btn btn--primary" onClick={() => setDetail(null)}>
              Kapat
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
