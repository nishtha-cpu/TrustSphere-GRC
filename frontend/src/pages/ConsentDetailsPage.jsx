import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import ConsentHistory from '../components/consent/ConsentHistory';
import { useAuth } from '../context/AuthContext';
import { getConsent, withdrawConsent, renewConsent, getConsentHistory } from '../services/consentService';

export default function ConsentDetailsPage({ consentId, onNavigate, onBack }) {
  const { user } = useAuth();
  const [consent, setConsent] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [renewing, setRenewing] = useState(false);

  // Permission UX Check
  const userRoles = Array.isArray(user?.roles)
    ? user.roles
    : (user?.role ? [user.role] : []);
  const canManageConsent = userRoles.some(r => ['POLICY_MGR', 'RISK_MANAGER', 'AUDITOR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'].includes(r));

  const loadData = async () => {
    if (!consentId) {
      setError('No consent record selected.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [consentData, historyData] = await Promise.all([
        getConsent(consentId),
        getConsentHistory(consentId).catch(() => [])
      ]);

      if (!consentData) {
        setError('Consent record not found.');
      } else {
        setConsent(consentData);
        setHistory(historyData || []);
      }
    } catch (err) {
      console.error('Failed to load consent details:', err);
      if (err.status === 403) {
        setError('You do not have permission to view this consent record.');
      } else {
        setError(err.message || 'Failed to load consent details from server');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [consentId]);

  const handleWithdraw = async () => {
    if (withdrawing || !consent) return;
    const confirmed = window.confirm(
      `Are you sure you want to withdraw consent for data subject "${consent.data_subject_identifier}"?\n\nThis will update the consent status to WITHDRAWN and add an immutable audit record.`
    );
    if (!confirmed) return;

    try {
      setWithdrawing(true);
      await withdrawConsent(consentId, { notes: 'Consent withdrawn by administrator action' });
      await loadData();
    } catch (err) {
      console.error('Failed to withdraw consent:', err);
      if (err.status === 403) {
        alert('You do not have permission to withdraw consents.');
      } else {
        alert(err.message || 'Failed to withdraw consent');
      }
    } finally {
      setWithdrawing(false);
    }
  };

  const handleRenew = async () => {
    if (renewing || !consent) return;
    const confirmed = window.confirm(
      `Are you sure you want to renew consent for data subject "${consent.data_subject_identifier}"?\n\nThis will reinstate status to GRANTED and add a CONSENT_RENEWED audit record.`
    );
    if (!confirmed) return;

    try {
      setRenewing(true);
      await renewConsent(consentId, { notes: 'Consent renewed by administrator action' });
      await loadData();
    } catch (err) {
      console.error('Failed to renew consent:', err);
      if (err.status === 403) {
        alert('You do not have permission to renew consents.');
      } else {
        alert(err.message || 'Failed to renew consent');
      }
    } finally {
      setRenewing(false);
    }
  };

  const getStatusLabel = (st) => {
    switch (st) {
      case 'GRANTED': return 'Granted';
      case 'DENIED': return 'Denied';
      case 'WITHDRAWN': return 'Withdrawn';
      case 'EXPIRED': return 'Expired';
      default: return st;
    }
  };

  const getStatusClass = (st) => {
    switch (st) {
      case 'GRANTED': return 'status-closed';
      case 'DENIED': return 'status-cancelled';
      case 'WITHDRAWN': return 'status-in-progress';
      case 'EXPIRED': return 'status-planned';
      default: return 'status-planned';
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Not recorded';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="app-container">
      <Header activeTab="consent" onNavigate={onNavigate} />
      <main className="main-content">
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn-secondary" onClick={onBack}>
            &larr; Back to Consent Management
          </button>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {consent && consent.status === 'GRANTED' && canManageConsent && (
              <button className="btn-primary" style={{ background: '#dc2626' }} onClick={handleWithdraw} disabled={withdrawing}>
                {withdrawing ? 'Withdrawing...' : '🚫 Withdraw Consent'}
              </button>
            )}
            {consent && (consent.status === 'WITHDRAWN' || consent.status === 'EXPIRED' || consent.status === 'DENIED') && canManageConsent && (
              <button className="btn-primary" style={{ background: '#10b981' }} onClick={handleRenew} disabled={renewing}>
                {renewing ? 'Renewing...' : '🔄 Renew Consent'}
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="table-card table-state-container">
            <p className="state-message">Loading consent record details...</p>
          </div>
        )}

        {error && (
          <div className="table-card table-state-container error-state">
            <p className="state-message">{error}</p>
            <div style={{ marginTop: '1rem' }}>
              <button className="btn-primary" onClick={onBack}>
                Back to Consent Management
              </button>
            </div>
          </div>
        )}

        {!loading && !error && consent && (
          <>
            {/* Header Banner */}
            <div className="audit-detail-header-card">
              <div className="audit-header-title-group">
                <span className="risk-code audit-code-badge">REC #{consent.id}</span>
                <h1 className="page-title">{consent.data_subject_identifier}</h1>
              </div>

              <div className="badge-group">
                <span className={`status-badge ${getStatusClass(consent.status)}`}>
                  {getStatusLabel(consent.status)}
                </span>
                <span className="type-badge">
                  {consent.purpose_code} - {consent.purpose_name}
                </span>
              </div>
            </div>

            {/* Overview Grid */}
            <div className="overview-container">
              <div className="overview-grid">
                {/* Data Subject & Consent Details */}
                <div className="overview-card">
                  <h3 className="card-title">Data Principal Details</h3>
                  <div className="detail-list">
                    <div className="detail-item">
                      <span className="detail-label">Data Principal Identifier</span>
                      <span className="detail-value">{consent.data_subject_identifier}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Subject Type</span>
                      <span className="detail-value">
                        {consent.data_subject_type === 'APPLICATION_USER' ? 'Application User' : 'External Data Principal'}
                      </span>
                    </div>
                    {consent.user_id && (
                      <div className="detail-item">
                        <span className="detail-label">Linked App User ID</span>
                        <span className="detail-value">#{consent.user_id}</span>
                      </div>
                    )}
                    <div className="detail-item">
                      <span className="detail-label">Collection Channel</span>
                      <span className="detail-value">{consent.source || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Consent Version</span>
                      <span className="detail-value risk-code">v{consent.consent_version}</span>
                    </div>
                  </div>
                </div>

                {/* Purpose & Legal Basis */}
                <div className="overview-card">
                  <h3 className="card-title">Processing Purpose Definition</h3>
                  <div className="detail-list">
                    <div className="detail-item">
                      <span className="detail-label">Purpose Code</span>
                      <span className="detail-value risk-code">{consent.purpose_code}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Purpose Name</span>
                      <span className="detail-value">{consent.purpose_name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Legal Basis</span>
                      <span className="detail-value">{consent.legal_basis || 'CONSENT'}</span>
                    </div>
                  </div>
                  {consent.purpose_description && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <strong>Purpose Scope:</strong> {consent.purpose_description}
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline Dates Card */}
              <div className="overview-card" style={{ marginTop: '1.25rem' }}>
                <h3 className="card-title">Lifecycle & Audit Timeline</h3>
                <div className="detail-list grid-2">
                  <div className="detail-item">
                    <span className="detail-label">Collected At</span>
                    <span className="detail-value">{formatDateTime(consent.collected_at || consent.created_at)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Withdrawn At</span>
                    <span className="detail-value" style={{ color: consent.withdrawn_at ? '#f87171' : 'inherit' }}>
                      {formatDateTime(consent.withdrawn_at)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Expiration Date</span>
                    <span className="detail-value">{formatDateTime(consent.expires_at)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Last Updated Date</span>
                    <span className="detail-value">{formatDateTime(consent.updated_at)}</span>
                  </div>
                </div>
              </div>

              {/* Technical / Network Audit Metadata */}
              {(consent.ip_address || consent.user_agent) && (
                <div className="overview-card" style={{ marginTop: '1.25rem' }}>
                  <h3 className="card-title">Technical Audit Metadata</h3>
                  <div className="detail-list grid-2">
                    {consent.ip_address && (
                      <div className="detail-item">
                        <span className="detail-label">IP Address</span>
                        <span className="detail-value risk-code">{consent.ip_address}</span>
                      </div>
                    )}
                    {consent.user_agent && (
                      <div className="detail-item">
                        <span className="detail-label">User Agent</span>
                        <span className="detail-value" style={{ fontSize: '0.8rem' }}>{consent.user_agent}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Consent History Component */}
            <ConsentHistory history={history} loading={false} error={null} />
          </>
        )}
      </main>
    </div>
  );
}
