import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../firebase/firebaseConfig';
import {
  fetchAllBranches,
  createBranch,
  updateBranch,
  deactivateBranch,
} from '../../services/branchService';

const ACTIVE_FILTERS = [
  { key: 'all', label: 'Tümü' },
  { key: 'active', label: 'Aktif' },
  { key: 'passive', label: 'Pasif' },
];

const DEFAULT_LEVELS = ['Başlangıç', 'Orta', 'İleri'];

const emptyForm = () => ({
  name: '',
  levels: [...DEFAULT_LEVELS],
  levelInput: '',
});

export default function BranchManagementPage() {
  const { currentUserProfile } = useAuth();
  const institutionId = currentUserProfile?.institutionId ?? '';
  const adminUid = auth.currentUser?.uid ?? '';
  const adminName = currentUserProfile?.name ?? '';

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadBranches = useCallback(async () => {
    if (!institutionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows = await fetchAllBranches(institutionId);
      setBranches(rows);
    } catch (e) {
      setError(e?.message ?? 'Branşlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  const displayBranches = useMemo(() => {
    if (activeFilter === 'active') {
      return branches.filter((b) => b.isActive);
    }
    if (activeFilter === 'passive') {
      return branches.filter((b) => !b.isActive);
    }
    return branches;
  }, [branches, activeFilter]);

  const openCreate = () => {
    setEditingId('');
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (branch) => {
    setEditingId(branch.id);
    setForm({
      name: branch.name,
      levels: [...(branch.levels?.length ? branch.levels : DEFAULT_LEVELS)],
      levelInput: '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId('');
    setForm(emptyForm());
  };

  const addLevel = () => {
    const v = form.levelInput.trim();
    if (!v) return;
    if (form.levels.includes(v)) {
      setError('Bu seviye zaten listede.');
      return;
    }
    setForm((f) => ({ ...f, levels: [...f.levels, v], levelInput: '' }));
    setError('');
  };

  const removeLevel = (level) => {
    setForm((f) => ({ ...f, levels: f.levels.filter((l) => l !== level) }));
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!institutionId) {
      setError('Kurum bilgisi bulunamadı.');
      return;
    }
    if (!form.levels.length) {
      setError('En az bir seviye ekleyin.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (editingId) {
        await updateBranch(
          editingId,
          { name: form.name, levels: form.levels, isActive: true },
          institutionId,
        );
        setSuccess('Branş güncellendi.');
      } else {
        await createBranch({
          institutionId,
          name: form.name,
          levels: form.levels,
          createdBy: adminUid,
          createdByName: adminName,
        });
        setSuccess('Branş eklendi.');
      }
      closeModal();
      await loadBranches();
    } catch (err) {
      setError(err?.message ?? 'Kayıt başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const onDeactivate = async (branch) => {
    if (!window.confirm(`"${branch.name}" pasif edilsin mi?`)) return;
    setError('');
    setSuccess('');
    try {
      await deactivateBranch(branch.id, institutionId);
      setSuccess('Branş pasif edildi.');
      await loadBranches();
    } catch (err) {
      setError(err?.message ?? 'Pasif edilemedi.');
    }
  };

  return (
    <div className="page-stack branch-page">
      <div className="page-toolbar">
        <div>
          <h2 className="page-heading">Branş Yönetimi</h2>
          <p className="muted">Kurumunuza ait branşlar ve seviyeler.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          Branş Ekle
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
        <p className="muted">Branşlar yükleniyor…</p>
      ) : displayBranches.length === 0 ? (
        <p className="muted">Bu filtrede branş yok.</p>
      ) : (
        <div className="branch-grid">
          {displayBranches.map((b) => (
            <article key={b.id} className="branch-card">
              <div className="branch-card__head">
                <h3>{b.name}</h3>
                <span className={`badge ${b.isActive ? 'badge--ok' : 'badge--muted'}`}>
                  {b.isActive ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              <ul className="branch-card__levels">
                {(b.levels?.length ? b.levels : ['—']).map((lv) => (
                  <li key={lv}>{lv}</li>
                ))}
              </ul>
              <p className="muted branch-card__meta">{b.createdAtLabel}</p>
              <div className="branch-card__actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => openEdit(b)}>
                  Düzenle
                </button>
                {b.isActive ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => void onDeactivate(b)}>
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
            className="modal-card branch-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            onSubmit={onSave}>
            <h3>{editingId ? 'Branş Düzenle' : 'Branş Ekle'}</h3>
            <label>
              Branş adı *
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Bateri"
                required
              />
            </label>
            <div className="branch-levels-editor">
              <span className="branch-levels-editor__label">Seviyeler</span>
              <div className="branch-levels-editor__row">
                <input
                  value={form.levelInput}
                  onChange={(e) => setForm((f) => ({ ...f, levelInput: e.target.value }))}
                  placeholder="Yeni seviye"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLevel();
                    }
                  }}
                />
                <button type="button" className="btn btn--ghost" onClick={addLevel}>
                  Ekle
                </button>
              </div>
              <ul className="branch-levels-editor__list">
                {form.levels.map((lv) => (
                  <li key={lv}>
                    <span>{lv}</span>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeLevel(lv)}>
                      Sil
                    </button>
                  </li>
                ))}
              </ul>
            </div>
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
