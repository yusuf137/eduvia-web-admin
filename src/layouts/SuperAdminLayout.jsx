import { Building2, ClipboardList, KeyRound, LayoutDashboard, PlusCircle } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const MENU = [
  { to: '/superadmin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/superadmin/institutions', label: 'Kurumlar', icon: Building2 },
  { to: '/superadmin/institutions/create', label: 'Kurum Oluştur', icon: PlusCircle },
  { to: '/superadmin/invite-codes', label: 'Admin Davet Kodları', icon: KeyRound },
  { to: '/superadmin/demo-requests', label: 'Demo Talepleri', icon: ClipboardList },
];

const TITLES = {
  '/superadmin': 'Dashboard',
  '/superadmin/institutions': 'Kurumlar',
  '/superadmin/institutions/create': 'Kurum Oluştur',
  '/superadmin/invite-codes': 'Admin Davet Kodları',
  '/superadmin/demo-requests': 'Demo Talepleri',
};

export default function SuperAdminLayout() {
  const { pathname } = useLocation();
  const pageTitle = TITLES[pathname] ?? 'SuperAdmin';

  return (
    <div className="app-shell">
      <Sidebar title="Eduvia" subtitle="SuperAdmin" items={MENU} />
      <div className="app-shell__main">
        <Topbar pageTitle={pageTitle} />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
