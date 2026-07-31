import { Building2, ClipboardList, CreditCard, FileText, History, KeyRound, LayoutDashboard, Package, PlusCircle, ScrollText, UserX } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { PackageCatalogProvider } from '../contexts/PackageCatalogContext';

const MENU = [
  { to: '/superadmin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/superadmin/subscriptions', label: 'Abonelikler', icon: CreditCard },
  { to: '/superadmin/packages', label: 'Paket Yönetimi', icon: Package },
  { to: '/superadmin/payment-history', label: 'Ödeme Geçmişi', icon: History },
  { to: '/superadmin/institutions', label: 'Kurumlar', icon: Building2 },
  { to: '/superadmin/rejected-institutions', label: 'Red Veren Kurumlar', icon: UserX },
  { to: '/superadmin/institutions/create', label: 'Kurum Oluştur', icon: PlusCircle },
  { to: '/superadmin/invite-codes', label: 'Admin Davet Kodları', icon: KeyRound },
  { to: '/superadmin/demo-requests', label: 'Demo Talepleri', icon: ClipboardList },
  { to: '/superadmin/legal-documents', label: 'Yasal Metinler', icon: FileText },
  { to: '/superadmin/audit-log', label: 'Aktivite Geçmişi', icon: ScrollText },
];

const TITLES = {
  '/superadmin': 'Dashboard',
  '/superadmin/subscriptions': 'Abonelikler',
  '/superadmin/packages': 'Paket Yönetimi',
  '/superadmin/payment-history': 'Ödeme Geçmişi',
  '/superadmin/institutions': 'Kurumlar',
  '/superadmin/rejected-institutions': 'Red Veren Kurumlar',
  '/superadmin/institutions/create': 'Kurum Oluştur',
  '/superadmin/invite-codes': 'Admin Davet Kodları',
  '/superadmin/demo-requests': 'Demo Talepleri',
  '/superadmin/legal-documents': 'Yasal Metinler',
  '/superadmin/audit-log': 'Aktivite Geçmişi',
};

export default function SuperAdminLayout() {
  const { pathname } = useLocation();
  const pageTitle =
    pathname.startsWith('/superadmin/institutions/') && pathname !== '/superadmin/institutions/create'
      ? 'Kurum Detayı'
      : (TITLES[pathname] ?? 'SuperAdmin');

  return (
    <PackageCatalogProvider>
      <div className="app-shell">
        <Sidebar subtitle="SuperAdmin" items={MENU} />
        <div className="app-shell__main">
          <Topbar pageTitle={pageTitle} />
          <main className="app-shell__content">
            <Outlet />
          </main>
        </div>
      </div>
    </PackageCatalogProvider>
  );
}
