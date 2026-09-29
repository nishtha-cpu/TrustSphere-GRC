import React, { useState, useEffect } from 'react';
import AuditCapaForm from './AuditCapaForm';
import { getAuditFindings } from '../../services/auditFindingService';
import {
  getCapasByFinding,
  createCapa,
  updateCapa,
  deleteCapa
} from '../../services/capaService';

export default function AuditCapa({ auditId }) {
  const [findings, setFindings] = useState([]);
  const [capasMap, setCapasMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [selectedFindingId, setSelectedFindingId] = useState(null);
  const [selectedCapa, setSelectedCapa] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadData = async () => {
    if (!auditId) return;

    try {
      setLoading(true);
      setError(null);

      // 1. Load audit findings
      const auditFindings = await getAuditFindings(auditId, 1);
      setFindings(auditFindings || []);

      // 2. Load CAPAs for each finding
      if (auditFindings && auditFindings.length > 0) {
        const capaResults = await Promise.all(
          auditFindings.map(async (finding) => {
            try {
              const list = await getCapasByFinding(finding.id, 1);
              return { findingId: finding.id, list };
            } catch (err) {
              console.error(`Failed to load CAPAs for finding ${finding.id}:`, err);
              return { findingId: finding.id, list: [] };
            }
          })
        );

        const newMap = {};
        capaResults.forEach(res => {
          newMap[res.findingId] = res.list;
        });
        setCapasMap(newMap);
      } else {
        setCapasMap({});
      }
    } catch (err) {
      console.error('Failed to load audit CAPA data:', err);
      setError(err.message || 'Failed to load CAPAs from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [auditId]);

  const handleOpenCreate = (findingId = null) => {
    setSelectedFindingId(findingId);
    setSelectedCapa(null);
    setShowForm(true);
  };

  const handleOpenEdit = (capa) => {
    setSelectedCapa(capa);
    setSelectedFindingId(capa.finding_id);
    setShowForm(true);
  };

  const handleDeleteCapa = async (capaId, capaCode) => {
    if (deletingId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete CAPA "${capaCode}"?`
    );
    if (!confirmed) return;

    try {
      setDeletingId(capaId);
      await deleteCapa(capaId, 1);
      await loadData();
    } catch (err) {
      console.error('Failed to delete CAPA:', err);
      alert(err.message || 'Failed to delete CAPA');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFormSubmit = async (formData) => {
    if (selectedCapa && selectedCapa.id) {
      await updateCapa(selectedCapa.id, formData);
    } else {
      await createCapa(formData.finding_id, formData);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedCapa(null);
    setSelectedFindingId(null);
    loadData();
  };

  const getCapaStatusLabel = (st) => {
    switch (st) {
      case 'ASSIGNED': return 'Assigned';
      case 'IN_PROGRESS': return 'In Progress';
      case 'SUBMITTED': return 'Submitted';
      case 'VERIFIED': return 'Verified';
      case 'CLOSED': return 'Closed';
      default: return st;
    }
  };

  const getCapaStatusClass = (st) => {
    switch (st) {
      case 'ASSIGNED': return 'status-planned';
      case 'IN_PROGRESS': return 'status-in-progress';
      case 'SUBMITTED': return 'status-fieldwork';
      case 'VERIFIED': return 'status-reporting';
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
    <div className="capa-container">
      <div className="action-bar" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
            Corrective Actions (CAPA)
          </h3>
        </div>
        {findings && findings.length > 0 && (
          <button className="btn-primary" onClick={() => handleOpenCreate()}>
            <span>+</span> Add CAPA
          </button>
        )}
      </div>

      {loading && (
        <div className="table-card table-state-container">
          <p className="state-message">Loading CAPAs...</p>
        </div>
      )}

      {error && (
        <div className="table-card table-state-container error-state">
          <p className="state-message">Error: {error}</p>
        </div>
      )}

      {!loading && !error && (!findings || findings.length === 0) && (
        <div className="table-card table-state-container">
          <p className="state-message">No findings exist for this audit. Create a finding before adding a CAPA.</p>
        </div>
      )}

      {!loading && !error && findings && findings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {findings.map((finding) => {
            const capas = capasMap[finding.id] || [];

            return (
              <div key={finding.id} className="capa-finding-card">
                <div className="capa-finding-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span className="risk-code">{finding.finding_code}</span>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                      {finding.title}
                    </h4>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      onClick={() => handleOpenCreate(finding.id)}
                    >
                      + Add CAPA
                    </button>
                  </div>
                </div>

                {capas.length === 0 ? (
                  <div className="capa-empty-finding">
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      No corrective actions assigned.
                    </p>
                  </div>
                ) : (
                  <div className="table-card" style={{ border: 'none', background: 'transparent' }}>
                    <table className="risk-table">
                      <thead>
                        <tr>
                          <th>CAPA Code</th>
                          <th>Action Plan</th>
                          <th>Owner</th>
                          <th>Due Date</th>
                          <th>Status</th>
                          <th>Completion & Sign-off</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {capas.map((capa) => (
                          <tr key={capa.id}>
                            <td className="risk-code" style={{ fontSize: '0.85rem' }}>
                              {capa.capa_code}
                            </td>
                            <td>
                              <div style={{ fontWeight: 500, color: '#f8fafc', fontSize: '0.875rem' }}>
                                {capa.action_plan}
                              </div>
                              {capa.verification_notes && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                  <strong>Note:</strong> {capa.verification_notes}
                                </div>
                              )}
                            </td>
                            <td>{capa.owner_name || `User #${capa.owner_id}`}</td>
                            <td>{formatDate(capa.due_date)}</td>
                            <td>
                              <span className={`status-badge ${getCapaStatusClass(capa.status)}`}>
                                {getCapaStatusLabel(capa.status)}
                              </span>
                            </td>
                            <td>
                              {capa.status === 'CLOSED' || capa.status === 'VERIFIED' ? (
                                <div style={{ fontSize: '0.8rem' }}>
                                  {capa.completion_date && (
                                    <div>Comp: {formatDate(capa.completion_date)}</div>
                                  )}
                                  {capa.verifier_name && (
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                      Ver: {capa.verifier_name} ({formatDate(capa.verified_at)})
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                              )}
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="btn-icon"
                                  title="Edit CAPA"
                                  onClick={() => handleOpenEdit(capa)}
                                  disabled={deletingId === capa.id}
                                >
                                  ✏️
                                </button>
                                <button
                                  className="btn-icon"
                                  title="Delete CAPA"
                                  onClick={() => handleDeleteCapa(capa.id, capa.capa_code)}
                                  disabled={deletingId === capa.id}
                                >
                                  {deletingId === capa.id ? '⏳' : '🗑️'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <AuditCapaForm
          findings={findings}
          preselectedFindingId={selectedFindingId}
          initialData={selectedCapa}
          onClose={() => {
            setShowForm(false);
            setSelectedCapa(null);
            setSelectedFindingId(null);
          }}
          onSuccess={handleFormSuccess}
          onSubmitForm={handleFormSubmit}
        />
      )}
    </div>
  );
}
