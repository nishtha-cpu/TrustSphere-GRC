import React from 'react';

export default function ConsentTable({
  consents = [],
  loading = false,
  error = null,
  onView,
  onWithdraw,
  withdrawingId = null,
  canWithdraw = true
}) {
  const getStatusLabel = (st) => {
    switch (st) {
      case 'GRANTED': return 'Granted';
      case 'DENIED': return 'Denied';
      case 'WITHDRAWN': return 'Withdrawn';
      default: return st;
    }
  };

  const getStatusClass = (st) => {
    switch (st) {
      case 'GRANTED': return 'status-closed';
      case 'DENIED': return 'status-cancelled';
      case 'WITHDRAWN': return 'status-in-progress';
      default: return 'status-planned';
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="table-card table-state-container">
        <p className="state-message">Loading consent records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="table-card table-state-container error-state">
        <p className="state-message">{error}</p>
      </div>
    );
  }

  if (!consents || consents.length === 0) {
    return (
      <div className="table-card table-state-container">
        <p className="state-message">No consent records found matching the criteria.</p>
      </div>
    );
  }

  return (
    <div className="table-card">
      <table className="risk-table">
        <thead>
          <tr>
            <th>Data Subject</th>
            <th>Purpose</th>
            <th>Status</th>
            <th>Version</th>
            <th>Source</th>
            <th>Collected At</th>
            <th>Withdrawn At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {consents.map((consent) => (
            <tr key={consent.id}>
              <td>
                <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                  {consent.data_subject_identifier}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {consent.data_subject_type === 'APPLICATION_USER'
                    ? `App User (ID #${consent.user_id || 'N/A'})`
                    : 'External Subject'}
                </div>
              </td>
              <td>
                <div style={{ fontWeight: 500, color: '#e2e8f0' }}>
                  {consent.purpose_name || `Purpose #${consent.purpose_id}`}
                </div>
                <div className="risk-code" style={{ fontSize: '0.75rem' }}>
                  {consent.purpose_code || ''}
                </div>
              </td>
              <td>
                <span className={`status-badge ${getStatusClass(consent.status)}`}>
                  {getStatusLabel(consent.status)}
                </span>
              </td>
              <td>
                <span className="risk-code" style={{ fontSize: '0.8rem' }}>v{consent.consent_version}</span>
              </td>
              <td>
                <span style={{ fontSize: '0.85rem' }}>{consent.source || 'N/A'}</span>
              </td>
              <td style={{ fontSize: '0.85rem' }}>{formatDateTime(consent.collected_at || consent.created_at)}</td>
              <td style={{ fontSize: '0.85rem' }}>{formatDateTime(consent.withdrawn_at)}</td>
              <td>
                <div className="action-buttons">
                  <button
                    className="btn-icon"
                    title="View Consent Details & History"
                    onClick={() => onView && onView(consent.id)}
                  >
                    👁️
                  </button>

                  {canWithdraw && consent.status === 'GRANTED' && (
                    <button
                      className="btn-icon"
                      title="Withdraw Consent"
                      onClick={() => onWithdraw && onWithdraw(consent.id, consent.data_subject_identifier)}
                      disabled={withdrawingId === consent.id}
                      style={{ color: '#f87171' }}
                    >
                      {withdrawingId === consent.id ? '⏳' : '🚫'}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
