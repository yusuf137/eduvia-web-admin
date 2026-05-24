import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchVideoLibrary,
  fetchVideoUnlocks,
  filterUnlocksByDateRange,
} from '../../services/videoService';
import { listStudents, isUserActive } from '../../services/userService';

export default function VideoTrackingPage() {
  const { currentUserProfile } = useAuth();
  const institutionId = currentUserProfile?.institutionId ?? '';

  const [unlocks, setUnlocks] = useState([]);
  const [videos, setVideos] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [studentFilter, setStudentFilter] = useState('');
  const [videoFilter, setVideoFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [watchFilter, setWatchFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadAll = useCallback(async () => {
    if (!institutionId) {
      setLoading(false);
      return;
    }
    // eslint-disable-next-line no-console
    console.log('WEB VIDEO PROFILE:', currentUserProfile);
    setLoading(true);
    setError('');
    try {
      const [unlockRows, videoRows, studentRows] = await Promise.all([
        fetchVideoUnlocks(institutionId),
        fetchVideoLibrary(institutionId),
        listStudents(institutionId),
      ]);
      setUnlocks(unlockRows);
      setVideos(videoRows);
      setStudents(studentRows.filter(isUserActive));
    } catch (e) {
      setError(e?.message ?? 'Takip verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [institutionId, currentUserProfile]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const videoMap = useMemo(
    () => new Map(videos.map((v) => [v.id, v])),
    [videos],
  );

  const activeStudentIds = useMemo(
    () => new Set(students.map((s) => s.uid)),
    [students],
  );

  const enrichedRows = useMemo(
    () =>
      unlocks.map((u) => {
        const v = videoMap.get(u.videoId);
        return {
          ...u,
          videoTitle: v?.title ?? '(Video bulunamadı)',
        };
      }),
    [unlocks, videoMap],
  );

  const teacherOptions = useMemo(() => {
    const names = new Set(enrichedRows.map((r) => r.teacherName).filter(Boolean));
    return [...names].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [enrichedRows]);

  const videoOptions = useMemo(() => {
    const ids = new Set(enrichedRows.map((r) => r.videoId).filter(Boolean));
    return videos
      .filter((v) => ids.has(v.id))
      .sort((a, b) => a.title.localeCompare(b.title, 'tr'));
  }, [enrichedRows, videos]);

  const studentOptions = useMemo(() => {
    const fromUnlocks = new Map();
    enrichedRows.forEach((r) => {
      if (r.studentId) {
        fromUnlocks.set(r.studentId, r.studentName);
      }
    });
    students.forEach((s) => {
      if (!fromUnlocks.has(s.uid)) {
        fromUnlocks.set(s.uid, s.name);
      }
    });
    return [...fromUnlocks.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [enrichedRows, students]);

  const filteredRows = useMemo(() => {
    let list = enrichedRows;
    if (studentFilter) {
      list = list.filter((r) => r.studentId === studentFilter);
    }
    if (videoFilter) {
      list = list.filter((r) => r.videoId === videoFilter);
    }
    if (teacherFilter) {
      list = list.filter((r) => r.teacherName === teacherFilter);
    }
    if (watchFilter === 'watched') {
      list = list.filter((r) => r.watched);
    } else if (watchFilter === 'unwatched') {
      list = list.filter((r) => !r.watched);
    }
    list = filterUnlocksByDateRange(list, dateFrom, dateTo);
    return list;
  }, [enrichedRows, studentFilter, videoFilter, teacherFilter, watchFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = filteredRows.length;
    const watched = filteredRows.filter((r) => r.watched).length;
    const unwatched = total - watched;
    const activeStudents = new Set(
      filteredRows
        .map((r) => r.studentId)
        .filter((id) => id && activeStudentIds.has(id)),
    ).size;
    return { total, watched, unwatched, activeStudents };
  }, [filteredRows, activeStudentIds]);

  return (
    <div className="page-stack video-tracking-page">
      <div className="page-toolbar">
        <div>
          <h2 className="page-heading">Video Takip</h2>
          <p className="muted">Öğrenci video açılışları ve izlenme durumu (yalnızca kurumunuz).</p>
        </div>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-card__title">Toplam açılan</span>
          <div className="stat-card__value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <span className="stat-card__title">İzlenen</span>
          <div className="stat-card__value">{stats.watched}</div>
        </div>
        <div className="stat-card">
          <span className="stat-card__title">İzlenmeyen</span>
          <div className="stat-card__value">{stats.unwatched}</div>
        </div>
        <div className="stat-card stat-card--highlight">
          <span className="stat-card__title">Aktif öğrenci</span>
          <div className="stat-card__value">{stats.activeStudents}</div>
        </div>
      </div>

      <div className="page-card video-tracking-filters">
        <div className="video-tracking-filters__grid">
          <label>
            Öğrenci
            <select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)}>
              <option value="">Tümü</option>
              {studentOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Video
            <select value={videoFilter} onChange={(e) => setVideoFilter(e.target.value)}>
              <option value="">Tümü</option>
              {videoOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Öğretmen
            <select value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)}>
              <option value="">Tümü</option>
              {teacherOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            İzlenme
            <select value={watchFilter} onChange={(e) => setWatchFilter(e.target.value)}>
              <option value="all">Tümü</option>
              <option value="watched">İzlendi</option>
              <option value="unwatched">İzlenmedi</option>
            </select>
          </label>
          <label>
            Açılma tarihi (başlangıç)
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label>
            Açılma tarihi (bitiş)
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
        </div>
      </div>

      {loading ? (
        <p className="muted">Kayıtlar yükleniyor…</p>
      ) : filteredRows.length === 0 ? (
        <p className="muted">Filtreye uygun kayıt yok.</p>
      ) : (
        <div className="page-card table-wrap video-tracking-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Öğrenci</th>
                <th>Video</th>
                <th>Öğretmen</th>
                <th>Açılma tarihi</th>
                <th>İzlendi mi</th>
                <th>İzlenme tarihi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.studentName}</td>
                  <td>{row.videoTitle}</td>
                  <td>{row.teacherName}</td>
                  <td>{row.unlockedAtLabel}</td>
                  <td>
                    <span className={`badge ${row.watched ? 'badge--ok' : 'badge--muted'}`}>
                      {row.watched ? 'İzlendi' : 'İzlenmedi'}
                    </span>
                  </td>
                  <td>{row.watched ? row.watchedAtLabel : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
