import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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
      navigate('/');
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
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Quick switch failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-block', padding: '10px 14px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', marginBottom: '12px' }}>
            <span style={{ fontSize: '1.8rem' }}>🛡️</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>Sentinel Governance</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
            Enterprise AI Gateway & Risk Orchestration
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
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
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
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

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In to Gateway'}
          </button>
        </form>

        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--bg-card-border)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', textAlign: 'center' }}>
            Instant Demo Logins
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => handleQuickSwitch('employee')}>
              👤 Employee
            </button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => handleQuickSwitch('manager')}>
              👔 Manager
            </button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => handleQuickSwitch('hr')}>
              📊 HR Ops
            </button>
            <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => handleQuickSwitch('admin')}>
              ⚙️ Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
