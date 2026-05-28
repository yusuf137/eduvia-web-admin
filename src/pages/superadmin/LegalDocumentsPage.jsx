import { useCallback, useEffect, useState } from 'react';
import { auth } from '../../firebase/firebaseConfig';
import { LEGAL_DOCUMENTS } from '../../constants/legalDocuments';
import { fetchLegalDocument, saveLegalDocument } from '../../services/legalDocumentService';
import { formatLegalUpdatedAt } from '../../utils/legalContentFormat';
import { validateLegalDocumentPayload } from '../../utils/legalContentSanitize';

export default function LegalDocumentsPage() {
  const [activeId, setActiveId] = useState(LEGAL_DOCUMENTS[0].id);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const activeMeta = LEGAL_DOCUMENTS.find((d) => d.id === activeId) ?? LEGAL_DOCUMENTS[0];

  const loadDocument = useCallback(async (documentId) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const row = await fetchLegalDocument(documentId);
      const meta = LEGAL_DOCUMENTS.find((d) => d.id === documentId);
      setTitle(row?.title?.trim() || meta?.defaultTitle || '');
      setContent(row?.content ?? '');
      setUpdatedAt(row?.updatedAt ?? null);
    } catch (e) {
      setError(e?.message ?? 'Metin yüklenemedi.');
      setTitle(activeMeta.defaultTitle);
      setContent('');
      setUpdatedAt(null);
    } finally {
      setLoading(false);
    }
  }, [activeMeta.defaultTitle]);

  useEffect(() => {
    void loadDocument(activeId);
  }, [activeId, loadDocument]);

  const onSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      validateLegalDocumentPayload({ title, content });
    } catch (validationErr) {
      setError(validationErr?.message ?? 'Başlık ve içerik zorunludur.');
      return;
    }

    setSaving(true);
    try {
      const uid = auth.currentUser?.uid ?? '';
      const saved = await saveLegalDocument(activeId, { title, content }, uid);
      setUpdatedAt(saved?.updatedAt ?? null);
      setSuccess('Yasal metin kaydedildi.');
    } catch (err) {
      setError(err?.message ?? 'Kayıt başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const updatedLabel = formatLegalUpdatedAt(updatedAt);

  return (
    <div className="page-stack legal-admin">
      <div className="page-toolbar">
        <div>
          <h2 className="page-heading">Yasal Metinler</h2>
          <p className="muted">
            Mağaza ve kayıt ekranlarında yayınlanan sözleşme metinleri (düz metin, HTML yok). Sabit
            URL:{' '}
            <code className="code-pill">
              eduviaapp.com{activeMeta.path}
            </code>
          </p>
        </div>
      </div>

      <div className="filter-bar legal-admin__tabs">
        {LEGAL_DOCUMENTS.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`filter-bar__btn${activeId === d.id ? ' filter-bar__btn--active' : ''}`}
            onClick={() => setActiveId(d.id)}>
            {d.label}
          </button>
        ))}
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}
      {success ? <div className="alert alert--success">{success}</div> : null}

      <form className="page-card form-grid legal-admin__form" onSubmit={onSave}>
        <p className="muted legal-admin__hint">{activeMeta.hint}</p>

        <label>
          Başlık
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={loading || saving}
          />
        </label>

        <label>
          İçerik
          <textarea
            className="legal-admin__textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={22}
            required
            disabled={loading || saving}
            placeholder={
              'Paragraflar için boş satır bırakın.\n\n# Ana başlık\n## Alt başlık\n\n- Madde 1\n- Madde 2'
            }
          />
        </label>

        <p className="muted legal-admin__format-hint">
          Biçimlendirme: paragraflar arasında boş satır; <code># Başlık</code>, <code>## Alt başlık</code>;{' '}
          <code>- madde</code> ile liste.
        </p>

        {updatedLabel ? (
          <p className="muted">
            Son kayıt: <strong>{updatedLabel}</strong>
          </p>
        ) : (
          <p className="muted">Henüz kayıtlı sürüm yok.</p>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={loading || saving}>
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={loading || saving}
            onClick={() => void loadDocument(activeId)}>
            Yenile
          </button>
        </div>
      </form>
    </div>
  );
}
