import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscriptionActionGuard } from '../../contexts/SubscriptionActionGuardContext';
import { listBranches } from '../../services/branchService';
import {
  getLessonTypeLabel,
  resolveLessonTypeFromStudentCount,
  WEEKDAY_OPTIONS,
  DURATION_HOUR_OPTIONS,
  startHourOptionsForDuration,
  buildHoursFromStart,
  createLessonForAdmin,
} from '../../services/lessonService';
import {
  listActiveStudentsForLessons,
  listActiveTeachersForLessons,
} from '../../services/userService';

const FALLBACK_BRANCHES = ['Piyano', 'Gitar', 'Keman', 'Flüt', 'Şan', 'Solfej', 'Müzik teorisi', 'Diğer'];

export default function LessonCreatePage() {
  const { currentUserProfile } = useAuth();
  const { ensureAllowed, resolveActionError } = useSubscriptionActionGuard();
  const institutionId = currentUserProfile?.institutionId ?? '';

  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [teacherId, setTeacherId] = useState('');
  const [branchMode, setBranchMode] = useState('list');
  const [branchName, setBranchName] = useState('');
  const [branchManual, setBranchManual] = useState('');
  const [day, setDay] = useState('');
  const [startHour, setStartHour] = useState('');
  const [durationHours, setDurationHours] = useState(1);
  const [price, setPrice] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  useEffect(() => {
    if (!institutionId) {
      setLoadingMeta(false);
      return () => {};
    }
    let cancelled = false;
    setLoadingMeta(true);
    setError('');
    Promise.all([
      listActiveTeachersForLessons(institutionId),
      listActiveStudentsForLessons(institutionId),
      listBranches(institutionId).catch(() => []),
    ])
      .then(([tList, sList, bList]) => {
        if (!cancelled) {
          setTeachers(tList);
          setStudents(sList);
          setBranches(bList);
          if (bList.length > 0) {
            setBranchMode('list');
            setBranchName(bList[0].name);
          } else {
            setBranchMode('manual');
          }
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message ?? 'Form verileri yüklenemedi.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingMeta(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [institutionId]);

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === teacherId) ?? null,
    [teachers, teacherId],
  );

  const allowedDays = useMemo(() => {
    if (!selectedTeacher) {
      return [];
    }
    const days = selectedTeacher.availableDays?.length
      ? selectedTeacher.availableDays
      : [1, 2, 3, 4, 5, 6, 7];
    return WEEKDAY_OPTIONS.filter((w) => days.includes(w.day));
  }, [selectedTeacher]);

  const hourOptions = useMemo(
    () => startHourOptionsForDuration(durationHours),
    [durationHours],
  );

  const previewHours = useMemo(() => {
    if (!startHour) {
      return [];
    }
    return buildHoursFromStart(startHour, durationHours);
  }, [startHour, durationHours]);

  const branchValue = branchMode === 'manual' ? branchManual.trim() : branchName;

  const selectedStudents = useMemo(
    () => students.filter((s) => selectedStudentIds.includes(s.id)),
    [students, selectedStudentIds],
  );

  const autoLessonTypeLabel = useMemo(() => {
    if (selectedStudentIds.length < 1) {
      return '—';
    }
    try {
      const lt = resolveLessonTypeFromStudentCount(selectedStudentIds.length);
      return getLessonTypeLabel(lt);
    } catch {
      return '—';
    }
  }, [selectedStudentIds.length]);

  const toggleStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  useEffect(() => {
    if (startHour && !hourOptions.includes(startHour)) {
      setStartHour('');
    }
  }, [hourOptions, startHour]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedTeacher) {
      setError('Öğretmen seçin.');
      return;
    }
    if (!branchValue) {
      setError('Branş girin.');
      return;
    }
    if (!day || !startHour) {
      setError('Gün ve saat seçin.');
      return;
    }
    if (selectedStudentIds.length < 1) {
      setError('Lütfen en az bir öğrenci seçin.');
      return;
    }
    if (!ensureAllowed()) {
      return;
    }

    setSaving(true);
    try {
      const result = await createLessonForAdmin({
        currentUserProfile,
        teacher: selectedTeacher,
        students: selectedStudents,
        branch: branchValue,
        day: Number(day),
        startHour,
        durationHours,
        pricePerLesson: Number(String(price).replace(',', '.')),
      });
      setSuccess(`Ders oluşturuldu (${getLessonTypeLabel(result.lessonType)}).`);
      setSelectedStudentIds([]);
      setStartHour('');
      setPrice('');
    } catch (err) {
      const msg = resolveActionError(err, 'Ders oluşturulamadı.');
      if (msg) setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const dayLabel = WEEKDAY_OPTIONS.find((w) => String(w.day) === String(day))?.label ?? '—';

  return (
    <div className="page-stack">
      <h2 className="page-heading">Ders Oluştur</h2>

      {error ? <div className="alert alert--error">{error}</div> : null}
      {success ? <div className="alert alert--success">{success}</div> : null}

      {loadingMeta ? (
        <p className="muted">Form verileri yükleniyor…</p>
      ) : (
        <div className="lesson-create-layout">
          <form className="page-card lesson-create-form" onSubmit={onSubmit}>
            <label>
              Öğretmen *
              <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} required>
                <option value="">Seçin</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.role === 'adminTeacher' ? '(Admin Öğretmen)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <p className="field-hint lesson-type-hint">
              Seçilen öğrenci sayısına göre ders tipi: <strong>{autoLessonTypeLabel}</strong>
            </p>

            <label>
              Branş *
              {branches.length > 0 ? (
                <select
                  value={branchMode === 'list' ? branchName : '__manual__'}
                  onChange={(e) => {
                    if (e.target.value === '__manual__') {
                      setBranchMode('manual');
                    } else {
                      setBranchMode('list');
                      setBranchName(e.target.value);
                    }
                  }}>
                  {branches.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                  <option value="__manual__">Manuel gir…</option>
                </select>
              ) : (
                <input
                  value={branchManual}
                  onChange={(e) => {
                    setBranchMode('manual');
                    setBranchManual(e.target.value);
                  }}
                  placeholder="Branş adı"
                  list="branch-suggestions"
                  required
                />
              )}
              {branches.length > 0 && branchMode === 'manual' ? (
                <input
                  value={branchManual}
                  onChange={(e) => setBranchManual(e.target.value)}
                  placeholder="Manuel branş"
                  style={{ marginTop: 8 }}
                />
              ) : null}
              <datalist id="branch-suggestions">
                {(branches.length ? branches.map((b) => b.name) : FALLBACK_BRANCHES).map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </label>

            <label>
              Gün *
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                required
                disabled={!teacherId}>
                <option value="">Seçin</option>
                {allowedDays.map((w) => (
                  <option key={w.day} value={w.day}>
                    {w.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Süre (saat) *
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                required>
                {DURATION_HOUR_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} saat
                  </option>
                ))}
              </select>
            </label>

            <label>
              Başlangıç saati *
              <select value={startHour} onChange={(e) => setStartHour(e.target.value)} required>
                <option value="">Seçin</option>
                {hourOptions.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Saatlik ücret (₺) *
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </label>

            <div className="form-fieldset">
              <div className="form-fieldset__head">
                <span>Öğrenciler * ({selectedStudentIds.length} seçili)</span>
              </div>
              {students.length === 0 ? (
                <p className="muted">Aktif öğrenci yok.</p>
              ) : (
                <div className="student-pick-list">
                  {students.map((s) => {
                    const checked = selectedStudentIds.includes(s.id);
                    return (
                      <label key={s.id} className="student-pick-item">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStudent(s.id)}
                        />
                        <span>
                          {s.name}
                          {s.email ? ` · ${s.email}` : ''}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Oluşturuluyor…' : 'Dersi Oluştur'}
            </button>
          </form>

          <aside className="page-card lesson-create-summary">
            <h3>Ders özeti</h3>
            <dl className="summary-dl">
              <div>
                <dt>Öğretmen</dt>
                <dd>{selectedTeacher?.name ?? '—'}</dd>
              </div>
              <div>
                <dt>Öğrenciler ({selectedStudents.length})</dt>
                <dd>
                  {selectedStudents.length
                    ? selectedStudents.map((s) => s.name).join(', ')
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Ders tipi</dt>
                <dd>{autoLessonTypeLabel}</dd>
              </div>
              <div>
                <dt>Branş</dt>
                <dd>{branchValue || '—'}</dd>
              </div>
              <div>
                <dt>Gün</dt>
                <dd>{dayLabel}</dd>
              </div>
              <div>
                <dt>Saatler</dt>
                <dd>{previewHours.length ? previewHours.join(' · ') : '—'}</dd>
              </div>
              <div>
                <dt>Ücret</dt>
                <dd>{price !== '' ? `${price} ₺` : '—'}</dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
    </div>
  );
}
