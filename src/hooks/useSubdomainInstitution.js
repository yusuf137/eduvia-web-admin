import { useEffect, useMemo, useState } from 'react';
import { getInstitutionBySlug } from '../services/institutionService';
import { getSubdomain } from '../utils/subdomain';

export function useSubdomainInstitution() {
  const subdomain = useMemo(() => getSubdomain(), []);
  const [tenantInstitution, setTenantInstitution] = useState(null);
  const [tenantLoading, setTenantLoading] = useState(Boolean(subdomain));
  const [tenantError, setTenantError] = useState('');

  useEffect(() => {
    if (!subdomain) {
      setTenantInstitution(null);
      setTenantError('');
      setTenantLoading(false);
      return;
    }

    let cancelled = false;
    setTenantLoading(true);
    setTenantError('');
    setTenantInstitution(null);

    void getInstitutionBySlug(subdomain)
      .then((inst) => {
        if (cancelled) {
          return;
        }
        if (!inst) {
          setTenantError('Bu subdomain\'e ait kurum bulunamadı.');
          setTenantInstitution(null);
          return;
        }
        if (!inst.isActive) {
          setTenantError('Bu kurum hesabı pasif durumda.');
          setTenantInstitution(null);
          return;
        }
        setTenantInstitution(inst);
        setTenantError('');
      })
      .catch((e) => {
        if (!cancelled) {
          setTenantError(e?.message ?? 'Kurum bilgisi yüklenemedi.');
          setTenantInstitution(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setTenantLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [subdomain]);

  return {
    subdomain,
    tenantInstitution,
    tenantLoading,
    tenantError,
    hasSubdomain: Boolean(subdomain),
  };
}
