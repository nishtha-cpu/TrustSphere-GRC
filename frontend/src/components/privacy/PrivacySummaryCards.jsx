import React from 'react';

export default function PrivacySummaryCards({ stats, loading = false }) {
  if (loading || !stats) {
    return (
      <div className="overview-container" style={{ marginBottom: '1.5rem' }}>
        <div className="table-card table-state-container" style={{ padding: '1rem' }}>
          <p className="state-message">Loading Privacy Dashboard Metrics...</p>
        </div>
      </div>
    );
  }

  const { consents = {}, purposes = {}, dsr = {} } = stats;

  return (
    <div className="overview-container" style={{ marginBottom: '1.5rem' }}>
      <div className="overview-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>

        {/* CONSENTS METRICS CARD */}
        <div className="overview-card" style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 className="card-title" style={{ fontSize: '0.95rem', margin: 0 }}>📜 Consent Records</h3>
            <span className="risk-code" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#60a5fa' }}>
              {consents.total || 0} Total
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Granted</span>
              <strong style={{ color: '#4ade80', fontSize: '1rem' }}>{consents.granted || 0}</strong>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Denied</span>
              <strong style={{ color: '#f87171', fontSize: '1rem' }}>{consents.denied || 0}</strong>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Withdrawn</span>
              <strong style={{ color: '#fbbf24', fontSize: '1rem' }}>{consents.withdrawn || 0}</strong>
            </div>

            <div style={{ background: 'rgba(100, 116, 139, 0.1)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(100, 116, 139, 0.2)' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Expired</span>
              <strong style={{ color: '#94a3b8', fontSize: '1rem' }}>{consents.expired || 0}</strong>
            </div>
          </div>
        </div>

        {/* PROCESSING PURPOSES CARD */}
        <div className="overview-card" style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 className="card-title" style={{ fontSize: '0.95rem', margin: 0 }}>🛡️ Processing Purposes</h3>
            <span className="risk-code" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>
              {(purposes.active || 0) + (purposes.archived || 0)} Total
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Active Purposes</span>
              <strong style={{ color: '#60a5fa', fontSize: '1.2rem' }}>{purposes.active || 0}</strong>
            </div>

            <div style={{ background: 'rgba(148, 163, 184, 0.1)', padding: '0.75rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Archived Purposes</span>
              <strong style={{ color: '#cbd5e1', fontSize: '1.2rem' }}>{purposes.archived || 0}</strong>
            </div>
          </div>
        </div>

        {/* DATA SUBJECT REQUESTS (DSR) CARD */}
        <div className="overview-card" style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 className="card-title" style={{ fontSize: '0.95rem', margin: 0 }}>📂 Privacy Requests (DSR)</h3>
            <span className="risk-code" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a78bfa' }}>
              {dsr.total || 0} Total
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', fontSize: '0.8rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.4rem', borderRadius: '4px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Received</span>
              <strong style={{ color: '#60a5fa' }}>{dsr.received || 0}</strong>
            </div>

            <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '0.4rem', borderRadius: '4px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>In Review</span>
              <strong style={{ color: '#c084fc' }}>{dsr.in_review || 0}</strong>
            </div>

            <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '0.4rem', borderRadius: '4px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>In Progress</span>
              <strong style={{ color: '#22d3ee' }}>{dsr.in_progress || 0}</strong>
            </div>

            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '0.4rem', borderRadius: '4px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Completed</span>
              <strong style={{ color: '#4ade80' }}>{dsr.completed || 0}</strong>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.4rem', borderRadius: '4px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Rejected</span>
              <strong style={{ color: '#f87171' }}>{dsr.rejected || 0}</strong>
            </div>

            <div style={{ background: 'rgba(100, 116, 139, 0.1)', padding: '0.4rem', borderRadius: '4px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.7rem' }}>Cancelled</span>
              <strong style={{ color: '#94a3b8' }}>{dsr.cancelled || 0}</strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
