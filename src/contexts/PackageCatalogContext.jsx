import { createContext, useContext } from 'react';
import { usePackageCatalog } from '../hooks/usePackageCatalog';

/** @type {import('react').Context<ReturnType<typeof usePackageCatalog>|null>} */
const PackageCatalogContext = createContext(null);

export function PackageCatalogProvider({ children }) {
  const catalog = usePackageCatalog({
    includeArchived: true,
    refreshCounts: false,
  });

  return (
    <PackageCatalogContext.Provider value={catalog}>
      {children}
    </PackageCatalogContext.Provider>
  );
}

/** SuperAdmin layout altında merkezi paket kataloğu */
export function usePackages() {
  const ctx = useContext(PackageCatalogContext);
  if (!ctx) {
    throw new Error('usePackages yalnızca PackageCatalogProvider içinde kullanılabilir.');
  }
  return ctx;
}

/** Provider dışında güvenli erişim (opsiyonel) */
export function usePackagesOptional() {
  return useContext(PackageCatalogContext);
}
