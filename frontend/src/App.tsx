import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import { LandingPage } from './pages/LandingPage';
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
    return (
      <div style={{ textAlign: 'center', padding: '120px 20px', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🛡️</div>
        <div>Verifying Sentinel credentials...</div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/gateway" replace />;
  }
  return <>{children}</>;
};

const Navigation: React.FC = () => {
  const { user, logout, switchDemoUser } = useAuth();
  const location = useLocation();

  // On the standalone landing page or login page, custom navigation is rendered
  if (!user || location.pathname === '/login' || location.pathname === '/') return null;

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <Link to="/" className="brand">
          <div className="logo-icon-wrap" style={{ width: '32px', height: '32px' }}>
            <span style={{ fontSize: '1.1rem' }}>🛡️</span>
          </div>
          <span style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>Sentinel</span>
          <span className="brand-badge" style={{ background: 'var(--primary)', color: 'var(--primary-contrast)', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
            Gateway
          </span>
        </Link>
        <nav className="nav-links">
          <Link to="/" className="nav-item">
            🌐 3D Landing
          </Link>
          <Link to="/gateway" className={`nav-item ${location.pathname === '/gateway' ? 'active' : ''}`}>
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Quick Demo Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card-inner)', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--bg-card-border)' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Role:</span>
          {(['employee', 'manager', 'hr', 'admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={`btn btn-secondary ${user.role === r ? 'btn-primary' : ''}`}
              style={{ padding: '3px 8px', fontSize: '0.72rem', textTransform: 'capitalize' }}
              onClick={() => switchDemoUser(r)}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Theme Toggle Button */}
        <ThemeToggle showLabel={false} />

        <div className="user-badge">
          <span>{user.username}</span>
          <span className={`role-pill role-${user.role}`}>{user.role}</span>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          onClick={logout}
        >
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
      <main className="main-content" style={{ padding: 0, maxWidth: '100%' }}>
        <Routes>
          {/* Public Landing Page with Three.js */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated Routes */}
          <Route
            path="/gateway"
            element={
              <ProtectedRoute>
                <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
                  <EmployeeChatPage />
                </div>
              </ProtectedRoute>
            }
          />
          <Route path="/chat" element={<Navigate to="/gateway" replace />} />
          <Route
            path="/manager"
            element={
              <ProtectedRoute allowedRoles={['manager', 'admin']}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
                  <ManagerDashboard />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr"
            element={
              <ProtectedRoute allowedRoles={['hr', 'admin']}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
                  <HRDashboard />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
                  <AdminPanel />
                </div>
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
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
