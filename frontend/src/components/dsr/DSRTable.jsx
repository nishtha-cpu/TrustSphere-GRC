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
      case 'SUBMITTED': return '1. Submitted';
      case 'RECEIVED': return '1. Received';
      case 'IDENTITY_VERIFICATION': return '2. Identity Verification';
      case 'CASE_ASSIGNED': return '3. Case Assigned';
      case 'IN_REVIEW': return '3. In Review';
      case 'DATA_COLLECTION': return '4. Data Collection';
      case 'IN_PROGRESS': return '4. In Progress';
      case 'APPROVAL_PENDING': return '5. Approval Pending';
      case 'RESPONSE_GENERATION': return '6. Response Generation';
      case 'CLOSED': return '7. Closed';
      case 'COMPLETED': return '7. Completed';
      case 'REJECTED': return 'Rejected';
      case 'CANCELLED': return 'Cancelled';
      default: return st;
    }
  };

  const getStatusClass = (st) => {
    switch (st) {
      case 'SUBMITTED':
      case 'RECEIVED': return 'status-planned';
      case 'IDENTITY_VERIFICATION':
      case 'CASE_ASSIGNED':
      case 'IN_REVIEW':
      case 'DATA_COLLECTION':
      case 'IN_PROGRESS':
      case 'APPROVAL_PENDING':
      case 'RESPONSE_GENERATION': return 'status-in-progress';
      case 'CLOSED':
      case 'COMPLETED': return 'status-closed';
      case 'REJECTED':
      case 'CANCELLED': return 'status-cancelled';
      default: return 'status-planned';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'ACCESS': return 'Right to Access';
      case 'CORRECTION': return 'Right to Correction';
      case 'RECTIFICATION': return 'Right to Rectification';
      case 'ERASURE': return 'Right to Erasure';
      case 'CONSENT_WITHDRAWAL': return 'Consent Withdrawal';
      case 'GRIEVANCE': return 'Grievance Management';
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
    if (!dueStr || ['CLOSED', 'COMPLETED', 'REJECTED', 'CANCELLED'].includes(status)) return false;
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
        <p className="state-message">Loading Data Subject / Principal Requests...</p>
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
        <p className="state-message">No Data Subject / Principal Requests found matching the criteria.</p>
      </div>
    );
  }

  return (
    <div className="table-card">
      <table className="risk-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Data Principal</th>
            <th>Right Requested</th>
            <th>Workflow Stage</th>
            <th>Received At</th>
            <th>Due Date</th>
            <th>Assigned Handler</th>
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
                    User: {dsr.user_name}
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
                    title="View & Process Workflow"
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
