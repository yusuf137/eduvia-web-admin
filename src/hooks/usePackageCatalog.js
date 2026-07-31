import { useCallback, useEffect, useState } from 'react';
import {
  computePackageDashboardStats,
  getPackages,
  refreshPackageInstitutionCounts,
} from '../services/packageService';

/** @returns {{ packages: import('../types/package').PackageRecord[], loading: boolean, stats: import('../types/package').PackageDashboardStats, reload: () => Promise<void> }} */
export function usePackageCatalog(options = {}) {
  const { includeArchived = true, refreshCounts = false } = options;
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    mostUsedName: '—',
  });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      if (refreshCounts) {
        await refreshPackageInstitutionCounts();
      }
      const rows = await getPackages({ includeArchived });
      setPackages(rows);
      setStats(computePackageDashboardStats(rows));
    } finally {
      setLoading(false);
    }
  }, [includeArchived, refreshCounts]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const activePackages = packages.filter(
    (row) => row.status === 'active' && !row.archived,
  );

  return { packages, activePackages, loading, stats, reload };
}
