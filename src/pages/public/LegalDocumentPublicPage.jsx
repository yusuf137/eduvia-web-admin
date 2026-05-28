import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import EduviaLogo from '../../components/EduviaLogo';
import {
  getLegalDocumentById,
  getLegalDocumentByPath,
  LEGAL_DOCUMENTS,
  normalizePublicPath,
} from '../../constants/legalDocuments';
import { fetchLegalDocument } from '../../services/legalDocumentService';
import { formatLegalUpdatedAt, renderLegalContent } from '../../utils/legalContentFormat';

/** @typedef {'loading' | 'error' | 'unpublished' | 'ready'} ContentState */

function LegalPublicShell({ children }) {
  return (
    <div className="legal-public">
      <header className="legal-public__header">
        <Link to="/login" className="legal-public__brand-link" aria-label="Eduvia ana sayfa">
          <EduviaLogo variant="login" />
        </Link>
      </header>
      <main className="legal-public__main">{children}</main>
    </div>
  );
}

function LegalStateMessage({ variant, title, children }) {
  return (
    <div className={`legal-public__state legal-public__state--${variant}`} role="status">
      {title ? <p className="legal-public__state-title">{title}</p> : null}
      {children}
    </div>
  );
}

/**
 * @param {{ documentId?: string }} props — Route'tan gelen sabit Firestore doc id
 */
export default function LegalDocumentPublicPage({ documentId }) {
  const { pathname } = useLocation();
  const meta = useMemo(() => {
    if (documentId) {
      return getLegalDocumentById(documentId);
    }
    return getLegalDocumentByPath(pathname);
  }, [documentId, pathname]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    if (!meta) {
      setLoading(false);
      setError('');
      setDoc(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    setDoc(null);

    void fetchLegalDocument(meta.id)
      .then((row) => {
        if (!cancelled) {
          setDoc(row);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message ?? 'Metin yüklenemedi. Lütfen daha sonra tekrar deneyin.');
          setDoc(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [meta]);

  useEffect(() => {
    if (meta) {
      document.title = `${meta.defaultTitle} | Eduvia`;
    }
  }, [meta]);

  if (!meta) {
    return (
      <LegalPublicShell>
        <div className="legal-public__card">
          <LegalStateMessage variant="not-found" title="Sayfa bulunamadı">
            <p className="legal-public__empty">
              Aradığınız yasal metin sayfası mevcut değil. Aşağıdaki bağlantılardan devam edebilirsiniz.
            </p>
          </LegalStateMessage>
        </div>
        <LegalNavLinks pathname={normalizePublicPath(pathname)} />
      </LegalPublicShell>
    );
  }

  const pageTitle = doc?.title?.trim() || meta.defaultTitle;
  const hasContent = Boolean(doc?.content?.trim());
  const updatedLabel = formatLegalUpdatedAt(doc?.updatedAt);

  /** @type {ContentState | null} */
  let contentState = null;
  if (loading) {
    contentState = 'loading';
  } else if (error) {
    contentState = 'error';
  } else if (!hasContent) {
    contentState = 'unpublished';
  } else {
    contentState = 'ready';
  }

  return (
    <LegalPublicShell>
      <div className="legal-public__card">
        <h1 className="legal-public__title">{pageTitle}</h1>
        {updatedLabel && contentState === 'ready' ? (
          <p className="legal-public__updated">Son güncelleme: {updatedLabel}</p>
        ) : null}

        {contentState === 'loading' ? (
          <LegalStateMessage variant="loading" title="Yükleniyor…">
            <p className="legal-public__muted">Metin getiriliyor, lütfen bekleyin.</p>
          </LegalStateMessage>
        ) : null}

        {contentState === 'error' ? (
          <LegalStateMessage variant="error" title="Yükleme hatası">
            <p className="legal-public__empty">{error}</p>
          </LegalStateMessage>
        ) : null}

        {contentState === 'unpublished' ? (
          <LegalStateMessage variant="unpublished" title="Henüz yayınlanmadı">
            <p className="legal-public__empty">Bu metin henüz yayınlanmamıştır.</p>
          </LegalStateMessage>
        ) : null}

        {contentState === 'ready' ? (
          <div className="legal-content">{renderLegalContent(doc.content)}</div>
        ) : null}
      </div>

      <LegalNavLinks pathname={normalizePublicPath(pathname)} />
    </LegalPublicShell>
  );
}

function LegalNavLinks({ pathname }) {
  const links = LEGAL_DOCUMENTS.filter((d) => d.path !== pathname);
  if (links.length === 0) {
    return null;
  }
  return (
    <nav className="legal-public__nav" aria-label="Diğer yasal metinler">
      {links.map((d) => (
        <Link key={d.id} to={d.path} className="legal-public__nav-link">
          {d.label}
        </Link>
      ))}
    </nav>
  );
}
