import { ShieldAlert } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import EduviaLogo from '../components/EduviaLogo';
import { logout } from '../services/authService';

export default function UnauthorizedPage() {
  const location = useLocation();
  const customMessage = location.state?.message;

  return (
    <div className="center-page">
      <div className="center-card">
        <EduviaLogo variant="login" className="center-card__logo" />
        <ShieldAlert size={40} className="center-card__icon center-card__icon--warn" />
        <h1>Yetkisiz Erişim</h1>
        <p>
          {customMessage ??
            'Bu panel yalnızca SuperAdmin ve kurum Admin hesapları içindir. Öğretmen ve öğrenci hesapları web panele giremez.'}
        </p>
        <div className="center-card__actions">
          <Link to="/login" className="btn btn--ghost">
            Giriş sayfası
          </Link>
          <button type="button" className="btn btn--primary" onClick={() => void logout()}>
            Çıkış Yap
          </button>
        </div>
      </div>
    </div>
  );
}
