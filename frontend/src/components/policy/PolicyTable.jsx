import React from 'react';

export default function PolicyTable({
  policies = [],
  loading = false,
  error = null,
  onView,
  onEdit,
  onDelete,
  deletingId = null
}) {
  const getStatusLabel = (st) => {
    switch (st) {
      case 'DRAFT': return 'Draft';
      case 'UNDER_REVIEW': return 'Under Review';
      case 'APPROVED': return 'Approved';
      case 'PUBLISHED': return 'Published';
      case 'ARCHIVED': return 'Archived';
      default: return st;
    }
  };

  const getStatusClass = (st) => {
    switch (st) {
      case 'DRAFT': return 'status-planned';
      case 'UNDER_REVIEW': return 'status-in-progress';
      case 'APPROVED': return 'status-reporting';
      case 'PUBLISHED': return 'status-closed';
      case 'ARCHIVED': return 'status-cancelled';
      default: return 'status-planned';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'INFORMATION_SECURITY': return 'Information Security';
      case 'PRIVACY': return 'Privacy';
      case 'ACCESS_CONTROL': return 'Access Control';
      case 'INCIDENT_RESPONSE': return 'Incident Response';
      case 'BUSINESS_CONTINUITY': return 'Business Continuity';
      case 'DATA_RETENTION': return 'Data Retention';
      case 'ACCEPTABLE_USE': return 'Acceptable Use';
      case 'THIRD_PARTY': return 'Third Party';
      case 'OTHER': return 'Other';
      default: return type;
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

  if (loading) {
    return (
      <div className="table-card table-state-container">
        <p className="state-message">Loading organizational policies...</p>
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

  if (!policies || policies.length === 0) {
    return (
      <div className="table-card table-state-container">
        <p className="state-message">No policies found matching the criteria.</p>
      </div>
    );
  }

  return (
    <div className="table-card">
      <table className="risk-table">
        <thead>
          <tr>
            <th>Policy Code</th>
            <th>Title</th>
            <th>Policy Type</th>
            <th>Owner</th>
            <th>Status</th>
            <th>Review Date</th>
            <th>Effective Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((policy) => (
            <tr key={policy.id}>
              <td className="risk-code">{policy.policy_code}</td>
              <td>
                <div style={{ fontWeight: 600, color: '#f8fafc' }}>{policy.title}</div>
                {policy.description && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {policy.description.length > 60 ? `${policy.description.substring(0, 60)}...` : policy.description}
                  </div>
                )}
              </td>
              <td>
                <span className="type-badge">
                  {getTypeLabel(policy.policy_type)}
                </span>
              </td>
              <td>{policy.owner_name || `User #${policy.owner_id}`}</td>
              <td>
                <span className={`status-badge ${getStatusClass(policy.status)}`}>
                  {getStatusLabel(policy.status)}
                </span>
              </td>
              <td>{formatDate(policy.review_date)}</td>
              <td>{formatDate(policy.effective_date)}</td>
              <td>
                <div className="action-buttons">
                  <button
                    className="btn-icon"
                    title="View Policy Details"
                    onClick={() => onView(policy.id)}
                    disabled={deletingId === policy.id}
                  >
                    👁️
                  </button>
                  <button
                    className="btn-icon"
                    title="Edit Policy"
                    onClick={() => onEdit(policy)}
                    disabled={deletingId === policy.id}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon"
                    title="Delete Policy"
                    onClick={() => onDelete(policy.id, policy.policy_code)}
                    disabled={deletingId === policy.id}
                  >
                    {deletingId === policy.id ? '⏳' : '🗑️'}
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
