import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoadingScreen from './components/LoadingScreen';
import AdminLayout from './layouts/AdminLayout';
import SuperAdminLayout from './layouts/SuperAdminLayout';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import InstitutionsPage from './pages/superadmin/InstitutionsPage';
import InstitutionCreatePage from './pages/superadmin/InstitutionCreatePage';
import AdminInviteCodesPage from './pages/superadmin/AdminInviteCodesPage';
import DemoRequestsPage from './pages/superadmin/DemoRequestsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import StudentsPage from './pages/admin/StudentsPage';
import TeachersPage from './pages/admin/TeachersPage';
import LessonCreatePage from './pages/admin/LessonCreatePage';
import WeeklySchedulePage from './pages/admin/WeeklySchedulePage';
import StudentPaymentsPage from './pages/admin/StudentPaymentsPage';
import FinancePage from './pages/admin/FinancePage';
import RequestsPage from './pages/admin/RequestsPage';
import VideoLibraryPage from './pages/admin/VideoLibraryPage';
import VideoTrackingPage from './pages/admin/VideoTrackingPage';
import BranchManagementPage from './pages/admin/BranchManagementPage';
import InviteCodesPage from './pages/admin/InviteCodesPage';
import { AdminModulePage, AdminPathGuard, AdminRequestsGuard } from './components/AdminRouteGuard';
import { useSubdomainInstitution } from './hooks/useSubdomainInstitution';
import { logout } from './services/authService';

function RequireAuth({ children }) {
  const { loading, currentUser } = useAuth();
  if (loading) {
    return <LoadingScreen />;
  }
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireSuperAdmin() {
  const { loading, currentUserProfile } = useAuth();
  const { subdomain } = useSubdomainInstitution();

  if (loading) {
    return <LoadingScreen />;
  }
  if (subdomain) {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{
          message:
            'SuperAdmin paneli kurum subdomain’i üzerinden açılamaz. panel.eduviaapp.com kullanın.',
        }}
      />
    );
  }
  if (currentUserProfile?.role !== 'superAdmin') {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
}

function RequireAdmin() {
  const { loading, currentUserProfile } = useAuth();
  const { subdomain, tenantInstitution, tenantLoading } = useSubdomainInstitution();

  if (loading || (subdomain && tenantLoading)) {
    return <LoadingScreen />;
  }

  if (subdomain && currentUserProfile?.role === 'superAdmin') {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{
          message:
            'SuperAdmin girişi kurum subdomain’i üzerinden yapılamaz. panel.eduviaapp.com adresini kullanın.',
        }}
      />
    );
  }

  if (subdomain && !tenantInstitution) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ message: 'Bu subdomain\'e ait kurum bulunamadı.' }}
      />
    );
  }

  const adminPanelRole = currentUserProfile?.role;
  if (adminPanelRole !== 'admin' && adminPanelRole !== 'adminTeacher') {
    return <Navigate to="/unauthorized" replace />;
  }
  if (!currentUserProfile?.institutionId) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (
    subdomain &&
    tenantInstitution &&
    currentUserProfile.institutionId !== tenantInstitution.id
  ) {
    void logout();
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{ message: 'Bu kullanıcı bu kuruma ait değil.' }}
      />
    );
  }

  return <Outlet />;
}

function HomeRedirect() {
  const { loading, currentUser, currentUserProfile } = useAuth();
  const { subdomain, tenantInstitution, tenantLoading } = useSubdomainInstitution();

  if (loading || (subdomain && tenantLoading)) {
    return <LoadingScreen />;
  }
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (!currentUserProfile) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (subdomain && currentUserProfile.role === 'superAdmin') {
    return <Navigate to="/unauthorized" replace />;
  }

  if (currentUserProfile.role === 'superAdmin') {
    return <Navigate to="/superadmin" replace />;
  }
  if (
    (currentUserProfile.role === 'admin' || currentUserProfile.role === 'adminTeacher') &&
    currentUserProfile.institutionId
  ) {
    if (subdomain && tenantInstitution && currentUserProfile.institutionId !== tenantInstitution.id) {
      return (
        <Navigate
          to="/unauthorized"
          replace
          state={{ message: 'Bu kullanıcı bu kuruma ait değil.' }}
        />
      );
    }
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/unauthorized" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route
        element={
          <RequireAuth>
            <Outlet />
          </RequireAuth>
        }>
        <Route element={<RequireSuperAdmin />}>
          <Route path="/superadmin" element={<SuperAdminLayout />}>
            <Route index element={<SuperAdminDashboard />} />
            <Route path="institutions" element={<InstitutionsPage />} />
            <Route path="institutions/create" element={<InstitutionCreatePage />} />
            <Route path="invite-codes" element={<AdminInviteCodesPage />} />
            <Route path="demo-requests" element={<DemoRequestsPage />} />
          </Route>
        </Route>

        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route
              index
              element={
                <AdminPathGuard pathname="/admin">
                  <AdminDashboard />
                </AdminPathGuard>
              }
            />
            <Route
              path="students"
              element={
                <AdminPathGuard pathname="/admin/students">
                  <StudentsPage />
                </AdminPathGuard>
              }
            />
            <Route
              path="teachers"
              element={
                <AdminPathGuard pathname="/admin/teachers">
                  <TeachersPage />
                </AdminPathGuard>
              }
            />
            <Route
              path="invite-codes"
              element={
                <AdminPathGuard pathname="/admin/invite-codes">
                  <InviteCodesPage />
                </AdminPathGuard>
              }
            />
            <Route
              path="lessons/create"
              element={
                <AdminModulePage moduleKey="lessons">
                  <LessonCreatePage />
                </AdminModulePage>
              }
            />
            <Route
              path="schedule"
              element={
                <AdminModulePage moduleKey="lessons">
                  <WeeklySchedulePage />
                </AdminModulePage>
              }
            />
            <Route
              path="payments"
              element={
                <AdminModulePage moduleKey="payments">
                  <StudentPaymentsPage />
                </AdminModulePage>
              }
            />
            <Route
              path="finance"
              element={
                <AdminModulePage moduleKey="finance">
                  <FinancePage />
                </AdminModulePage>
              }
            />
            <Route
              path="requests"
              element={
                <AdminRequestsGuard>
                  <RequestsPage />
                </AdminRequestsGuard>
              }
            />
            <Route
              path="videos"
              element={
                <AdminModulePage moduleKey="videoLibrary">
                  <VideoLibraryPage />
                </AdminModulePage>
              }
            />
            <Route
              path="video-tracking"
              element={
                <AdminModulePage moduleKey="videoLibrary">
                  <VideoTrackingPage />
                </AdminModulePage>
              }
            />
            <Route
              path="branches"
              element={
                <AdminModulePage moduleKey="branches">
                  <BranchManagementPage />
                </AdminModulePage>
              }
            />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
