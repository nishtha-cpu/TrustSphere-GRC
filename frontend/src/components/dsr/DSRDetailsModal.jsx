import React, { useState, useEffect } from 'react';

export default function DSRDetailsModal({
  dsr,
  users = [],
  onClose,
  onStatusUpdate,
  canManage = true
}) {
  const [status, setStatus] = useState(dsr?.status || 'RECEIVED');
  const [resolutionNotes, setResolutionNotes] = useState(dsr?.resolution_notes || '');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (dsr) {
      setStatus(dsr.status || 'RECEIVED');
      setResolutionNotes(dsr.resolution_notes || '');
    }
  }, [dsr]);

  if (!dsr) return null;

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      setError(null);
      await onStatusUpdate(dsr.id, status, resolutionNotes);
      onClose();
    } catch (err) {
      console.error('Failed to update DSR status:', err);
      if (err.status === 403) {
        setError('You do not have permission to update DSR status.');
      } else {
        setError(err.message || 'Failed to update request status');
      }
    } finally {
      setUpdating(false);
    }
  };

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
      case 'ERASURE': return 'Right to Erasure';
      case 'RESTRICTION': return 'Restriction of Processing';
      case 'PORTABILITY': return 'Data Portability';
      case 'OBJECTION': return 'Right to Object';
      default: return type;
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

  return (
    <div className="modal-backdrop">
      <div className="modal-container" style={{ maxWidth: '700px' }}>
        <div className="modal-header" style={{ alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '4px' }}>
              <span className="risk-code audit-code-badge">{dsr.request_reference}</span>
              <span className={`status-badge ${getStatusClass(dsr.status)}`}>
                {getStatusLabel(dsr.status)}
              </span>
              <span className="type-badge">
                {getTypeLabel(dsr.request_type)}
              </span>
            </div>
            <h2 className="modal-title" style={{ fontSize: '1.25rem' }}>{dsr.data_subject_identifier}</h2>
          </div>
          <button className="btn-close" onClick={onClose} disabled={updating}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert-error" style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171' }}>
              {error}
            </div>
          )}

          {/* Key Overview Grid */}
          <div className="overview-card" style={{ marginBottom: '1.25rem' }}>
            <h3 className="card-title">Request Overview</h3>
            <div className="detail-list grid-2">
              <div className="detail-item">
                <span className="detail-label">Data Subject Identifier</span>
                <span className="detail-value">{dsr.data_subject_identifier}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Request Reference</span>
                <span className="detail-value risk-code">{dsr.request_reference}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Received At</span>
                <span className="detail-value">{formatDateTime(dsr.received_at)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Statutory Due Date</span>
                <span className="detail-value">{formatDateTime(dsr.due_at)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Assigned Handler</span>
                <span className="detail-value">{dsr.assigned_to_name || 'Unassigned'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Completion Date</span>
                <span className="detail-value">{formatDateTime(dsr.completed_at)}</span>
              </div>
            </div>
          </div>

          {/* Description & Scope */}
          <div className="overview-card" style={{ marginBottom: '1.25rem' }}>
            <h3 className="card-title">Description & Scope</h3>
            <p className="detail-text">
              {dsr.description || 'No additional scope details provided.'}
            </p>
          </div>

          {/* Status Update & Resolution Section */}
          {canManage && (
            <form onSubmit={handleUpdateStatus} className="overview-card" style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <h3 className="card-title" style={{ color: '#60a5fa' }}>Lifecycle Status Transition</h3>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Update Request Lifecycle Status</label>
                <select
                  className="form-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={updating}
                >
                  <option value="RECEIVED">RECEIVED (Initial Receipt)</option>
                  <option value="IN_REVIEW">IN_REVIEW (Identity / Scope Verification)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Fulfillment Underway)</option>
                  <option value="COMPLETED">COMPLETED (Fulfills Request)</option>
                  <option value="REJECTED">REJECTED (Lawful Exemption Applied)</option>
                  <option value="CANCELLED">CANCELLED (Withdrawn by Data Subject)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Resolution Notes / Exemption Justification</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Record fulfillment details, data export links, or legal justification if rejected..."
                  disabled={updating}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={updating}
                >
                  {updating ? 'Updating...' : 'Save Status Update'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
