import React from 'react';

export default function PurposeTable({
  purposes = [],
  loading = false,
  error = null,
  onView,
  onEdit,
  onArchive,
  archivingId = null,
  canEdit = true,
  canArchive = true
}) {
  const getStatusLabel = (st) => {
    switch (st) {
      case 'ACTIVE': return 'Active';
      case 'INACTIVE': return 'Inactive';
      case 'ARCHIVED': return 'Archived';
      default: return st;
    }
  };

  const getStatusClass = (st) => {
    switch (st) {
      case 'ACTIVE': return 'status-closed';
      case 'INACTIVE': return 'status-planned';
      case 'ARCHIVED': return 'status-cancelled';
      default: return 'status-planned';
    }
  };

  const getLegalBasisLabel = (lb) => {
    switch (lb) {
      case 'CONSENT': return 'Consent (Art. 6(1)(a))';
      case 'CONTRACT': return 'Contract (Art. 6(1)(b))';
      case 'LEGAL_OBLIGATION': return 'Legal Obligation (Art. 6(1)(c))';
      case 'VITAL_INTERESTS': return 'Vital Interests (Art. 6(1)(d))';
      case 'PUBLIC_TASK': return 'Public Task (Art. 6(1)(e))';
      case 'LEGITIMATE_INTERESTS': return 'Legitimate Interests (Art. 6(1)(f))';
      default: return lb;
    }
  };

  if (loading) {
    return (
      <div className="table-card table-state-container">
        <p className="state-message">Loading consent processing purposes...</p>
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

  if (!purposes || purposes.length === 0) {
    return (
      <div className="table-card table-state-container">
        <p className="state-message">No consent purposes found matching the criteria.</p>
      </div>
    );
  }

  return (
    <div className="table-card">
      <table className="risk-table">
        <thead>
          <tr>
            <th>Purpose Code</th>
            <th>Name</th>
            <th>Legal Basis</th>
            <th>Version</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {purposes.map((purpose) => (
            <tr key={purpose.id}>
              <td className="risk-code">{purpose.purpose_code}</td>
              <td>
                <div style={{ fontWeight: 600, color: '#f8fafc' }}>{purpose.name}</div>
                {purpose.description && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {purpose.description.length > 70 ? `${purpose.description.substring(0, 70)}...` : purpose.description}
                  </div>
                )}
              </td>
              <td>
                <span className="type-badge" style={{ fontSize: '0.75rem' }}>
                  {getLegalBasisLabel(purpose.legal_basis)}
                </span>
              </td>
              <td>
                <span className="risk-code" style={{ fontSize: '0.8rem' }}>v{purpose.version}</span>
              </td>
              <td>
                <span className={`status-badge ${getStatusClass(purpose.status)}`}>
                  {getStatusLabel(purpose.status)}
                </span>
              </td>
              <td>
                <div className="action-buttons">
                  <button
                    className="btn-icon"
                    title="View Purpose Details"
                    onClick={() => onView && onView(purpose)}
                  >
                    👁️
                  </button>

                  {canEdit && purpose.status !== 'ARCHIVED' && (
                    <button
                      className="btn-icon"
                      title="Edit Purpose"
                      onClick={() => onEdit && onEdit(purpose)}
                      disabled={archivingId === purpose.id}
                    >
                      ✏️
                    </button>
                  )}

                  {canArchive && purpose.status !== 'ARCHIVED' && (
                    <button
                      className="btn-icon"
                      title="Archive Purpose"
                      onClick={() => onArchive && onArchive(purpose)}
                      disabled={archivingId === purpose.id}
                    >
                      {archivingId === purpose.id ? '⏳' : '📁'}
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
