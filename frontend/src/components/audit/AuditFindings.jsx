import React, { useState, useEffect } from 'react';
import AuditFindingForm from './AuditFindingForm';
import {
  getAuditFindings,
  createAuditFinding,
  updateFinding,
  deleteFinding
} from '../../services/auditFindingService';

export default function AuditFindings({ auditId }) {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadFindings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAuditFindings(auditId, 1);
      setFindings(data);
    } catch (err) {
      console.error('Failed to load audit findings:', err);
      setError(err.message || 'Failed to load audit findings from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auditId) {
      loadFindings();
    }
  }, [auditId]);

  const handleOpenCreate = () => {
    setSelectedFinding(null);
    setShowForm(true);
  };

  const handleOpenEdit = (finding) => {
    setSelectedFinding(finding);
    setShowForm(true);
  };

  const handleDeleteFinding = async (id, code) => {
    if (deletingId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete finding "${code}"?`
    );
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await deleteFinding(id, 1);
      await loadFindings();
    } catch (err) {
      console.error('Failed to delete finding:', err);
      alert(err.message || 'Failed to delete audit finding');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFormSubmit = async (formData) => {
    if (selectedFinding && selectedFinding.id) {
      await updateFinding(selectedFinding.id, formData);
    } else {
      await createAuditFinding(auditId, formData);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedFinding(null);
    loadFindings();
  };

  const getSeverityLabel = (sev) => {
    switch (sev) {
      case 'LOW': return 'Low';
      case 'MEDIUM': return 'Medium';
      case 'HIGH': return 'High';
      case 'CRITICAL': return 'Critical';
      default: return sev;
    }
  };

  const getSeverityClass = (sev) => {
    switch (sev) {
      case 'LOW': return 'sev-low';
      case 'MEDIUM': return 'sev-medium';
      case 'HIGH': return 'sev-high';
      case 'CRITICAL': return 'sev-critical';
      default: return 'sev-medium';
    }
  };

  const getStatusLabel = (st) => {
    switch (st) {
      case 'DRAFT': return 'Draft';
      case 'OPEN': return 'Open';
      case 'IN_REMEDIATION': return 'In Remediation';
      case 'UNDER_REVIEW': return 'Under Review';
      case 'CLOSED': return 'Closed';
      default: return st;
    }
  };

  const getStatusClass = (st) => {
    switch (st) {
      case 'DRAFT': return 'status-planned';
      case 'OPEN': return 'status-cancelled';
      case 'IN_REMEDIATION': return 'status-in-progress';
      case 'UNDER_REVIEW': return 'status-fieldwork';
      case 'CLOSED': return 'status-closed';
      default: return 'status-planned';
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

  return (
    <div className="findings-container">
      <div className="action-bar" style={{ marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
            Audit Findings & Deficiencies
          </h3>
        </div>
        <button className="btn-primary" onClick={handleOpenCreate}>
          <span>+</span> Add Finding
        </button>
      </div>

      {loading && (
        <div className="table-card table-state-container">
          <p className="state-message">Loading findings...</p>
        </div>
      )}

      {error && (
        <div className="table-card table-state-container error-state">
          <p className="state-message">Error: {error}</p>
        </div>
      )}

      {!loading && !error && (!findings || findings.length === 0) && (
        <div className="table-card table-state-container">
          <p className="state-message">No findings have been recorded for this audit.</p>
        </div>
      )}

      {!loading && !error && findings && findings.length > 0 && (
        <div className="table-card">
          <table className="risk-table">
            <thead>
              <tr>
                <th>Finding Code</th>
                <th>Title & Description</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Related Risk (Traceability)</th>
                <th>Identified By</th>
                <th>Identified Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((finding) => (
                <tr key={finding.id}>
                  <td className="risk-code">{finding.finding_code}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#f8fafc' }}>{finding.title}</div>
                    {finding.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {finding.description.length > 70 ? `${finding.description.substring(0, 70)}...` : finding.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${getSeverityClass(finding.severity)}`}>
                      {getSeverityLabel(finding.severity)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(finding.status)}`}>
                      {getStatusLabel(finding.status)}
                    </span>
                  </td>
                  <td>
                    {finding.risk_id && finding.risk_code ? (
                      <div>
                        <span className="risk-code" style={{ fontSize: '0.8rem' }}>{finding.risk_code}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{finding.risk_title}</div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No related risk</span>
                    )}
                  </td>
                  <td>{finding.identified_by_name || `User #${finding.identified_by}`}</td>
                  <td>{formatDate(finding.identified_date)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon"
                        title="Edit Finding"
                        onClick={() => handleOpenEdit(finding)}
                        disabled={deletingId === finding.id}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon"
                        title="Delete Finding"
                        onClick={() => handleDeleteFinding(finding.id, finding.finding_code)}
                        disabled={deletingId === finding.id}
                      >
                        {deletingId === finding.id ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AuditFindingForm
          auditId={auditId}
          initialData={selectedFinding}
          onClose={() => { setShowForm(false); setSelectedFinding(null); }}
          onSuccess={handleFormSuccess}
          onSubmitForm={handleFormSubmit}
        />
      )}
    </div>
  );
}
