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
              background: message.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              border: `1px solid ${message.type === 'success' ? 'var(--color-success-border)' : 'var(--color-danger-border)'}`,
              color: message.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
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
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-heading)' }}>No Pending Escalations</div>
            <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>All employee prompts are currently within policy thresholds.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {escalations.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg-card-inner)',
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
                    <span className="action-badge action-escalated">ESCALATED</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>User: {item.username}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({item.department})</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-warning)', fontWeight: 700 }}>
                    Risk Score: {item.risk_score}/100
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Sanitized Prompt Preview:
                  </div>
                  <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '6px', border: '1px solid var(--bg-card-border)', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--primary)' }}>
                    {item.masked_prompt}
                  </div>
                </div>

                {item.risk_factors && item.risk_factors.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Flagged Reasons:
                    </div>
                    <ul style={{ paddingLeft: '18px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
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
