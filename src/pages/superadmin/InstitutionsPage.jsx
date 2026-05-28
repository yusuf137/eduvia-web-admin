import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import InstitutionEditModulesModal from '../../components/superadmin/InstitutionEditModulesModal';
import { formatModulesSummary } from '../../constants/institutionModules';
import {
  getPlanDisplayLabel,
  isCustomModuleOverride,
  resolveInstitutionPlan,
} from '../../config/packagePresets';
import { listInstitutions } from '../../services/institutionService';
import { getInstitutionPanelHost, getInstitutionPanelUrl } from '../../utils/subdomain';

function formatDate(ts) {
  if (!ts?.toDate) {
    return '—';
  }
  return ts.toDate().toLocaleString('tr-TR');
}

function SubdomainRow({ slug }) {
  const [copied, setCopied] = useState(false);
  const host = getInstitutionPanelHost(slug);
  const url = getInstitutionPanelUrl(slug);

  if (!host) {
    return <dd>—</dd>;
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url || `https://${host}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Panel adresini kopyalayın:', url || `https://${host}`);
    }
  };

  return (
    <dd className="subdomain-row">
      <span>{host}</span>
      <button type="button" className="btn btn--ghost btn--xs" onClick={() => void onCopy()}>
        {copied ? 'Kopyalandı' : 'Kopyala'}
      </button>
    </dd>
  );
}

export default function InstitutionsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editInstitution, setEditInstitution] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return listInstitutions()
      .then((list) => setRows(list))
      .catch((e) => setError(e?.message ?? 'Kurumlar yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <h2 className="page-heading">Kurumlar</h2>
        <Link to="/superadmin/institutions/create" className="btn btn--primary">
          + Kurum Oluştur
        </Link>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      {loading ? (
        <div className="page-card">
          <p className="muted">Kurumlar yükleniyor…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="page-card">
          <p className="muted">Henüz kurum yok.</p>
          <Link to="/superadmin/institutions/create" className="btn btn--primary" style={{ marginTop: 12 }}>
            İlk kurumu oluştur
          </Link>
        </div>
      ) : (
        <div className="data-grid">
          {rows.map((item) => {
            const { plan } = resolveInstitutionPlan(item);
            const planLabel = getPlanDisplayLabel(item);
            const customized = isCustomModuleOverride(plan, item.modules);
            return (
            <article key={item.id} className="data-card">
              <div className="data-card__head">
                <h3>{item.name || '—'}</h3>
                <div className="data-card__badges">
                  <span className={`badge ${item.isActive ? 'badge--ok' : 'badge--muted'}`}>
                    {item.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                  {customized ? <span className="badge badge--accent">Özelleştirilmiş</span> : null}
                </div>
              </div>
              <dl className="data-card__meta">
                <div>
                  <dt>Subdomain</dt>
                  <SubdomainRow slug={item.slug} />
                </div>
                <div>
                  <dt>Slug</dt>
                  <dd>{item.slug || '—'}</dd>
                </div>
                <div>
                  <dt>Telefon</dt>
                  <dd>{item.phone || '—'}</dd>
                </div>
                <div>
                  <dt>E-posta</dt>
                  <dd>{item.email || '—'}</dd>
                </div>
                <div>
                  <dt>Şehir</dt>
                  <dd>{item.city || '—'}</dd>
                </div>
                <div>
                  <dt>Paket</dt>
                  <dd>{planLabel}</dd>
                </div>
                <div>
                  <dt>Modüller</dt>
                  <dd>{formatModulesSummary(item.modules)}</dd>
                </div>
                <div>
                  <dt>Oluşturulma</dt>
                  <dd>{formatDate(item.createdAt)}</dd>
                </div>
              </dl>
              <div className="data-card__actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setEditInstitution(item)}>
                  Paket ve Özellikleri Düzenle
                </button>
              </div>
            </article>
          );
          })}
        </div>
      )}

      <InstitutionEditModulesModal
        institution={editInstitution}
        open={Boolean(editInstitution)}
        onClose={() => setEditInstitution(null)}
        onSaved={() => void load()}
      />
    </div>
  );
}
