import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../firebase/firebaseConfig';
import {
  fetchVideoLibrary,
  createVideo,
  updateVideo,
  deactivateVideo,
  softDeleteVideo,
  isVideoDeleted,
  isVideoVisible,
} from '../../services/videoService';
import { formatVideoListMeta } from '../../utils/videoListLabels';

const ACTIVE_FILTERS = [
  { key: 'active', label: 'Aktif' },
  { key: 'passive', label: 'Pasif' },
  { key: 'deleted', label: 'Silinmiş' },
  { key: 'all', label: 'Tümü' },
];

const emptyForm = () => ({
  title: '',
  description: '',
  url: '',
  branch: '',
  songName: '',
  listName: '',
  listDescription: '',
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
  const [activeFilter, setActiveFilter] = useState('active');
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
      return videos.filter((v) => isVideoVisible(v));
    }
    if (activeFilter === 'passive') {
      return videos.filter((v) => !isVideoDeleted(v) && !isVideoVisible(v));
    }
    if (activeFilter === 'deleted') {
      return videos.filter((v) => isVideoDeleted(v));
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
      listName: video.listName,
      listDescription: video.listDescription,
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
            listName: form.listName,
            listDescription: form.listDescription,
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
          listName: form.listName,
          listDescription: form.listDescription,
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

  const onDelete = async (video) => {
    if (
      !window.confirm(
        `"${video.title}" silinecek (soft delete). Geçmiş kilitleme kayıtları korunur. Devam etmek istiyor musunuz?`,
      )
    ) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      await softDeleteVideo(video.id, institutionId, adminUid);
      setSuccess('Video silindi.');
      await loadVideos();
    } catch (err) {
      setError(err?.message ?? 'Video silinemedi.');
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
                <span
                  className={`badge ${
                    isVideoVisible(v) ? 'badge--ok' : isVideoDeleted(v) ? 'badge--danger' : 'badge--muted'
                  }`}>
                  {isVideoDeleted(v) ? 'Silinmiş' : isVideoVisible(v) ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              <p className="video-card__meta">{formatVideoListMeta(v)}</p>
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
                {!isVideoDeleted(v) ? (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(v)}>
                    Düzenle
                  </button>
                ) : null}
                {!isVideoDeleted(v) && isVideoVisible(v) ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => void onDeactivate(v)}>
                    Pasif Et
                  </button>
                ) : null}
                {!isVideoDeleted(v) ? (
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={() => void onDelete(v)}>
                    Sil
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
              Liste Adı *
              <input
                value={form.listName}
                onChange={(e) => setForm((f) => ({ ...f, listName: e.target.value }))}
                placeholder="Örn. Başlangıç Egzersizleri"
                required
              />
            </label>
            <label>
              Liste Açıklaması
              <textarea
                rows={2}
                value={form.listDescription}
                onChange={(e) => setForm((f) => ({ ...f, listDescription: e.target.value }))}
              />
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
