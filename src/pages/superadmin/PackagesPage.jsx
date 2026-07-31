import { useState } from 'react';
import { Plus } from 'lucide-react';
import PackageFormModal, { PackageDetailModal } from '../../components/superadmin/packages/PackageFormModal';
import PackageManagementCard, { PackageStatCards } from '../../components/superadmin/packages/PackageManagementCard';
import { usePackages } from '../../contexts/PackageCatalogContext';
import {
  createPackage,
  duplicatePackage,
  refreshPackageInstitutionCounts,
  removePackage,
  togglePackageActiveStatus,
  updatePackage,
} from '../../services/packageService';

export default function PackagesPage() {
  const { packages, loading, stats, reload } = usePackages();
  const [actingId, setActingId] = useState('');
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editPackage, setEditPackage] = useState(null);
  const [viewPackage, setViewPackage] = useState(null);

  const visiblePackages = packages.filter((row) => !row.archived);

  const runAction = async (id, fn) => {
    setActingId(id);
    setError('');
    try {
      await fn();
      await refreshPackageInstitutionCounts();
      await reload();
    } catch (e) {
      setError(e?.message ?? 'İşlem başarısız.');
    } finally {
      setActingId('');
    }
  };

  const handleCreate = async (payload) => {
    await createPackage(payload);
    await refreshPackageInstitutionCounts();
    await reload();
  };

  const handleUpdate = async (payload) => {
    if (!editPackage) return;
    await updatePackage(editPackage.id, payload);
    await refreshPackageInstitutionCounts();
    await reload();
  };

  return (
    <div className="page-stack packages-page">
      <div className="page-toolbar">
        <div>
          <h2 className="page-heading">Paket Yönetimi</h2>
          <p className="muted">Abonelik paketlerini dinamik olarak yönetin</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setEditPackage(null);
            setFormOpen(true);
          }}>
          <Plus size={16} />
          Yeni Paket
        </button>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      <PackageStatCards stats={stats} loading={loading} />

      {loading ? (
        <p className="muted">Paketler yükleniyor…</p>
      ) : !visiblePackages.length ? (
        <div className="page-card">
          <p className="muted">Henüz paket bulunmuyor.</p>
        </div>
      ) : (
        <div className="package-mgmt-grid">
          {visiblePackages.map((pkg) => (
            <PackageManagementCard
              key={pkg.id}
              pkg={pkg}
              busy={actingId === pkg.id}
              onView={() => setViewPackage(pkg)}
              onEdit={() => {
                setEditPackage(pkg);
                setFormOpen(true);
              }}
              onDuplicate={() =>
                void runAction(pkg.id, async () => {
                  const name = window.prompt('Yeni paket adı', `${pkg.name} Plus`);
                  if (!name?.trim()) return;
                  await duplicatePackage(pkg.id, name.trim());
                })
              }
              onToggleStatus={() => void runAction(pkg.id, () => togglePackageActiveStatus(pkg.id))}
              onDelete={() => {
                const ok = window.confirm(
                  pkg.institutionCount > 0
                    ? `${pkg.institutionCount} kurum bu paketi kullanıyor. Paket arşivlenecek, silinmeyecek. Devam edilsin mi?`
                    : `${pkg.name} paketi silinsin mi?`,
                );
                if (ok) {
                  void runAction(pkg.id, () => removePackage(pkg.id));
                }
              }}
            />
          ))}
        </div>
      )}

      <PackageFormModal
        open={formOpen}
        initial={editPackage}
        onClose={() => {
          setFormOpen(false);
          setEditPackage(null);
        }}
        onSubmit={editPackage ? handleUpdate : handleCreate}
      />

      <PackageDetailModal
        pkg={viewPackage}
        open={Boolean(viewPackage)}
        onClose={() => setViewPackage(null)}
        onEdit={() => {
          setEditPackage(viewPackage);
          setViewPackage(null);
          setFormOpen(true);
        }}
      />
    </div>
  );
}
