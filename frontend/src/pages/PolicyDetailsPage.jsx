import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import PolicyVersions from '../components/policy/PolicyVersions';
import PolicyForm from '../components/policy/PolicyForm';
import {
  getPolicyById,
  getPolicyVersions,
  updatePolicy
} from '../services/policyService';

export default function PolicyDetailsPage({ policyId, onNavigate, onBack }) {
  const [policy, setPolicy] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);

  const loadData = async () => {
    if (!policyId) {
      setError('No policy selected.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [policyData, versionList] = await Promise.all([
        getPolicyById(policyId, 1),
        getPolicyVersions(policyId, 1).catch(() => [])
      ]);

      if (!policyData) {
        setError('Policy not found or has been deleted.');
      } else {
        setPolicy(policyData);
        setVersions(versionList || []);
      }
    } catch (err) {
      console.error('Failed to load policy details:', err);
      setError(err.message || 'Failed to load policy details from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [policyId]);

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
    if (!dateStr) return 'Not set';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Not set';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  const handleEditSubmit = async (formData) => {
    await updatePolicy(policyId, formData);
  };

  return (
    <div className="app-container">
      <Header activeTab="policies" onNavigate={onNavigate} />
      <main className="main-content">
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn-secondary" onClick={onBack}>
            &larr; Back to Policies
          </button>

          {policy && policy.status !== 'ARCHIVED' && (
            <button className="btn-primary" onClick={() => setShowEditForm(true)}>
              ✏️ Edit Policy
            </button>
          )}
        </div>

        {loading && (
          <div className="table-card table-state-container">
            <p className="state-message">Loading policy details...</p>
          </div>
        )}

        {error && (
          <div className="table-card table-state-container error-state">
            <p className="state-message">{error}</p>
            <div style={{ marginTop: '1rem' }}>
              <button className="btn-primary" onClick={onBack}>
                Back to Policies
              </button>
            </div>
          </div>
        )}

        {!loading && !error && policy && (
          <>
            {/* Policy Header Banner Card */}
            <div className="audit-detail-header-card">
              <div className="audit-header-title-group">
                <span className="risk-code audit-code-badge">{policy.policy_code}</span>
                <h1 className="page-title">{policy.title}</h1>
              </div>

              <div className="badge-group">
                <span className={`status-badge ${getStatusClass(policy.status)}`}>
                  {getStatusLabel(policy.status)}
                </span>
                <span className="type-badge">
                  {getTypeLabel(policy.policy_type)}
                </span>
              </div>
            </div>

            {/* Overview & Dates Grid */}
            <div className="overview-container">
              <div className="overview-grid">
                {/* Core Metadata Card */}
                <div className="overview-card">
                  <h3 className="card-title">Policy Metadata</h3>
                  <div className="detail-list">
                    <div className="detail-item">
                      <span className="detail-label">Policy Code</span>
                      <span className="detail-value risk-code">{policy.policy_code}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Category / Type</span>
                      <span className="detail-value">{getTypeLabel(policy.policy_type)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Owner</span>
                      <span className="detail-value">{policy.owner_name || `User #${policy.owner_id}`}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Lifecycle Status</span>
                      <span className="detail-value">{getStatusLabel(policy.status)}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline Dates Card */}
                <div className="overview-card">
                  <h3 className="card-title">Review & Effective Timeline</h3>
                  <div className="detail-list">
                    <div className="detail-item">
                      <span className="detail-label">Next Review Date</span>
                      <span className="detail-value">{formatDate(policy.review_date)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Effective Date</span>
                      <span className="detail-value">{formatDate(policy.effective_date)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Expiry Date</span>
                      <span className="detail-value">{formatDate(policy.expiry_date)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scope & Description Card */}
              <div className="overview-card" style={{ marginTop: '1.25rem' }}>
                <h3 className="card-title">Policy Description & Scope</h3>
                <div className="detail-block">
                  <p className="detail-text">
                    {policy.description || 'No detailed description or scope provided for this policy.'}
                  </p>
                </div>
              </div>

              {/* Current Version Card */}
              <div className="overview-card" style={{ marginTop: '1.25rem' }}>
                <h3 className="card-title">Active Current Version</h3>
                {policy.current_version_id ? (
                  <div className="detail-list grid-2">
                    <div className="detail-item">
                      <span className="detail-label">Current Version Label</span>
                      <span className="detail-value risk-code">v{policy.current_version_label || policy.current_version_number}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Author / Creator</span>
                      <span className="detail-value">{policy.current_version_created_by_name || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Approved At</span>
                      <span className="detail-value">{formatDateTime(policy.current_version_approved_at)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Published At</span>
                      <span className="detail-value">{formatDateTime(policy.current_version_published_at)}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '0.75rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    ⚠️ <strong>No current version assigned.</strong>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                      To publish this policy, create an approved current version from the Revision History below.
                    </div>
                  </div>
                )}
              </div>

              {/* System Audit Trail Metadata Card */}
              <div className="overview-card" style={{ marginTop: '1.25rem' }}>
                <h3 className="card-title">System Audit Trail</h3>
                <div className="detail-list grid-2">
                  <div className="detail-item">
                    <span className="detail-label">Created At</span>
                    <span className="detail-value">{formatDateTime(policy.created_at)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Last Updated At</span>
                    <span className="detail-value">{formatDateTime(policy.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Version History Section */}
            <PolicyVersions
              policyId={policyId}
              currentVersionId={policy.current_version_id}
              versions={versions}
              loading={false}
              error={null}
              onRefresh={loadData}
            />

            {/* Edit Policy Form Modal */}
            {showEditForm && (
              <PolicyForm
                initialData={policy}
                onClose={() => setShowEditForm(false)}
                onSuccess={() => {
                  setShowEditForm(false);
                  loadData();
                }}
                onSubmitForm={handleEditSubmit}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
