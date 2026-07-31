import {
  BookOpen,
  Calendar,
  CreditCard,
  GitBranch,
  LayoutDashboard,
  Users,
  Video,
  Wallet,
  ClipboardList,
  GraduationCap,
  KeyRound,
} from 'lucide-react';
import { isModuleEnabled, normalizeModules } from '../constants/institutionModules';
import { SUBSCRIPTION_STATUS } from '../constants/subscriptionStatus';

export const ADMIN_MENU = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, moduleKey: 'webPanel' },
  { to: '/admin/students', label: 'Öğrenciler', icon: Users, moduleKey: 'webPanel' },
  { to: '/admin/teachers', label: 'Öğretmenler', icon: GraduationCap, moduleKey: 'webPanel' },
  { to: '/admin/invite-codes', label: 'Davet Kodları', icon: KeyRound, moduleKey: 'webPanel' },
  { to: '/admin/lessons/create', label: 'Ders Oluştur', icon: BookOpen, moduleKey: 'lessons' },
  { to: '/admin/schedule', label: 'Haftalık Program', icon: Calendar, moduleKey: 'lessons' },
  { to: '/admin/payments', label: 'Ödemeler', icon: CreditCard, moduleKey: 'payments' },
  { to: '/admin/finance', label: 'Finans', icon: Wallet, moduleKey: 'finance' },
  {
    to: '/admin/requests',
    label: 'Talepler',
    icon: ClipboardList,
    requireAny: ['scheduleRequests', 'attendance', 'makeupLessons', 'lessons'],
  },
  { to: '/admin/videos', label: 'Video Havuzu', icon: Video, moduleKey: 'videoLibrary' },
  { to: '/admin/video-tracking', label: 'Video Takip', icon: Video, moduleKey: 'videoLibrary' },
  { to: '/admin/branches', label: 'Branş Yönetimi', icon: GitBranch, moduleKey: 'branches' },
];

export const ADMIN_ROUTE_MODULES = {
  '/admin': 'webPanel',
  '/admin/students': 'webPanel',
  '/admin/teachers': 'webPanel',
  '/admin/invite-codes': 'webPanel',
  '/admin/lessons/create': 'lessons',
  '/admin/schedule': 'lessons',
  '/admin/payments': 'payments',
  '/admin/finance': 'finance',
  '/admin/requests': null,
  '/admin/videos': 'videoLibrary',
  '/admin/video-tracking': 'videoLibrary',
  '/admin/branches': 'branches',
};

function getAccessStatus(access = {}) {
  return access.subscriptionStatus ?? SUBSCRIPTION_STATUS.ACTIVE;
}

export function isAdminMenuItemVisible(item, modules, access = {}) {
  const normalized = normalizeModules(modules);
  if (!normalized.webPanel) {
    return false;
  }
  if (getAccessStatus(access) === SUBSCRIPTION_STATUS.CANCELLED) {
    return item.to === '/admin';
  }
  if (item.requireAny?.length) {
    return item.requireAny.some((key) => isModuleEnabled(normalized, key, access));
  }
  if (item.moduleKey) {
    return isModuleEnabled(normalized, item.moduleKey, access);
  }
  return true;
}

export function filterAdminMenu(modules, access = {}) {
  return ADMIN_MENU.filter((item) => isAdminMenuItemVisible(item, modules, access));
}

export function getAdminRouteModuleKey(pathname) {
  if (ADMIN_ROUTE_MODULES[pathname] !== undefined) {
    return ADMIN_ROUTE_MODULES[pathname];
  }
  return 'webPanel';
}

export function isAdminRouteAllowed(pathname, modules, access = {}) {
  const normalized = normalizeModules(modules);
  if (!normalized.webPanel) {
    return false;
  }
  if (getAccessStatus(access) === SUBSCRIPTION_STATUS.CANCELLED && pathname !== '/admin') {
    return false;
  }
  if (pathname === '/admin/requests') {
    return (
      isModuleEnabled(normalized, 'scheduleRequests', access)
      || isModuleEnabled(normalized, 'attendance', access)
      || isModuleEnabled(normalized, 'makeupLessons', access)
      || isModuleEnabled(normalized, 'lessons', access)
    );
  }
  const key = getAdminRouteModuleKey(pathname);
  return isModuleEnabled(normalized, key, access);
}
