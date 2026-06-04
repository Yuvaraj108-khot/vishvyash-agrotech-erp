import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import DriversPage from './pages/DriversPage';
import VehiclesPage from './pages/VehiclesPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceCreatePage from './pages/InvoiceCreatePage';
import PaymentsPage from './pages/PaymentsPage';
import ReportsPage from './pages/ReportsPage';
import AuditPage from './pages/AuditPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/drivers" element={<DriversPage />} />
                <Route path="/vehicles" element={<VehiclesPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/invoices/create" element={<InvoiceCreatePage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/audit" element={<AdminRoute><AuditPage /></AdminRoute>} />
                <Route path="/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
                <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
