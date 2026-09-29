import React, { useState, useEffect } from 'react';
import AuditEvidenceForm from './AuditEvidenceForm';
import { getAuditFindings } from '../../services/auditFindingService';
import { getCapasByFinding } from '../../services/capaService';
import {
  getAuditEvidence,
  getFindingEvidence,
  getCapaEvidence,
  getEvidenceById,
  createAuditEvidence,
  createFindingEvidence,
  createCapaEvidence,
  deleteEvidence
} from '../../services/evidenceService';

export default function AuditEvidence({ auditId }) {
  const [evidenceList, setEvidenceList] = useState([]);
  const [findings, setFindings] = useState([]);
  const [capasMap, setCapasMap] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterType, setFilterType] = useState('ALL'); // ALL, AUDIT, FINDING, CAPA
  const [showForm, setShowForm] = useState(false);
  const [viewEvidence, setViewEvidence] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    if (!bytes || isNaN(bytes)) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  const loadData = async () => {
    if (!auditId) return;

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Audit-level evidence
      const auditEvPromise = getAuditEvidence(auditId, 1).catch(err => {
        console.error('Failed to load audit-level evidence:', err);
        return [];
      });

      // 2. Fetch Findings for audit
      const findingsPromise = getAuditFindings(auditId, 1).catch(err => {
        console.error('Failed to load findings for evidence catalog:', err);
        return [];
      });

      const [auditEvList, auditFindings] = await Promise.all([auditEvPromise, findingsPromise]);
      setFindings(auditFindings || []);

      // 3. Fetch Finding-level evidence & CAPAs per finding
      const tempCapasMap = {};
      const findingEvLists = [];
      const capaEvLists = [];

      if (auditFindings && auditFindings.length > 0) {
        await Promise.all(
          auditFindings.map(async (finding) => {
            // Finding evidence
            try {
              const fEv = await getFindingEvidence(finding.id, 1);
              fEv.forEach(item => {
                findingEvLists.push({
                  ...item,
                  parent_type: 'FINDING',
                  finding_code: finding.finding_code,
                  finding_title: finding.title
                });
              });
            } catch (err) {
              console.error(`Failed to fetch evidence for finding ${finding.id}:`, err);
            }

            // CAPAs for finding
            try {
              const capas = await getCapasByFinding(finding.id, 1);
              tempCapasMap[finding.id] = capas;

              // CAPA evidence
              if (capas && capas.length > 0) {
                await Promise.all(
                  capas.map(async (capa) => {
                    try {
                      const cEv = await getCapaEvidence(capa.id, 1);
                      cEv.forEach(item => {
                        capaEvLists.push({
                          ...item,
                          parent_type: 'CAPA',
                          capa_code: capa.capa_code,
                          finding_code: finding.finding_code
                        });
                      });
                    } catch (err) {
                      console.error(`Failed to fetch evidence for CAPA ${capa.id}:`, err);
                    }
                  })
                );
              }
            } catch (err) {
              console.error(`Failed to fetch CAPAs for finding ${finding.id}:`, err);
            }
          })
        );
      }

      setCapasMap(tempCapasMap);

      // Tag audit evidence
      const taggedAuditEv = (auditEvList || []).map(item => ({
        ...item,
        parent_type: 'AUDIT',
        audit_code: item.audit_code || `AUD-${auditId}`
      }));

      // Combine all evidence items and sort by ID descending
      const combined = [...taggedAuditEv, ...findingEvLists, ...capaEvLists].sort((a, b) => b.id - a.id);
      setEvidenceList(combined);

    } catch (err) {
      console.error('Failed to load audit evidence catalog:', err);
      setError(err.message || 'Failed to load audit evidence from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [auditId]);

  const handleCreateEvidence = async (payload) => {
    const { parent_type, parent_id, file_name, file_key, file_size_bytes, mime_type, uploaded_by } = payload;
    const bodyData = { file_name, file_key, file_size_bytes, mime_type, uploaded_by };

    if (parent_type === 'AUDIT') {
      await createAuditEvidence(parent_id, bodyData);
    } else if (parent_type === 'FINDING') {
      await createFindingEvidence(parent_id, bodyData);
    } else if (parent_type === 'CAPA') {
      await createCapaEvidence(parent_id, bodyData);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    loadData();
  };

  const handleViewDetails = async (evidenceId) => {
    try {
      setLoadingDetails(true);
      const data = await getEvidenceById(evidenceId, 1);
      setViewEvidence(data);
    } catch (err) {
      console.error('Failed to load evidence details:', err);
      alert(err.message || 'Failed to load evidence details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId, fileName) => {
    if (deletingId) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove evidence metadata for "${fileName}"?\n\nNote: Deleting metadata does NOT delete any physical file in external storage.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(evidenceId);
      await deleteEvidence(evidenceId, 1);
      await loadData();
    } catch (err) {
      console.error('Failed to delete evidence:', err);
      alert(err.message || 'Failed to delete evidence metadata');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter evidence list by parent_type
  const filteredEvidence = evidenceList.filter(item => {
    if (filterType === 'ALL') return true;
    return item.parent_type === filterType;
  });

  const getParentTypeBadgeClass = (pType) => {
    switch (pType) {
      case 'AUDIT': return 'status-planned';
      case 'FINDING': return 'status-fieldwork';
      case 'CAPA': return 'status-in-progress';
      default: return 'type-badge';
    }
  };

  return (
    <div className="evidence-container">
      <div className="action-bar" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
            Audit Evidence Catalog
          </h3>
          <div className="filter-group">
            <button
              className={`sub-nav-btn ${filterType === 'ALL' ? 'active' : ''}`}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              onClick={() => setFilterType('ALL')}
            >
              All ({evidenceList.length})
            </button>
            <button
              className={`sub-nav-btn ${filterType === 'AUDIT' ? 'active' : ''}`}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              onClick={() => setFilterType('AUDIT')}
            >
              Audit-Level ({evidenceList.filter(e => e.parent_type === 'AUDIT').length})
            </button>
            <button
              className={`sub-nav-btn ${filterType === 'FINDING' ? 'active' : ''}`}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              onClick={() => setFilterType('FINDING')}
            >
              Finding-Level ({evidenceList.filter(e => e.parent_type === 'FINDING').length})
            </button>
            <button
              className={`sub-nav-btn ${filterType === 'CAPA' ? 'active' : ''}`}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              onClick={() => setFilterType('CAPA')}
            >
              CAPA-Level ({evidenceList.filter(e => e.parent_type === 'CAPA').length})
            </button>
          </div>
        </div>

        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <span>+</span> Add Evidence Metadata
        </button>
      </div>

      {loading && (
        <div className="table-card table-state-container">
          <p className="state-message">Loading evidence metadata catalog...</p>
        </div>
      )}

      {error && (
        <div className="table-card table-state-container error-state">
          <p className="state-message">Error: {error}</p>
        </div>
      )}

      {!loading && !error && (!filteredEvidence || filteredEvidence.length === 0) && (
        <div className="table-card table-state-container">
          <p className="state-message">No evidence metadata records cataloged for this view.</p>
        </div>
      )}

      {!loading && !error && filteredEvidence && filteredEvidence.length > 0 && (
        <div className="table-card">
          <table className="risk-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Parent Type</th>
                <th>Parent Target</th>
                <th>MIME Type</th>
                <th>File Size</th>
                <th>Uploaded By</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvidence.map((item) => (
                <tr key={`${item.parent_type}-${item.id}`}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.875rem' }}>
                      📄 {item.file_name}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${getParentTypeBadgeClass(item.parent_type)}`}>
                      {item.parent_type}
                    </span>
                  </td>
                  <td>
                    {item.parent_type === 'AUDIT' && (
                      <span className="risk-code" style={{ fontSize: '0.8rem' }}>
                        {item.audit_code || `Audit #${item.audit_id}`}
                      </span>
                    )}
                    {item.parent_type === 'FINDING' && (
                      <div>
                        <span className="risk-code" style={{ fontSize: '0.8rem' }}>{item.finding_code}</span>
                        {item.finding_title && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {item.finding_title.length > 25 ? `${item.finding_title.substring(0, 25)}...` : item.finding_title}
                          </div>
                        )}
                      </div>
                    )}
                    {item.parent_type === 'CAPA' && (
                      <div>
                        <span className="risk-code" style={{ fontSize: '0.8rem' }}>{item.capa_code}</span>
                        {item.finding_code && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            under {item.finding_code}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {item.mime_type}
                    </span>
                  </td>
                  <td>{formatFileSize(item.file_size_bytes)}</td>
                  <td>{item.uploaded_by_name || `User #${item.uploaded_by}`}</td>
                  <td>{formatDate(item.created_at)}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon"
                        title="View Evidence Details"
                        onClick={() => handleViewDetails(item.id)}
                        disabled={loadingDetails}
                      >
                        🔍
                      </button>
                      <button
                        className="btn-icon"
                        title="Delete Metadata Record"
                        onClick={() => handleDeleteEvidence(item.id, item.file_name)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Evidence Form Modal */}
      {showForm && (
        <AuditEvidenceForm
          auditId={auditId}
          findings={findings}
          capasMap={capasMap}
          onClose={() => setShowForm(false)}
          onSuccess={handleFormSuccess}
          onSubmitForm={handleCreateEvidence}
        />
      )}

      {/* Evidence Details Modal */}
      {viewEvidence && (
        <div className="modal-backdrop" onClick={() => setViewEvidence(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Evidence Metadata Details</h2>
              <button className="btn-close" onClick={() => setViewEvidence(null)}>&times;</button>
            </div>

            <div className="detail-list" style={{ gap: '0.75rem' }}>
              <div className="detail-item">
                <span className="detail-label">Evidence Record ID</span>
                <span className="detail-value">#{viewEvidence.id}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">File Name</span>
                <span className="detail-value" style={{ fontWeight: 700 }}>{viewEvidence.file_name}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Parent Scope</span>
                <span className="detail-value">
                  {viewEvidence.audit_id && `Audit (${viewEvidence.audit_code || viewEvidence.audit_id})`}
                  {viewEvidence.finding_id && `Finding (${viewEvidence.finding_code || viewEvidence.finding_id})`}
                  {viewEvidence.capa_id && `CAPA (${viewEvidence.capa_code || viewEvidence.capa_id})`}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">File Size</span>
                <span className="detail-value">{formatFileSize(viewEvidence.file_size_bytes)} ({viewEvidence.file_size_bytes} bytes)</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">MIME Type</span>
                <span className="detail-value" style={{ fontFamily: 'monospace' }}>{viewEvidence.mime_type}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Uploaded By</span>
                <span className="detail-value">{viewEvidence.uploaded_by_name || `User #${viewEvidence.uploaded_by}`} ({viewEvidence.uploaded_by_email})</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Created At</span>
                <span className="detail-value">{formatDate(viewEvidence.created_at)}</span>
              </div>

              <div style={{ marginTop: '0.75rem' }}>
                <span className="sub-label">File Key / Storage Reference Path</span>
                <div className="detail-text" style={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.8rem', color: '#818cf8' }}>
                  {viewEvidence.file_key}
                </div>
              </div>

              <div className="evidence-metadata-notice" style={{ marginTop: '0.75rem', fontSize: '0.75rem' }}>
                🔒 <strong>Storage Notice:</strong> This is a metadata catalog record referencing an external file path. Physical file download/storage is managed outside the GRC application.
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setViewEvidence(null)}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
