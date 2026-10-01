import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import {
  getMyPreferences,
  updateMyPreferences,
  getMyConsentHistory,
  downloadMyConsentRecords
} from '../services/consentService';

export default function PreferenceCenterPage({ onNavigate }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('preferences'); // 'preferences' or 'history'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [prefData, histData] = await Promise.all([
        getMyPreferences(),
        getMyConsentHistory()
      ]);
      setPreferences(prefData);
      setHistory(histData);
    } catch (err) {
      console.error('Failed to load preference center data:', err);
      setError(err.message || 'Failed to load privacy preferences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTogglePreference = (purposeId, currentStatus) => {
    const newStatus = currentStatus === 'GRANTED' ? 'WITHDRAWN' : 'GRANTED';
    setPreferences(prev => prev.map(p => p.purpose_id === purposeId ? { ...p, status: newStatus } : p));
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);

      const payload = preferences.map(p => ({
        purpose_id: p.purpose_id,
        status: p.status === 'NOT_PROVIDED' ? 'DENIED' : p.status,
        source: 'CUSTOMER_PORTAL'
      }));

      const updatedPref = await updateMyPreferences(payload);
      setPreferences(updatedPref);
      setSuccessMsg('Your privacy preferences have been updated successfully!');
      const histData = await getMyConsentHistory();
      setHistory(histData);
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setError(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (format) => {
    try {
      setDownloading(true);
      const result = await downloadMyConsentRecords(format);

      let blob;
      let filename;
      if (format === 'csv') {
        blob = new Blob([result], { type: 'text/csv' });
        filename = `my_consent_records_${user?.email || 'me'}.csv`;
      } else {
        blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        filename = `my_consent_records_${user?.email || 'me'}.json`;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
      alert(err.message || 'Failed to download consent records');
    } finally {
      setDownloading(false);
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'GRANTED': return <span className="status-badge status-closed">✓ Granted</span>;
      case 'WITHDRAWN': return <span className="status-badge status-cancelled">⚠️ Withdrawn</span>;
      case 'EXPIRED': return <span className="status-badge status-planned" style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#eab308' }}>⌛ Expired</span>;
      case 'DENIED': return <span className="status-badge status-cancelled">✕ Denied</span>;
      default: return <span className="status-badge status-planned">Not Provided</span>;
    }
  };

  return (
    <div className="app-container">
      <Header activeTab="preferences" onNavigate={onNavigate} />
      <main className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Privacy Preference Center</h1>
            <p className="page-subtitle">
              Self-service privacy controls for {user?.email || 'Data Principal'}. View active processing purposes, toggle preferences, or download your records.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn-secondary"
              onClick={() => handleDownload('json')}
              disabled={downloading}
            >
              📥 Download Records (JSON)
            </button>
            <button
              className="btn-secondary"
              onClick={() => handleDownload('csv')}
              disabled={downloading}
            >
              📊 Export CSV
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('preferences')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '4px',
              border: 'none',
              background: activeTab === 'preferences' ? '#3b82f6' : 'transparent',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            My Processing Preferences ({preferences.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '4px',
              border: 'none',
              background: activeTab === 'history' ? '#3b82f6' : 'transparent',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            My Consent History ({history.length})
          </button>
        </div>

        {error && (
          <div className="alert-error" style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399' }}>
            ✓ {successMsg}
          </div>
        )}

        {loading ? (
          <div className="table-card table-state-container">
            <p className="state-message">Loading Privacy Preference Center...</p>
          </div>
        ) : activeTab === 'preferences' ? (
          <div className="table-card">
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', color: '#f8fafc', margin: 0 }}>Active Data Processing Purposes</h2>
              <button
                className="btn-primary"
                onClick={handleSavePreferences}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>

            {preferences.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active processing purposes configured for this organization.
              </div>
            ) : (
              <div style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {preferences.map((p) => (
                  <div key={p.purpose_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ flex: 1, paddingRight: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                        <span className="risk-code">{p.purpose_code}</span>
                        <h3 style={{ fontSize: '1rem', color: '#f8fafc', margin: 0 }}>{p.purpose_name}</h3>
                        {getStatusBadge(p.status)}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 8px 0' }}>
                        {p.description || 'No detailed description.'}
                      </p>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Legal Basis: <code>{p.legal_basis}</code> {p.collected_at && `• Collected At: ${p.collected_at}`} {p.expires_at && `• Expires At: ${p.expires_at}`}
                      </div>
                    </div>

                    <div>
                      <button
                        className={p.status === 'GRANTED' ? 'btn-secondary' : 'btn-primary'}
                        style={{ background: p.status === 'GRANTED' ? 'rgba(239, 68, 68, 0.2)' : '#3b82f6', color: p.status === 'GRANTED' ? '#f87171' : '#fff' }}
                        onClick={() => handleTogglePreference(p.purpose_id, p.status)}
                        disabled={saving}
                      >
                        {p.status === 'GRANTED' ? 'Revoke / Withdraw' : 'Grant Consent'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* My History Tab */
          <div className="table-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', color: '#f8fafc', marginBottom: '1rem' }}>Personal Consent Audit History</h2>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No consent history records found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {history.map((h) => (
                  <div key={h.id} style={{ padding: '0.85rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '6px', borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: '#60a5fa' }}>{h.action} — {h.purpose_name} ({h.purpose_code})</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{h.performed_at}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
                      Status Transition: <code>{h.previous_status}</code> &rarr; <code>{h.new_status}</code> | Channel: <code>{h.source}</code>
                    </div>
                    {h.notes && (
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>
                        "{h.notes}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
