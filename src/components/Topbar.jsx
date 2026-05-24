import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../services/authService';

export default function Topbar({ pageTitle }) {
  const { currentUserProfile } = useAuth();

  return (
    <header className="topbar">
      <div>
        <h1 className="topbar__title">{pageTitle}</h1>
        {currentUserProfile ? (
          <p className="topbar__meta">
            {currentUserProfile.name}
            {currentUserProfile.email ? ` · ${currentUserProfile.email}` : ''}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="topbar__logout"
        onClick={() => void logout()}>
        <LogOut size={16} />
        Çıkış Yap
      </button>
    </header>
  );
}
