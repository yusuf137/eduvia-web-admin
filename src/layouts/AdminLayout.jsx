import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionActionGuardProvider } from '../contexts/SubscriptionActionGuardContext';
import { filterAdminMenu } from '../config/adminMenu';
import { normalizeModules } from '../constants/institutionModules';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const TITLES = {
  '/admin': 'Dashboard',
  '/admin/students': 'Öğrenciler',
  '/admin/teachers': 'Öğretmenler',
  '/admin/invite-codes': 'Davet Kodları',
  '/admin/lessons/create': 'Ders Oluştur',
  '/admin/schedule': 'Haftalık Program',
  '/admin/payments': 'Ödemeler',
  '/admin/finance': 'Finans',
  '/admin/requests': 'Talepler',
  '/admin/videos': 'Video Havuzu',
  '/admin/video-tracking': 'Video Takip',
  '/admin/branches': 'Branş Yönetimi',
};

export default function AdminLayout() {
  const { pathname } = useLocation();
  const { institutionModules, institutionAccess, subscriptionBanner, modulesLoading } = useAuth();
  const pageTitle = TITLES[pathname] ?? 'Kurum Yönetimi';
  const modules = normalizeModules(institutionModules);
  const menuItems = filterAdminMenu(institutionModules, institutionAccess);

  // eslint-disable-next-line no-console
  console.log('WEB CURRENT MODULES:', modules);
  // eslint-disable-next-line no-console
  console.log('WEB VISIBLE MENU ITEMS:', menuItems.map((i) => i.label));

  if (modulesLoading) {
    return (
      <div className="page-card" style={{ margin: 24 }}>
        <p className="muted">Kurum ayarları yükleniyor…</p>
      </div>
    );
  }

  if (!modules.webPanel) {
    return (
      <div className="page-card module-guard" style={{ margin: 24 }}>
        <h2 className="page-heading">Web panel bu kurum için kapalı</h2>
        <p className="muted">SuperAdmin kurum özelliklerinden Web Panel modülünü açabilir.</p>
      </div>
    );
  }

  return (
    <SubscriptionActionGuardProvider>
      <div className="app-shell">
        <Sidebar subtitle="Kurum Admin" items={menuItems} />
        <div className="app-shell__main">
          <Topbar pageTitle={pageTitle} />
          <main className="app-shell__content">
            {subscriptionBanner ? (
              <div className="alert alert--warn subscription-inactive-banner">
                {subscriptionBanner}
                {institutionAccess.isWriteBlocked
                  ? ' Paket gerektiren işlemler (yeni kayıt, ders, video, bildirim vb.) devre dışıdır.'
                  : ''}
              </div>
            ) : null}
            <Outlet />
          </main>
        </div>
      </div>
    </SubscriptionActionGuardProvider>
  );
}
