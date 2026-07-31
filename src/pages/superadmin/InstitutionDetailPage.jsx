import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import InstitutionNotesCard from '../../components/superadmin/institution/InstitutionNotesCard';
import InstitutionSubscriptionCard from '../../components/superadmin/institution/InstitutionSubscriptionCard';
import InstitutionActivitiesTab from '../../components/superadmin/audit/InstitutionActivitiesTab';
import InstitutionActivityTimeline from '../../components/superadmin/audit/InstitutionActivityTimeline';
import { usePackages } from '../../contexts/PackageCatalogContext';
import { getPlanDisplayLabel, resolvePackageForInstitution } from '../../utils/packageResolver';
import { listInstitutionAuditLogs } from '../../services/auditLogService';
import { fetchInstitutionById } from '../../services/institutionService';
import { listInstitutionNotes } from '../../services/institutionNoteService';
import { ensureSubscriptionForInstitution } from '../../services/subscriptionService';
import { resolveSubscription } from '../../utils/subscriptionHelpers';
import { getInstitutionPanelHost } from '../../utils/subdomain';

const TABS = [
  { id: 'overview', label: 'Genel' },
  { id: 'activities', label: 'Son Aktiviteler' },
  { id: 'timeline', label: 'Aktivite Zaman Çizelgesi' },
];

export default function InstitutionDetailPage() {
  const { packages } = usePackages();
  const { institutionId } = useParams();
  const [institution, setInstitution] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [notes, setNotes] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [error, setError] = useState('');

  const loadNotes = useCallback(async () => {
    if (!institutionId) return;
    setNotesLoading(true);
    try {
      const rows = await listInstitutionNotes(institutionId);
      setNotes(rows);
    } catch (e) {
      setError(e?.message ?? 'Notlar yüklenemedi.');
    } finally {
      setNotesLoading(false);
    }
  }, [institutionId]);

  const loadActivities = useCallback(async () => {
    if (!institutionId) return;
    setActivitiesLoading(true);
    try {
      const rows = await listInstitutionAuditLogs(institutionId, 20);
      setActivities(rows);
    } catch (e) {
      setError(e?.message ?? 'Aktiviteler yüklenemedi.');
    } finally {
      setActivitiesLoading(false);
    }
  }, [institutionId]);

  const load = useCallback(async () => {
    if (!institutionId) return;
    setLoading(true);
    setError('');
    try {
      const inst = await fetchInstitutionById(institutionId);
      if (!inst) {
        setError('Kurum bulunamadı.');
        setInstitution(null);
        setSubscription(null);
        return;
      }
      setInstitution(inst);
      await ensureSubscriptionForInstitution(inst);
      const refreshed = await fetchInstitutionById(institutionId);
      setInstitution(refreshed);
      setSubscription(resolveSubscription(refreshed));
    } catch (e) {
      setError(e?.message ?? 'Kurum detayı yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void load();
    void loadNotes();
  }, [load, loadNotes]);

  useEffect(() => {
    if (activeTab === 'activities') {
      void loadActivities();
    }
  }, [activeTab, loadActivities]);

  const resolvedPackage = useMemo(
    () => (institution ? resolvePackageForInstitution(institution, packages) : null),
    [institution, packages],
  );

  const panelHost = useMemo(
    () => (institution ? getInstitutionPanelHost(institution.slug) : ''),
    [institution],
  );

  if (loading) {
    return (
      <div className="page-stack">
        <p className="muted">Kurum detayı yükleniyor…</p>
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="page-stack">
        <div className="alert alert--error">{error || 'Kurum bulunamadı.'}</div>
        <Link to="/superadmin/institutions" className="btn btn--ghost">
          ← Kurumlara dön
        </Link>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <Link to="/superadmin/institutions" className="muted institution-detail__back">
            ← Kurumlara dön
          </Link>
          <h2 className="page-heading">{institution.name}</h2>
          <p className="muted">{panelHost || institution.slug}</p>
        </div>
        <Link to="/superadmin/subscriptions" className="btn btn--ghost">
          Abonelikler
        </Link>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="filter-bar institution-detail-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`filter-bar__btn${activeTab === tab.id ? ' filter-bar__btn--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <>
          <div className="institution-detail-grid">
            <section className="page-card">
              <h3 className="page-heading institution-detail__section-title">Kurum Bilgileri</h3>
              <dl className="subscription-detail-grid">
                <div>
                  <dt>Kurum Adı</dt>
                  <dd>{institution.name}</dd>
                </div>
                <div>
                  <dt>Plan (Modül)</dt>
                  <dd>{getPlanDisplayLabel(institution, packages)}</dd>
                </div>
                <div>
                  <dt>Paket Durumu</dt>
                  <dd>{resolvedPackage?.status ?? '—'}</dd>
                </div>
                <div>
                  <dt>Aylık Paket Ücreti</dt>
                  <dd>
                    {resolvedPackage?.monthlyPrice != null
                      ? `${Number(resolvedPackage.monthlyPrice).toLocaleString('tr-TR')} TL`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt>E-posta</dt>
                  <dd>{institution.email || '—'}</dd>
                </div>
                <div>
                  <dt>Telefon</dt>
                  <dd>{institution.phone || '—'}</dd>
                </div>
                <div>
                  <dt>Şehir</dt>
                  <dd>{institution.city || '—'}</dd>
                </div>
                <div>
                  <dt>Kurum Durumu</dt>
                  <dd>
                    <span className={`badge ${institution.isActive ? 'badge--ok' : 'badge--muted'}`}>
                      {institution.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </dd>
                </div>
              </dl>
            </section>

            <InstitutionSubscriptionCard
              subscription={subscription}
              institution={institution}
              resolvedPackage={resolvedPackage}
            />
          </div>

          <InstitutionNotesCard
            institutionId={institutionId}
            notes={notes}
            loading={notesLoading}
            onReload={() => void loadNotes()}
          />
        </>
      ) : activeTab === 'activities' ? (
        <section className="page-card">
          <h3 className="page-heading institution-detail__section-title">Son Aktiviteler</h3>
          <p className="muted">Bu kuruma ait son 20 işlem</p>
          <InstitutionActivitiesTab activities={activities} loading={activitiesLoading} />
        </section>
      ) : (
        <section className="page-card">
          <h3 className="page-heading institution-detail__section-title">Aktivite Zaman Çizelgesi</h3>
          <p className="muted">Bu kuruma ait tüm önemli işlemler kronolojik olarak listelenir</p>
          <InstitutionActivityTimeline institutionId={institutionId} />
        </section>
      )}
    </div>
  );
}
