import React, { useState, useEffect } from 'react';
import {
  getDSRHistory,
  verifyDSRIdentity,
  assignDSRCase,
  collectDSRData,
  approveDSR,
  generateDSRResponse,
  closeDSR
} from '../../services/dsrService';

const WORKFLOW_STEPS = [
  { id: 'SUBMITTED', label: '1. Submission', key: 1 },
  { id: 'IDENTITY_VERIFICATION', label: '2. Identity Verify', key: 2 },
  { id: 'CASE_ASSIGNED', label: '3. Assignment', key: 3 },
  { id: 'DATA_COLLECTION', label: '4. Collection', key: 4 },
  { id: 'APPROVAL_PENDING', label: '5. Approval', key: 5 },
  { id: 'RESPONSE_GENERATION', label: '6. Response', key: 6 },
  { id: 'CLOSED', label: '7. Closure', key: 7 }
];

export default function DSRDetailsModal({
  dsr,
  users = [],
  onClose,
  onStatusUpdate,
  canManage = true
}) {
  const [activeTab, setActiveTab] = useState('workflow'); // 'workflow' or 'history'
  const [currentDsr, setCurrentDsr] = useState(dsr);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Workflow Action Form States
  const [verificationStatus, setVerificationStatus] = useState(dsr?.verification_status || 'PENDING');
  const [verificationNotes, setVerificationNotes] = useState(dsr?.verification_notes || '');
  const [assignedTo, setAssignedTo] = useState(dsr?.assigned_to || '');
  const [dataCollectionNotes, setDataCollectionNotes] = useState(dsr?.data_collection_notes || '');
  const [approvalStatus, setApprovalStatus] = useState(dsr?.approval_status || 'PENDING');
  const [approvalNotes, setApprovalNotes] = useState(dsr?.approval_notes || '');
  const [responseSummary, setResponseSummary] = useState(dsr?.response_summary || '');
  const [responseFileName, setResponseFileName] = useState(dsr?.response_file_name || '');
  const [resolutionNotes, setResolutionNotes] = useState(dsr?.resolution_notes || '');

  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (dsr) {
      setCurrentDsr(dsr);
      setVerificationStatus(dsr.verification_status || 'PENDING');
      setVerificationNotes(dsr.verification_notes || '');
      setAssignedTo(dsr.assigned_to || '');
      setDataCollectionNotes(dsr.data_collection_notes || '');
      setApprovalStatus(dsr.approval_status || 'PENDING');
      setApprovalNotes(dsr.approval_notes || '');
      setResponseSummary(dsr.response_summary || '');
      setResponseFileName(dsr.response_file_name || '');
      setResolutionNotes(dsr.resolution_notes || '');
      loadHistory(dsr.id);
    }
  }, [dsr]);

  const loadHistory = async (id) => {
    try {
      setLoadingHistory(true);
      const logData = await getDSRHistory(id);
      setHistory(logData);
    } catch (err) {
      console.error('Failed to load DSR history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!dsr) return null;

  const handleAction = async (actionFn, payload, msg) => {
    try {
      setUpdating(true);
      setError(null);
      setSuccessMsg(null);
      const updated = await actionFn(dsr.id, payload);
      setCurrentDsr(updated);
      setSuccessMsg(msg);
      loadHistory(dsr.id);
      if (onStatusUpdate) onStatusUpdate(dsr.id, updated.status, updated.resolution_notes);
    } catch (err) {
      console.error('Workflow Action Error:', err);
      if (err.status === 403) {
        setError('You do not have permission to execute this workflow stage.');
      } else {
        setError(err.message || 'Workflow action failed');
      }
    } finally {
      setUpdating(false);
    }
  };

  const getStepIndex = (st) => {
    switch (st) {
      case 'SUBMITTED':
      case 'RECEIVED': return 1;
      case 'IDENTITY_VERIFICATION': return 2;
      case 'CASE_ASSIGNED':
      case 'IN_REVIEW': return 3;
      case 'DATA_COLLECTION':
      case 'IN_PROGRESS': return 4;
      case 'APPROVAL_PENDING': return 5;
      case 'RESPONSE_GENERATION': return 6;
      case 'CLOSED':
      case 'COMPLETED': return 7;
      default: return 1;
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

  const currentStep = getStepIndex(currentDsr.status);

  return (
    <div className="modal-backdrop">
      <div className="modal-container" style={{ maxWidth: '850px' }}>
        <div className="modal-header" style={{ alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '4px' }}>
              <span className="risk-code audit-code-badge">{currentDsr.request_reference}</span>
              <span className="type-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
                {getTypeLabel(currentDsr.request_type)}
              </span>
            </div>
            <h2 className="modal-title" style={{ fontSize: '1.25rem' }}>{currentDsr.data_subject_identifier}</h2>
          </div>
          <button className="btn-close" onClick={onClose} disabled={updating}>
            &times;
          </button>
        </div>

        {/* BRD 7-Stage Stepper Navigation */}
        <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
            {WORKFLOW_STEPS.map((step) => {
              const isActive = currentStep === step.key;
              const isPast = currentStep > step.key;
              return (
                <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: isActive ? '#3b82f6' : (isPast ? '#10b981' : '#334155'),
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    marginBottom: '4px'
                  }}>
                    {isPast ? '✓' : step.key}
                  </div>
                  <span style={{ fontSize: '0.65rem', color: isActive ? '#60a5fa' : (isPast ? '#34d399' : '#94a3b8'), textAlign: 'center' }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Tab Switcher */}
        <div style={{ display: 'flex', gap: '1rem', padding: '0.75rem 1.5rem', background: 'rgba(30, 41, 59, 0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            className={`tab-btn ${activeTab === 'workflow' ? 'active' : ''}`}
            onClick={() => setActiveTab('workflow')}
            style={{ padding: '0.4rem 1rem', borderRadius: '4px', border: 'none', background: activeTab === 'workflow' ? '#3b82f6' : 'transparent', color: '#fff', cursor: 'pointer' }}
          >
            Workflow Processing
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            style={{ padding: '0.4rem 1rem', borderRadius: '4px', border: 'none', background: activeTab === 'history' ? '#3b82f6' : 'transparent', color: '#fff', cursor: 'pointer' }}
          >
            Immutable Audit Trail ({history.length})
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {error && (
            <div className="alert-error" style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171' }}>
              {error}
            </div>
          )}

          {successMsg && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399' }}>
              ✓ {successMsg}
            </div>
          )}

          {activeTab === 'workflow' ? (
            <div>
              {/* Overview Card */}
              <div className="overview-card" style={{ marginBottom: '1.25rem' }}>
                <h3 className="card-title">Data Principal Request Overview</h3>
                <div className="detail-list grid-2">
                  <div className="detail-item">
                    <span className="detail-label">Data Principal Identifier</span>
                    <span className="detail-value">{currentDsr.data_subject_identifier}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Request Reference</span>
                    <span className="detail-value risk-code">{currentDsr.request_reference}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Statutory Due Date</span>
                    <span className="detail-value">{currentDsr.due_at || '—'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Assigned Handler</span>
                    <span className="detail-value">{currentDsr.assigned_to_name || 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              {/* 1. Identity Verification Section */}
              <div className="overview-card" style={{ marginBottom: '1rem', background: 'rgba(15, 23, 42, 0.6)' }}>
                <h3 className="card-title" style={{ color: '#60a5fa' }}>Stage 2: Identity Verification</h3>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Verification Status</label>
                    <select
                      className="form-input"
                      value={verificationStatus}
                      onChange={(e) => setVerificationStatus(e.target.value)}
                      disabled={!canManage || updating}
                    >
                      <option value="PENDING">PENDING (Awaiting Confirmation)</option>
                      <option value="VERIFIED">VERIFIED (Identity Confirmed)</option>
                      <option value="FAILED">FAILED (Verification Rejected)</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Verification Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder="e.g. Email ownership confirmed via OTP / Auth token matched"
                    disabled={!canManage || updating}
                  />
                </div>
                {canManage && (
                  <button
                    className="btn-primary"
                    style={{ fontSize: '0.85rem' }}
                    onClick={() => handleAction(verifyDSRIdentity, { verification_status: verificationStatus, notes: verificationNotes }, 'Identity verification status updated.')}
                    disabled={updating}
                  >
                    Save Verification Stage
                  </button>
                )}
              </div>

              {/* 2. Case Assignment Section */}
              <div className="overview-card" style={{ marginBottom: '1rem', background: 'rgba(15, 23, 42, 0.6)' }}>
                <h3 className="card-title" style={{ color: '#60a5fa' }}>Stage 3: Case Assignment</h3>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Assign Privacy Handler</label>
                    <select
                      className="form-input"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      disabled={!canManage || updating}
                    >
                      <option value="">Select Handler User...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {canManage && (
                  <button
                    className="btn-primary"
                    style={{ fontSize: '0.85rem' }}
                    onClick={() => handleAction(assignDSRCase, { assigned_to: Number(assignedTo) }, 'Case assigned successfully.')}
                    disabled={updating || !assignedTo}
                  >
                    Assign Case
                  </button>
                )}
              </div>

              {/* 3. Data Collection Section */}
              <div className="overview-card" style={{ marginBottom: '1rem', background: 'rgba(15, 23, 42, 0.6)' }}>
                <h3 className="card-title" style={{ color: '#60a5fa' }}>Stage 4: Data Collection</h3>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Data Collection Notes / PII Discovery Findings</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={dataCollectionNotes}
                    onChange={(e) => setDataCollectionNotes(e.target.value)}
                    placeholder="Document systems searched, databases queried, or PII records located..."
                    disabled={!canManage || updating}
                  />
                </div>
                {canManage && (
                  <button
                    className="btn-primary"
                    style={{ fontSize: '0.85rem' }}
                    onClick={() => handleAction(collectDSRData, { data_collection_notes: dataCollectionNotes }, 'Data collection recorded.')}
                    disabled={updating || !dataCollectionNotes.trim()}
                  >
                    Save Data Collection Stage
                  </button>
                )}
              </div>

              {/* 4. Approval Gate Section */}
              <div className="overview-card" style={{ marginBottom: '1rem', background: 'rgba(15, 23, 42, 0.6)' }}>
                <h3 className="card-title" style={{ color: '#60a5fa' }}>Stage 5: Approval Gate</h3>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Approval Decision</label>
                    <select
                      className="form-input"
                      value={approvalStatus}
                      onChange={(e) => setApprovalStatus(e.target.value)}
                      disabled={!canManage || updating}
                    >
                      <option value="PENDING">PENDING (Awaiting Approver Sign-Off)</option>
                      <option value="APPROVED">APPROVED (Fulfillment Approved)</option>
                      <option value="REJECTED">REJECTED (Lawful Exemption Applied)</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Approval Justification Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    placeholder="Approver notes or legal exemption rationale..."
                    disabled={!canManage || updating}
                  />
                </div>
                {canManage && (
                  <button
                    className="btn-primary"
                    style={{ fontSize: '0.85rem' }}
                    onClick={() => handleAction(approveDSR, { approval_status: approvalStatus, approval_notes: approvalNotes }, 'Approval status updated.')}
                    disabled={updating || approvalStatus === 'PENDING'}
                  >
                    Submit Approval Decision
                  </button>
                )}
              </div>

              {/* 5. Response Generation & Closure Section */}
              <div className="overview-card" style={{ marginBottom: '1rem', background: 'rgba(15, 23, 42, 0.6)' }}>
                <h3 className="card-title" style={{ color: '#60a5fa' }}>Stage 6 & 7: Response & Closure</h3>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Response Summary / Resolution Package</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={responseSummary}
                    onChange={(e) => setResponseSummary(e.target.value)}
                    placeholder="Summary of response sent to data principal or export details..."
                    disabled={!canManage || updating}
                  />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Response Export Document Name (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={responseFileName}
                    onChange={(e) => setResponseFileName(e.target.value)}
                    placeholder="e.g. data_export_subject_102.zip"
                    disabled={!canManage || updating}
                  />
                </div>
                {canManage && (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: '0.85rem' }}
                      onClick={() => handleAction(generateDSRResponse, { response_summary: responseSummary, response_file_name: responseFileName }, 'Response package saved.')}
                      disabled={updating || !responseSummary.trim()}
                    >
                      Save Response Package
                    </button>
                    <button
                      className="btn-primary"
                      style={{ fontSize: '0.85rem', background: '#10b981' }}
                      onClick={() => handleAction(closeDSR, { resolution_notes: resolutionNotes || responseSummary }, 'DSR case closed.')}
                      disabled={updating}
                    >
                      ✓ Close Case
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Immutable Audit History Log */
            <div className="overview-card">
              <h3 className="card-title">Immutable State Transition Audit Log</h3>
              {loadingHistory ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading history log...</p>
              ) : history.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No audit history records found.</p>
              ) : (
                <div className="timeline-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {history.map((log) => (
                    <div key={log.id} style={{ padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '4px', borderLeft: '3px solid #3b82f6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#60a5fa', fontSize: '0.85rem' }}>{log.action}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.performed_at}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#e2e8f0', marginBottom: '2px' }}>
                        Transition: <code>{log.previous_status}</code> &rarr; <code>{log.new_status}</code>
                      </div>
                      {log.performer_name && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Performed by: {log.performer_name} ({log.performer_email})
                        </div>
                      )}
                      {log.notes && (
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>
                          "{log.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
