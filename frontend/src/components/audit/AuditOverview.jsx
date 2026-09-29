import React from 'react';

export default function AuditOverview({ audit }) {
  if (!audit) return null;

  const val = (v) => (v !== null && v !== undefined && String(v).trim() !== '' ? v : 'Not provided');

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not provided';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Not provided';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateStr;
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
        return val(type);
    }
  };

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
        return val(status);
    }
  };

  return (
    <div className="overview-container">
      <div className="overview-grid">
        {/* Core Metadata Card */}
        <div className="overview-card">
          <h3 className="card-title">Engagement Info</h3>
          <div className="detail-list">
            <div className="detail-item">
              <span className="detail-label">Audit Code</span>
              <span className="detail-value risk-code">{val(audit.audit_code)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Title</span>
              <span className="detail-value">{val(audit.title)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Audit Type</span>
              <span className="detail-value">{getTypeLabel(audit.audit_type)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className="detail-value">{getStatusLabel(audit.status)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Lead Auditor</span>
              <span className="detail-value">{val(audit.lead_auditor_name || (audit.lead_auditor_id ? `User #${audit.lead_auditor_id}` : null))}</span>
            </div>
          </div>
        </div>

        {/* Schedule & Dates Card */}
        <div className="overview-card">
          <h3 className="card-title">Schedule & Timeline</h3>
          <div className="detail-list">
            <div className="detail-item">
              <span className="detail-label">Planned Start Date</span>
              <span className="detail-value">{formatDate(audit.planned_start_date)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Planned End Date</span>
              <span className="detail-value">{formatDate(audit.planned_end_date)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Actual Start Date</span>
              <span className="detail-value">{formatDate(audit.actual_start_date)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Actual End Date</span>
              <span className="detail-value">{formatDate(audit.actual_end_date)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scope & Objectives Card */}
      <div className="overview-card" style={{ marginTop: '1.25rem' }}>
        <h3 className="card-title">Scope & Objectives</h3>
        <div className="detail-block">
          <div className="detail-group">
            <h4 className="sub-label">Description</h4>
            <p className="detail-text">{val(audit.description)}</p>
          </div>
          <div className="detail-group">
            <h4 className="sub-label">Audit Scope</h4>
            <p className="detail-text">{val(audit.scope)}</p>
          </div>
          <div className="detail-group">
            <h4 className="sub-label">Objectives</h4>
            <p className="detail-text">{val(audit.objectives)}</p>
          </div>
        </div>
      </div>

      {/* System Audit Trail Metadata Card */}
      <div className="overview-card" style={{ marginTop: '1.25rem' }}>
        <h3 className="card-title">System Audit Trail</h3>
        <div className="detail-list grid-2">
          <div className="detail-item">
            <span className="detail-label">Created At</span>
            <span className="detail-value">{formatDateTime(audit.created_at)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Last Updated At</span>
            <span className="detail-value">{formatDateTime(audit.updated_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
