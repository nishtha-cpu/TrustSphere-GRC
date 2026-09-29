import React, { useState } from 'react';
import PolicyVersionForm from './PolicyVersionForm';
import {
  createPolicyVersion,
  reviewPolicyVersion,
  approvePolicyVersion
} from '../../services/policyService';

export default function PolicyVersions({
  policyId,
  currentVersionId = null,
  versions = [],
  loading = false,
  error = null,
  onRefresh
}) {
  const [showForm, setShowForm] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [expandedContentId, setExpandedContentId] = useState(null);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateStr;
    }
  };

  const nextVersionNumber = versions && versions.length > 0
    ? Math.max(...versions.map(v => v.version_number)) + 1
    : 1;

  const handleCreateVersion = async (versionPayload) => {
    await createPolicyVersion(policyId, versionPayload);
  };

  const handleReview = async (versionId) => {
    try {
      setActionLoadingId(versionId);
      await reviewPolicyVersion(versionId, 1, 1);
      onRefresh();
    } catch (err) {
      console.error('Failed to review version:', err);
      alert(err.message || 'Failed to review version');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApprove = async (versionId) => {
    try {
      setActionLoadingId(versionId);
      await approvePolicyVersion(versionId, 1, true, 1);
      onRefresh();
    } catch (err) {
      console.error('Failed to approve version:', err);
      alert(err.message || 'Failed to approve version');
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleExpandContent = (id) => {
    setExpandedContentId(prev => (prev === id ? null : id));
  };

  return (
    <div className="versions-container" style={{ marginTop: '1.5rem' }}>
      <div className="action-bar" style={{ marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
            Policy Revision History
          </h3>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <span>+</span> Create New Version
        </button>
      </div>

      {loading && (
        <div className="table-card table-state-container">
          <p className="state-message">Loading version history...</p>
        </div>
      )}

      {error && (
        <div className="table-card table-state-container error-state">
          <p className="state-message">Error: {error}</p>
        </div>
      )}

      {!loading && !error && (!versions || versions.length === 0) && (
        <div className="table-card table-state-container">
          <p className="state-message">No current or past versions cataloged for this policy.</p>
        </div>
      )}

      {!loading && !error && versions && versions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {versions.map((ver) => {
            const isCurrent = Number(ver.id) === Number(currentVersionId);
            const isExpanded = expandedContentId === ver.id;

            return (
              <div key={ver.id} className="capa-finding-card" style={{ padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span className="risk-code" style={{ fontSize: '0.9rem' }}>
                        v{ver.version_label} (Rev #{ver.version_number})
                      </span>

                      {isCurrent && (
                        <span className="status-badge status-closed" style={{ fontWeight: 700 }}>
                          ⭐ ACTIVE CURRENT VERSION
                        </span>
                      )}

                      {ver.published_at ? (
                        <span className="status-badge status-closed">Published</span>
                      ) : ver.approved_at ? (
                        <span className="status-badge status-reporting">Approved</span>
                      ) : ver.reviewed_by ? (
                        <span className="status-badge status-in-progress">Reviewed</span>
                      ) : (
                        <span className="status-badge status-planned">Draft / Unreviewed</span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      <strong>Author:</strong> {ver.created_by_name || `User #${ver.created_by}`} ({formatDate(ver.created_at)})
                    </div>

                    {ver.change_summary && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                        "{ver.change_summary}"
                      </div>
                    )}
                  </div>

                  <div className="action-buttons" style={{ alignItems: 'center' }}>
                    {!ver.reviewed_by && !ver.approved_at && (
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => handleReview(ver.id)}
                        disabled={actionLoadingId === ver.id}
                      >
                        {actionLoadingId === ver.id ? 'Saving...' : 'Review Version'}
                      </button>
                    )}

                    {!ver.approved_at && (
                      <button
                        className="btn-primary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => handleApprove(ver.id)}
                        disabled={actionLoadingId === ver.id}
                      >
                        {actionLoadingId === ver.id ? 'Saving...' : 'Approve & Set Current'}
                      </button>
                    )}

                    <button
                      className="btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                      onClick={() => toggleExpandContent(ver.id)}
                    >
                      {isExpanded ? 'Hide Content' : 'View Content'}
                    </button>
                  </div>
                </div>

                {/* Sign-off metadata footer */}
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <div>
                    <strong>Reviewed By:</strong> {ver.reviewed_by_name || (ver.reviewed_by ? `User #${ver.reviewed_by}` : 'Pending')}
                  </div>
                  <div>
                    <strong>Approved By:</strong> {ver.approved_by_name || (ver.approved_by ? `User #${ver.approved_by}` : 'Pending')} {ver.approved_at ? `(${formatDate(ver.approved_at)})` : ''}
                  </div>
                  {ver.published_at && (
                    <div>
                      <strong>Published At:</strong> {formatDate(ver.published_at)}
                    </div>
                  )}
                </div>

                {/* Expandable Content View */}
                {isExpanded && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--card-border)' }}>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: '#818cf8', fontSize: '0.85rem' }}>
                      Version Document Content:
                    </h5>
                    <pre className="detail-text" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, fontSize: '0.85rem' }}>
                      {ver.content}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <PolicyVersionForm
          policyId={policyId}
          nextVersionNumber={nextVersionNumber}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            onRefresh();
          }}
          onSubmitForm={handleCreateVersion}
        />
      )}
    </div>
  );
}
