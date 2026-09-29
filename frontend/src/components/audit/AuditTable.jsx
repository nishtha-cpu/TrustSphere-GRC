import React from 'react';

export default function AuditTable({ audits, loading, error, onEdit, onDelete, onView, deletingId }) {
  const getStatusLabel = (status) => {
    switch (status) {
      case 'PLANNED':
        return 'Planned';
      case 'SCHEDULED':
        return 'Scheduled';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'FIELDWORK_COMPLETE':
        return 'Fieldwork Complete';
      case 'REPORTING':
        return 'Reporting';
      case 'CLOSED':
        return 'Closed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'PLANNED':
        return 'status-planned';
      case 'SCHEDULED':
        return 'status-scheduled';
      case 'IN_PROGRESS':
        return 'status-in-progress';
      case 'FIELDWORK_COMPLETE':
        return 'status-fieldwork';
      case 'REPORTING':
        return 'status-reporting';
      case 'CLOSED':
        return 'status-closed';
      case 'CANCELLED':
        return 'status-cancelled';
      default:
        return 'status-planned';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'INTERNAL':
        return 'Internal';
      case 'EXTERNAL':
        return 'External';
      case 'REGULATORY':
        return 'Regulatory';
      case 'CERTIFICATION':
        return 'Certification';
      default:
        return type;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const handleDeleteClick = (audit) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete audit "${audit.audit_code} - ${audit.title}"?`
    );
    if (confirmed) {
      onDelete(audit.id);
    }
  };

  if (loading) {
    return (
      <div className="table-card table-state-container">
        <p className="state-message">Loading audit engagements from server...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="table-card table-state-container error-state">
        <p className="state-message">Error: {error}</p>
      </div>
    );
  }

  if (!audits || audits.length === 0) {
    return (
      <div className="table-card table-state-container">
        <p className="state-message">No audit engagements found for this tenant.</p>
      </div>
    );
  }

  return (
    <div className="table-card">
      <table className="risk-table">
        <thead>
          <tr>
            <th>Audit Code</th>
            <th>Title</th>
            <th>Type</th>
            <th>Lead Auditor</th>
            <th>Status</th>
            <th>Planned Start</th>
            <th>Planned End</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {audits.map((audit) => (
            <tr key={audit.id}>
              <td className="risk-code">{audit.audit_code}</td>
              <td>
                <div style={{ fontWeight: 600 }}>{audit.title}</div>
                {audit.description && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {audit.description.length > 60 ? `${audit.description.substring(0, 60)}...` : audit.description}
                  </div>
                )}
              </td>
              <td>
                <span className="type-badge">
                  {getTypeLabel(audit.audit_type)}
                </span>
              </td>
              <td>{audit.lead_auditor_name || `User #${audit.lead_auditor_id}`}</td>
              <td>
                <span className={`status-badge ${getStatusClass(audit.status)}`}>
                  {getStatusLabel(audit.status)}
                </span>
              </td>
              <td>{formatDate(audit.planned_start_date)}</td>
              <td>{formatDate(audit.planned_end_date)}</td>
              <td>
                <div className="action-buttons">
                  <button
                    className="btn-icon"
                    title="View Audit Details (Prepared for Step 7B)"
                    onClick={() => onView && onView(audit)}
                  >
                    👁️
                  </button>
                  <button
                    className="btn-icon"
                    title="Edit Audit"
                    onClick={() => onEdit(audit)}
                    disabled={deletingId === audit.id}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon"
                    title="Delete Audit"
                    onClick={() => handleDeleteClick(audit)}
                    disabled={deletingId === audit.id}
                  >
                    {deletingId === audit.id ? '⏳' : '🗑️'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
