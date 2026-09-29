import React from 'react';

export default function ConsentHistory({ history = [], loading = false, error = null }) {
  const getStatusLabel = (st) => {
    if (!st) return 'N/A';
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
      return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="overview-card" style={{ marginTop: '1.5rem' }}>
        <h3 className="card-title">Immutable Audit Trail</h3>
        <p className="state-message" style={{ padding: '1rem 0' }}>Loading consent audit history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="overview-card" style={{ marginTop: '1.5rem' }}>
        <h3 className="card-title">Immutable Audit Trail</h3>
        <p className="state-message error-state" style={{ padding: '1rem 0', color: '#f87171' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="overview-card" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 className="card-title" style={{ marginBottom: '4px' }}>🔒 Immutable Audit History</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            System audit log entries are append-only and cryptographically verified. No entries can be edited or deleted.
          </p>
        </div>
        <span className="type-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          Append-Only Log
        </span>
      </div>

      {!history || history.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0.5rem 0' }}>
          No audit history records available for this consent entry.
        </p>
      ) : (
        <div className="table-card" style={{ boxShadow: 'none', background: 'transparent' }}>
          <table className="risk-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Status Transition</th>
                <th>Source</th>
                <th>Performed By</th>
                <th>Timestamp</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td>
                    <span className="risk-code" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                      {item.action || 'RECORD_UPDATED'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {item.previous_status ? (
                        <span className={`status-badge ${getStatusClass(item.previous_status)}`} style={{ fontSize: '0.75rem', padding: '2px 6px' }}>
                          {getStatusLabel(item.previous_status)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>[Initial]</span>
                      )}
                      <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
                      <span className={`status-badge ${getStatusClass(item.new_status)}`} style={{ fontSize: '0.75rem', padding: '2px 6px' }}>
                        {getStatusLabel(item.new_status)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem' }}>{item.source || 'SYSTEM'}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem' }}>
                      {item.performed_by_name || (item.performed_by ? `User #${item.performed_by}` : 'System / Self')}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                    {formatDateTime(item.performed_at || item.created_at)}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {item.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
