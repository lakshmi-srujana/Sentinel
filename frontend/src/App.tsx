import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { EmployeeChatPage } from './pages/EmployeeChatPage';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { HRDashboard } from './pages/HRDashboard';
import { AdminPanel } from './pages/AdminPanel';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>Loading Sentinel...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const Navigation: React.FC = () => {
  const { user, logout, switchDemoUser } = useAuth();
  const location = useLocation();

  if (!user || location.pathname === '/login') return null;

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <Link to="/" className="brand">
          <span>🛡️ Sentinel</span>
          <span className="brand-badge">Gateway</span>
        </Link>
        <nav className="nav-links">
          <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
            Prompt Gateway
          </Link>
          {(user.role === 'manager' || user.role === 'admin') && (
            <Link to="/manager" className={`nav-item ${location.pathname === '/manager' ? 'active' : ''}`}>
              Manager Queue
            </Link>
          )}
          {(user.role === 'hr' || user.role === 'admin') && (
            <Link to="/hr" className={`nav-item ${location.pathname === '/hr' ? 'active' : ''}`}>
              HR Telemetry
            </Link>
          )}
          {user.role === 'admin' && (
            <Link to="/admin" className={`nav-item ${location.pathname === '/admin' ? 'active' : ''}`}>
              Admin Console
            </Link>
          )}
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Quick Demo Switcher in Navbar for Convenience */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--bg-card-border)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Switch:</span>
          {(['employee', 'manager', 'hr', 'admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={`btn btn-secondary ${user.role === r ? 'btn-primary' : ''}`}
              style={{ padding: '3px 8px', fontSize: '0.75rem', textTransform: 'capitalize' }}
              onClick={() => switchDemoUser(r)}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="user-badge">
          <span>{user.username}</span>
          <span className={`role-pill role-${user.role}`}>{user.role}</span>
        </div>

        <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
};

export const AppContent: React.FC = () => {
  return (
    <div className="app-container">
      <Navigation />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <EmployeeChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager"
            element={
              <ProtectedRoute allowedRoles={['manager', 'admin']}>
                <ManagerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr"
            element={
              <ProtectedRoute allowedRoles={['hr', 'admin']}>
                <HRDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
