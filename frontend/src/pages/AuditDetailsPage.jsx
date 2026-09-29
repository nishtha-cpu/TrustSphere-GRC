import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import AuditOverview from '../components/audit/AuditOverview';
import AuditTeam from '../components/audit/AuditTeam';
import AuditFindings from '../components/audit/AuditFindings';
import AuditCapa from '../components/audit/AuditCapa';
import AuditEvidence from '../components/audit/AuditEvidence';
import { getAuditById } from '../services/auditService';

export default function AuditDetailsPage({ auditId, onNavigate, onBack }) {
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const loadAudit = async () => {
    if (!auditId) {
      setError('No audit selected.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getAuditById(auditId, 1);
      if (!data) {
        setError('Audit not found.');
      } else {
        setAudit(data);
      }
    } catch (err) {
      console.error('Failed to load audit details:', err);
      setError(err.message || 'Failed to load audit details from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, [auditId]);

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

  return (
    <div className="app-container">
      <Header activeTab="audits" onNavigate={onNavigate} />
      <main className="main-content">
        <div style={{ marginBottom: '1.25rem' }}>
          <button className="btn-secondary" onClick={onBack}>
            &larr; Back to Audits
          </button>
        </div>

        {loading && (
          <div className="table-card table-state-container">
            <p className="state-message">Loading audit details...</p>
          </div>
        )}

        {error && (
          <div className="table-card table-state-container error-state">
            <p className="state-message">{error}</p>
            <div style={{ marginTop: '1rem' }}>
              <button className="btn-primary" onClick={onBack}>
                Back to Audits
              </button>
            </div>
          </div>
        )}

        {!loading && !error && audit && (
          <>
            <div className="audit-detail-header-card">
              <div className="audit-header-title-group">
                <span className="risk-code audit-code-badge">{audit.audit_code}</span>
                <h1 className="page-title">{audit.title}</h1>
              </div>

              <div className="badge-group">
                <span className={`status-badge ${getStatusClass(audit.status)}`}>
                  {getStatusLabel(audit.status)}
                </span>
                <span className="type-badge">
                  {getTypeLabel(audit.audit_type)}
                </span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="sub-nav-bar">
              <button
                className={`sub-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button
                className={`sub-nav-btn ${activeTab === 'team' ? 'active' : ''}`}
                onClick={() => setActiveTab('team')}
              >
                Audit Team
              </button>
              <button
                className={`sub-nav-btn ${activeTab === 'findings' ? 'active' : ''}`}
                onClick={() => setActiveTab('findings')}
              >
                Findings
              </button>
              <button
                className={`sub-nav-btn ${activeTab === 'capa' ? 'active' : ''}`}
                onClick={() => setActiveTab('capa')}
              >
                CAPA
              </button>
              <button
                className={`sub-nav-btn ${activeTab === 'evidence' ? 'active' : ''}`}
                onClick={() => setActiveTab('evidence')}
              >
                Evidence
              </button>
            </div>

            {/* Tab Content Panels */}
            {activeTab === 'overview' && <AuditOverview audit={audit} />}

            {activeTab === 'team' && (
              <AuditTeam auditId={auditId} onAuditUpdated={loadAudit} />
            )}

            {activeTab === 'findings' && (
              <AuditFindings auditId={auditId} />
            )}

            {activeTab === 'capa' && (
              <AuditCapa auditId={auditId} />
            )}

            {activeTab === 'evidence' && (
              <AuditEvidence auditId={auditId} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
