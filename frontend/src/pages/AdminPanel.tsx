import React, { useState, useEffect } from 'react';
import { api, type AdminStats } from '../api/client';

export const AdminPanel: React.FC = () => {
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminDashboard();
      setData(res);
    } catch {
      setError('Access denied. Administrator privileges required.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Loading Admin Telemetry...</div>;
  }

  if (error || !data) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ color: '#f87171', fontSize: '1.1rem', fontWeight: 600 }}>{error || 'Unable to load admin panel'}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title" style={{ fontSize: '1.4rem' }}>Sentinel Admin & Governance Console</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Full system inspection, policy rule mapping, and immutable audit logs.
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={fetchAdminData}>
            🔄 Refresh Audit Logs
          </button>
        </div>

        {/* Admin Overview Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', margin: '20px 0' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bg-card-border)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Users</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '8px' }}>{data.total_users}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bg-card-border)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Immutable Logs</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', marginTop: '8px' }}>{data.total_audited_prompts}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bg-card-border)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Gateway Engine</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981', marginTop: '10px' }}>v0.2 Active (FastAPI)</div>
          </div>
        </div>

        {/* Policy Thresholds */}
        <div style={{ margin: '24px 0', padding: '18px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bg-card-border)', borderRadius: '10px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>Active Governance Policy Mapping</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>Approve Policy</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>Score: 0 – 30</div>
            </div>
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>Redact Policy</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>Score: 31 – 50</div>
            </div>
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>Escalate Policy</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>Score: 51 – 85</div>
            </div>
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>Block Policy</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>Score: 86 – 100</div>
            </div>
          </div>
        </div>

        {/* Immutable Audit Log Table */}
        <div style={{ marginTop: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>Immutable Audit Log Records</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Masked Prompt (Sanitized)</th>
                  <th>Risk Score</th>
                  <th>Policy Action</th>
                  <th>Status</th>
                  <th>SHA-256 Hash</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_logs && data.recent_logs.length > 0 ? (
                  data.recent_logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{log.username}</td>
                      <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', color: '#cbd5e1' }}>
                        {log.masked_prompt}
                      </td>
                      <td style={{ fontWeight: 700, color: log.risk_score > 50 ? '#f59e0b' : '#38bdf8' }}>
                        {log.risk_score}
                      </td>
                      <td>
                        <span className={`action-badge action-${log.risk_action}`} style={{ fontSize: '0.7rem' }}>
                          {log.risk_action}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.status}</span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {log.raw_text_hash ? `${log.raw_text_hash.slice(0, 10)}...` : 'N/A'}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      No audit records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
