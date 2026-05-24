import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubdomainInstitution } from '../hooks/useSubdomainInstitution';
import { loginWithEmail, logout, sendPasswordReset } from '../services/authService';
import EduviaLogo from '../components/EduviaLogo';
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
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

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

  const openResetModal = () => {
    setResetEmail(email || '');
    setResetError('');
    setResetSuccess('');
    setResetModalOpen(true);
  };

  const closeResetModal = () => {
    setResetModalOpen(false);
    setResetError('');
    setResetSuccess('');
    setResetLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) {
      setResetError('Lütfen e-posta adresinizi girin.');
      return;
    }

    if (!resetEmail.includes('@')) {
      setResetError('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    try {
      setResetLoading(true);
      setResetError('');
      setResetSuccess('');

      await sendPasswordReset(resetEmail.trim());

      setResetSuccess('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
    } catch (err) {
      const code = err?.code;
      if (code === 'auth/user-not-found') {
        setResetError('Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.');
      } else if (code === 'auth/invalid-email') {
        setResetError('Geçersiz e-posta adresi.');
      } else {
        setResetError('Şifre sıfırlama e-postası gönderilemedi. Lütfen tekrar deneyin.');
      }
    } finally {
      setResetLoading(false);
    }
  };

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

  const heading = tenantInstitution?.name ? `${tenantInstitution.name} Paneli` : null;

  const subtitle = tenantInstitution
    ? `${panelHost} üzerinden giriş yapın`
    : hasSubdomain
      ? tenantError || 'Kurum bilgisi yükleniyor…'
      : 'Kurum yönetim paneline giriş yapın';

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__brand">
          <EduviaLogo variant="login" />
          {heading ? <h1 className="login-card__heading">{heading}</h1> : null}
          <p className="login-card__subtitle">{subtitle}</p>
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
          <button
            type="button"
            className="login-forgot-link"
            disabled={loginBlocked}
            onClick={openResetModal}>
            Şifremi unuttum
          </button>
        </form>
      </div>

      {resetModalOpen ? (
        <div
          className="modal-backdrop login-reset-backdrop"
          role="presentation"
          onClick={closeResetModal}>
          <div
            className="modal-card login-reset-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-modal-title"
            onClick={(e) => e.stopPropagation()}>
            <h3 id="reset-modal-title">Şifre Sıfırlama</h3>
            <p className="login-reset-modal__desc">
              Hesabınıza bağlı e-posta adresini girin. Şifre sıfırlama bağlantısı e-posta adresinize
              gönderilecektir.
            </p>
            <label className="login-reset-modal__label">
              E-posta
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                disabled={resetLoading}
              />
            </label>
            {resetError ? <div className="form-error">{resetError}</div> : null}
            {resetSuccess ? <div className="alert alert--success">{resetSuccess}</div> : null}
            <div className="modal-card__actions login-reset-modal__actions">
              <button
                type="button"
                className="btn btn--primary"
                disabled={resetLoading}
                onClick={() => void handlePasswordReset()}>
                {resetLoading ? 'Gönderiliyor…' : 'Gönder'}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={resetLoading}
                onClick={closeResetModal}>
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
