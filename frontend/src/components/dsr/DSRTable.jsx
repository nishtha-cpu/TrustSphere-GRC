import React from 'react';

export default function DSRTable({
  dsrs = [],
  loading = false,
  error = null,
  onView,
  onUpdateStatus,
  onDelete,
  deletingId = null,
  canManage = true
}) {
  const getStatusLabel = (st) => {
    switch (st) {
      case 'RECEIVED': return 'Received';
      case 'IN_REVIEW': return 'In Review';
      case 'IN_PROGRESS': return 'In Progress';
      case 'COMPLETED': return 'Completed';
      case 'REJECTED': return 'Rejected';
      case 'CANCELLED': return 'Cancelled';
      default: return st;
    }
  };

  const getStatusClass = (st) => {
    switch (st) {
      case 'RECEIVED': return 'status-planned';
      case 'IN_REVIEW': return 'status-in-progress';
      case 'IN_PROGRESS': return 'status-in-progress';
      case 'COMPLETED': return 'status-closed';
      case 'REJECTED': return 'status-cancelled';
      case 'CANCELLED': return 'status-cancelled';
      default: return 'status-planned';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'ACCESS': return 'Right to Access';
      case 'RECTIFICATION': return 'Right to Rectification';
      case 'ERASURE': return 'Right to Erasure (RTBF)';
      case 'RESTRICTION': return 'Restriction of Processing';
      case 'PORTABILITY': return 'Data Portability';
      case 'OBJECTION': return 'Right to Object';
      default: return type;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const isOverdue = (dueStr, status) => {
    if (!dueStr || ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(status)) return false;
    try {
      const dueDate = new Date(dueStr);
      return dueDate.getTime() < Date.now();
    } catch (e) {
      return false;
    }
  };

  if (loading) {
    return (
      <div className="table-card table-state-container">
        <p className="state-message">Loading Data Subject Requests...</p>
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

  if (!dsrs || dsrs.length === 0) {
    return (
      <div className="table-card table-state-container">
        <p className="state-message">No Data Subject Requests found matching the criteria.</p>
      </div>
    );
  }

  return (
    <div className="table-card">
      <table className="risk-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Data Subject</th>
            <th>Request Type</th>
            <th>Status</th>
            <th>Received At</th>
            <th>Due Date</th>
            <th>Assigned To</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {dsrs.map((dsr) => (
            <tr key={dsr.id}>
              <td className="risk-code">{dsr.request_reference}</td>
              <td>
                <div style={{ fontWeight: 600, color: '#f8fafc' }}>{dsr.data_subject_identifier}</div>
                {dsr.user_name && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    App User: {dsr.user_name}
                  </div>
                )}
              </td>
              <td>
                <span className="type-badge" style={{ fontSize: '0.75rem' }}>
                  {getTypeLabel(dsr.request_type)}
                </span>
              </td>
              <td>
                <span className={`status-badge ${getStatusClass(dsr.status)}`}>
                  {getStatusLabel(dsr.status)}
                </span>
              </td>
              <td style={{ fontSize: '0.85rem' }}>{formatDate(dsr.received_at)}</td>
              <td style={{ fontSize: '0.85rem', color: isOverdue(dsr.due_at, dsr.status) ? '#f87171' : 'inherit', fontWeight: isOverdue(dsr.due_at, dsr.status) ? 700 : 400 }}>
                {formatDate(dsr.due_at)} {isOverdue(dsr.due_at, dsr.status) && '⚠️'}
              </td>
              <td style={{ fontSize: '0.85rem' }}>{dsr.assigned_to_name || 'Unassigned'}</td>
              <td>
                <div className="action-buttons">
                  <button
                    className="btn-icon"
                    title="View Request Details"
                    onClick={() => onView && onView(dsr)}
                  >
                    👁️
                  </button>
                  {canManage && (
                    <button
                      className="btn-icon"
                      title="Update Status"
                      onClick={() => onUpdateStatus && onUpdateStatus(dsr)}
                    >
                      🔄
                    </button>
                  )}
                  {canManage && onDelete && (
                    <button
                      className="btn-icon"
                      title="Delete Request"
                      onClick={() => onDelete(dsr.id, dsr.request_reference)}
                      disabled={deletingId === dsr.id}
                    >
                      {deletingId === dsr.id ? '⏳' : '🗑️'}
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
