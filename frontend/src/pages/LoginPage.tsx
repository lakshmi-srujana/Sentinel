import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';

export const LoginPage: React.FC = () => {
  const { login, switchDemoUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('employee');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate('/gateway');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSwitch = async (role: 'employee' | 'manager' | 'hr' | 'admin') => {
    setError(null);
    setLoading(true);
    try {
      await switchDemoUser(role);
      if (role === 'employee') navigate('/gateway');
      else navigate(`/${role}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Quick switch failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header style={{ padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'var(--text-heading)', fontWeight: 700 }}>
          <span>← Back to 3D Landing Page</span>
        </Link>
        <ThemeToggle showLabel={true} />
      </header>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
        <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '36px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'inline-flex', padding: '12px 16px', borderRadius: '14px', background: 'var(--bg-card-inner)', border: '1px solid var(--bg-card-border)', marginBottom: '16px' }}>
              <span style={{ fontSize: '2rem' }}>🛡️</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)' }}>Sentinel Console</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '6px' }}>
              Enterprise AI Gateway & Risk Orchestration
            </p>
          </div>

          {error && (
            <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger)', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Username
              </label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '6px' }} disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In to Gateway'}
            </button>
          </form>

          <div style={{ marginTop: '28px', paddingTop: '22px', borderTop: '1px solid var(--bg-card-border)' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', textAlign: 'center' }}>
              Instant Demo Access (Click to Login)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" style={{ fontSize: '0.82rem' }} onClick={() => handleQuickSwitch('employee')}>
                👤 Employee
              </button>
              <button type="button" className="btn btn-secondary" style={{ fontSize: '0.82rem' }} onClick={() => handleQuickSwitch('manager')}>
                👔 Manager
              </button>
              <button type="button" className="btn btn-secondary" style={{ fontSize: '0.82rem' }} onClick={() => handleQuickSwitch('hr')}>
                📊 HR Lead
              </button>
              <button type="button" className="btn btn-secondary" style={{ fontSize: '0.82rem' }} onClick={() => handleQuickSwitch('admin')}>
                ⚙️ Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
