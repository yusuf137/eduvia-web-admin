import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubdomainInstitution } from '../hooks/useSubdomainInstitution';
import { loginWithEmail, logout } from '../services/authService';
import LoadingScreen from '../components/LoadingScreen';
import { getInstitutionPanelHost } from '../utils/subdomain';

function resolvePostLogin(profile, { subdomain, tenantInstitution }) {
  if (!profile) {
    return { ok: false, message: 'Kullanıcı profili bulunamadı.' };
  }

  if (subdomain) {
    if (profile.role === 'superAdmin') {
      return {
        ok: false,
        message: 'SuperAdmin girişi kurum subdomain’i üzerinden yapılamaz. panel.eduviaapp.com adresini kullanın.',
      };
    }
    if (!tenantInstitution) {
      return { ok: false, message: 'Bu subdomain\'e ait kurum bulunamadı.' };
    }
    if (profile.role !== 'admin') {
      return { ok: false, message: 'Bu panel yalnızca kurum yöneticileri içindir.' };
    }
    if (profile.institutionId !== tenantInstitution.id) {
      return { ok: false, message: 'Bu kullanıcı bu kuruma ait değil.' };
    }
    return { ok: true, to: '/admin' };
  }

  if (profile.role === 'superAdmin') {
    return { ok: true, to: '/superadmin' };
  }
  if (profile.role === 'admin' && profile.institutionId) {
    return { ok: true, to: '/admin' };
  }
  return { ok: false, message: 'Bu hesap web panele erişemez.' };
}

export default function LoginPage() {
  const { loading, currentUser, currentUserProfile } = useAuth();
  const { subdomain, tenantInstitution, tenantLoading, tenantError, hasSubdomain } =
    useSubdomainInstitution();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState('');

  useEffect(() => {
    if (!currentUser || !currentUserProfile || loading || tenantLoading) {
      return;
    }

    const result = resolvePostLogin(currentUserProfile, { subdomain, tenantInstitution });
    if (!result.ok) {
      setAccessDenied(result.message);
      void logout();
    }
  }, [currentUser, currentUserProfile, loading, tenantLoading, subdomain, tenantInstitution]);

  if (loading || (hasSubdomain && tenantLoading)) {
    return <LoadingScreen message="Kurum bilgisi yükleniyor…" />;
  }

  if (currentUser && currentUserProfile && !accessDenied) {
    const result = resolvePostLogin(currentUserProfile, { subdomain, tenantInstitution });
    if (result.ok) {
      return <Navigate to={result.to} replace />;
    }
  }

  const panelHost = tenantInstitution?.slug
    ? getInstitutionPanelHost(tenantInstitution.slug)
    : subdomain
      ? getInstitutionPanelHost(subdomain)
      : '';

  const loginBlocked = hasSubdomain && (tenantError || !tenantInstitution);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loginBlocked) {
      return;
    }
    setError('');
    setAccessDenied('');
    setSubmitting(true);
    try {
      await loginWithEmail(email, password);
    } catch (err) {
      setError(err?.message ?? 'Giriş başarısız.');
    } finally {
      setSubmitting(false);
    }
  };

  const heading = tenantInstitution?.name
    ? `${tenantInstitution.name} Paneli`
    : hasSubdomain
      ? 'Kurum Paneli'
      : 'Eduvia Web Admin';

  const subtitle = tenantInstitution
    ? `${panelHost} üzerinden giriş yapın`
    : hasSubdomain
      ? tenantError || 'Kurum bilgisi yükleniyor…'
      : 'Kurum yönetim paneline giriş yapın';

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__brand">
          <div className="login-card__logo">E</div>
          <h1>{heading}</h1>
          <p>{subtitle}</p>
          {panelHost && tenantInstitution ? (
            <p className="login-card__host">{panelHost}</p>
          ) : null}
        </div>

        {tenantError ? <div className="form-error">{tenantError}</div> : null}
        {accessDenied ? <div className="form-error">{accessDenied}</div> : null}

        <form onSubmit={onSubmit} className="login-form">
          <label>
            E-posta
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={loginBlocked}
            />
          </label>
          <label>
            Şifre
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loginBlocked}
            />
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting || loginBlocked}>
            {submitting ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
