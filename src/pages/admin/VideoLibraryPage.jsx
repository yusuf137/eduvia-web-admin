import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../firebase/firebaseConfig';
import {
  VIDEO_LEVELS,
  fetchVideoLibrary,
  createVideo,
  updateVideo,
  deactivateVideo,
} from '../../services/videoService';

const ACTIVE_FILTERS = [
  { key: 'all', label: 'Tümü' },
  { key: 'active', label: 'Aktif' },
  { key: 'passive', label: 'Pasif' },
];

const emptyForm = () => ({
  title: '',
  description: '',
  url: '',
  branch: '',
  songName: '',
  level: 1,
});

export default function VideoLibraryPage() {
  const { currentUserProfile } = useAuth();
  const institutionId = currentUserProfile?.institutionId ?? '';
  const adminUid = auth.currentUser?.uid ?? '';
  const adminName = currentUserProfile?.name ?? '';

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadVideos = useCallback(async () => {
    if (!institutionId) {
      setLoading(false);
      return;
    }
    // eslint-disable-next-line no-console
    console.log('WEB VIDEO PROFILE:', currentUserProfile);
    setLoading(true);
    setError('');
    try {
      const rows = await fetchVideoLibrary(institutionId);
      setVideos(rows);
    } catch (e) {
      setError(e?.message ?? 'Videolar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [institutionId, currentUserProfile]);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  const displayVideos = useMemo(() => {
    if (activeFilter === 'active') {
      return videos.filter((v) => v.isActive);
    }
    if (activeFilter === 'passive') {
      return videos.filter((v) => !v.isActive);
    }
    return videos;
  }, [videos, activeFilter]);

  const openCreate = () => {
    setEditingId('');
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (video) => {
    setEditingId(video.id);
    setForm({
      title: video.title,
      description: video.description,
      url: video.url,
      branch: video.branch,
      songName: video.songName,
      level: video.level,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId('');
    setForm(emptyForm());
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!institutionId) {
      setError('Kurum bilgisi bulunamadı.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (editingId) {
        await updateVideo(
          editingId,
          {
            title: form.title,
            description: form.description,
            url: form.url,
            branch: form.branch,
            level: form.level,
            songName: form.songName,
            isActive: true,
          },
          institutionId,
        );
        setSuccess('Video güncellendi.');
      } else {
        await createVideo({
          title: form.title,
          description: form.description,
          url: form.url,
          branch: form.branch,
          level: form.level,
          songName: form.songName,
          institutionId,
          createdBy: adminUid,
          createdByName: adminName,
        });
        setSuccess('Video eklendi.');
      }
      closeModal();
      await loadVideos();
    } catch (err) {
      setError(err?.message ?? 'Kayıt başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const onDeactivate = async (video) => {
    if (!window.confirm(`"${video.title}" pasif edilsin mi?`)) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await deactivateVideo(video.id, institutionId);
      setSuccess('Video pasif edildi.');
      await loadVideos();
    } catch (err) {
      setError(err?.message ?? 'Pasif edilemedi.');
    }
  };

  return (
    <div className="page-stack video-library-page">
      <div className="page-toolbar">
        <div>
          <h2 className="page-heading">Video Havuzu</h2>
          <p className="muted">Kurumunuza ait eğitim videolarını yönetin.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          Video Ekle
        </button>
      </div>

      <div className="filter-bar">
        {ACTIVE_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`filter-bar__btn${activeFilter === f.key ? ' filter-bar__btn--active' : ''}`}
            onClick={() => setActiveFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}
      {success ? <div className="alert alert--success">{success}</div> : null}

      {loading ? (
        <p className="muted">Videolar yükleniyor…</p>
      ) : displayVideos.length === 0 ? (
        <p className="muted">Bu filtrede video yok.</p>
      ) : (
        <div className="video-grid">
          {displayVideos.map((v) => (
            <article key={v.id} className="video-card">
              <div className="video-card__head">
                <h3 className="video-card__title">{v.title}</h3>
                <span className={`badge ${v.isActive ? 'badge--ok' : 'badge--muted'}`}>
                  {v.isActive ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              <p className="video-card__meta">
                {v.branch || '—'} · Kademe {v.level}
                {v.songName ? ` · ${v.songName}` : ''}
              </p>
              {v.description ? <p className="video-card__desc">{v.description}</p> : null}
              <p className="muted video-card__date">{v.createdAtLabel}</p>
              <div className="video-card__actions">
                {v.url ? (
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--ghost btn--sm">
                    Link Aç
                  </a>
                ) : null}
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(v)}>
                  Düzenle
                </button>
                {v.isActive ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => void onDeactivate(v)}>
                    Pasif Et
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {modalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <form
            className="modal-card video-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            onSubmit={onSave}>
            <h3>{editingId ? 'Video Düzenle' : 'Video Ekle'}</h3>
            <label>
              Başlık *
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </label>
            <label>
              Açıklama
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>
            <label>
              URL (YouTube / link)
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              />
            </label>
            <label>
              Branş
              <input
                value={form.branch}
                onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
                placeholder="bateri, gitar, piyano…"
              />
            </label>
            <label>
              Şarkı adı
              <input
                value={form.songName}
                onChange={(e) => setForm((f) => ({ ...f, songName: e.target.value }))}
              />
            </label>
            <label>
              Kademe
              <select
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: Number(e.target.value) }))}>
                {VIDEO_LEVELS.map((lv) => (
                  <option key={lv} value={lv}>
                    Kademe {lv}
                  </option>
                ))}
              </select>
            </label>
            <div className="modal-card__actions">
              <button type="button" className="btn btn--ghost" onClick={closeModal}>
                İptal
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Kaydediliyor…' : editingId ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
