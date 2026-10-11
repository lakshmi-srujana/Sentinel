import React, { useState, useEffect } from 'react';
import { api, type HRAnalytics } from '../api/client';

export const HRDashboard: React.FC = () => {
  const [data, setData] = useState<HRAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getHRAnalytics();
        setData(res);
      } catch {
        setError('Access denied. HR or Admin role required.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Loading HR Analytics...</div>;
  }

  if (error || !data) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ color: '#f87171', fontSize: '1.1rem', fontWeight: 600 }}>{error || 'Unable to load analytics'}</div>
      </div>
    );
  }

  const actions = data.actions_breakdown || { approved: 0, redact: 0, escalate: 0, blocked: 0 };
  const total = data.total_prompts || 1;
  const approvedPct = Math.round((actions.approved / total) * 100);
  const redactPct = Math.round((actions.redact / total) * 100);
  const escalatePct = Math.round((actions.escalate / total) * 100);
  const blockedPct = Math.round((actions.blocked / total) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title" style={{ fontSize: '1.4rem' }}>HR & Compliance AI Telemetry</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Aggregated organization-wide AI safety trends with strict privacy preservation (zero raw prompt data).
            </p>
          </div>
          <div className="action-badge action-approved" style={{ fontSize: '0.75rem' }}>
            🔒 Zero PII Retention Verified
          </div>
        </div>

        {/* Top Summary Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', margin: '20px 0' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bg-card-border)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Governed Queries</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '8px' }}>{data.total_prompts}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bg-card-border)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Avg Org Risk Score</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', marginTop: '8px' }}>{data.average_risk_score}/100</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bg-card-border)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Sanitized Redactions</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b', marginTop: '8px' }}>{actions.redact}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bg-card-border)', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Security Blocks</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444', marginTop: '8px' }}>{actions.blocked}</div>
          </div>
        </div>

        {/* Policy Distribution Bar */}
        <div style={{ margin: '24px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 600 }}>Policy Action Breakdown</span>
            <span style={{ color: 'var(--text-muted)' }}>Distribution across all departments</span>
          </div>
          <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', background: 'rgba(255,255,255,0.1)' }}>
            <div style={{ width: `${approvedPct}%`, background: '#10b981' }} title={`Approved: ${approvedPct}%`} />
            <div style={{ width: `${redactPct}%`, background: '#38bdf8' }} title={`Redacted: ${redactPct}%`} />
            <div style={{ width: `${escalatePct}%`, background: '#f59e0b' }} title={`Escalated: ${escalatePct}%`} />
            <div style={{ width: `${blockedPct}%`, background: '#ef4444' }} title={`Blocked: ${blockedPct}%`} />
          </div>
          <div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '2px' }} /> Approved ({actions.approved})</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', background: '#38bdf8', borderRadius: '2px' }} /> Redacted ({actions.redact})</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', background: '#f59e0b', borderRadius: '2px' }} /> Escalated ({actions.escalate})</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '2px' }} /> Blocked ({actions.blocked})</span>
          </div>
        </div>

        {/* Department Usage Table */}
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>Department AI Activity & Risk Heatmap</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Prompts Governed</th>
                <th>Average Risk Score</th>
                <th>Governance Status</th>
              </tr>
            </thead>
            <tbody>
              {data.department_stats && data.department_stats.length > 0 ? (
                data.department_stats.map((dept, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{dept.department}</td>
                    <td>{dept.prompt_count}</td>
                    <td>
                      <span style={{ color: dept.avg_risk_score > 50 ? '#f59e0b' : '#38bdf8', fontWeight: 700 }}>
                        {dept.avg_risk_score}/100
                      </span>
                    </td>
                    <td>
                      <span className={`action-badge ${dept.avg_risk_score > 50 ? 'action-escalate' : 'action-approved'}`} style={{ fontSize: '0.7rem' }}>
                        {dept.avg_risk_score > 50 ? 'Elevated Monitoring' : 'Compliant'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    No department data logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
