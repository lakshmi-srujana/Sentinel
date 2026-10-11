import React, { useState, useEffect } from 'react';
import { api, type EscalationItem } from '../api/client';

export const ManagerDashboard: React.FC = () => {
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchEscalations = async () => {
    setLoading(true);
    try {
      const data = await api.getManagerEscalations();
      setEscalations(data.escalations || []);
    } catch {
      setMessage({ text: 'Access denied or error loading manager escalations.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscalations();
  }, []);

  const handleDecision = async (promptId: string, decision: 'approve' | 'reject') => {
    setActionLoading(promptId);
    setMessage(null);
    try {
      await api.reviewEscalation(promptId, decision);
      setMessage({ text: `Prompt ${promptId.slice(0, 8)} successfully ${decision}d.`, type: 'success' });
      await fetchEscalations();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.detail || `Failed to ${decision} prompt.`, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title" style={{ fontSize: '1.4rem' }}>Manager Governance Queue</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Review prompts flagged with Risk Scores 51–85 before dispatching to external LLMs.
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={fetchEscalations} disabled={loading}>
            🔄 Refresh Queue
          </button>
        </div>

        {message && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: message.type === 'success' ? '#34d399' : '#f87171',
              fontSize: '0.9rem',
            }}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Loading pending review items...
          </div>
        ) : escalations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🎉</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff' }}>No Pending Escalations</div>
            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>All employee prompts are currently within policy thresholds.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {escalations.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--bg-card-border)',
                  borderRadius: '10px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="action-badge action-escalate">ESCALATED</span>
                    <span style={{ fontWeight: 600, color: '#fff' }}>User: {item.username}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({item.department})</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 700 }}>
                    Risk Score: {item.risk_score}/100
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Sanitized Prompt Preview:
                  </div>
                  <div style={{ background: 'rgba(10, 13, 20, 0.7)', padding: '12px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.85rem', color: '#38bdf8' }}>
                    {item.masked_prompt}
                  </div>
                </div>

                {item.risk_factors && item.risk_factors.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Flagged Reasons:
                    </div>
                    <ul style={{ paddingLeft: '18px', fontSize: '0.85rem', color: '#e2e8f0' }}>
                      {item.risk_factors.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={actionLoading === item.id}
                    onClick={() => handleDecision(item.id, 'reject')}
                  >
                    ❌ Reject Prompt
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={actionLoading === item.id}
                    onClick={() => handleDecision(item.id, 'approve')}
                  >
                    ✅ Approve & Dispatch
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
