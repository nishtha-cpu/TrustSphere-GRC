import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { listIncidents, createIncident, updateIncidentStatus } from '../services/incidentService';

export default function IncidentManagementPage({ onNavigate }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    affected_data_categories: 'Customer Emails, Password Hashes',
    affected_subjects_count: 150,
    severity: 'MEDIUM',
    classification: 'UNAUTHORIZED_ACCESS'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await listIncidents();
      setIncidents(res);
    } catch (err) {
      setError(err.message || 'Failed to load privacy incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createIncident(formData);
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to log privacy incident');
    }
  };

  const handleAdvanceStatus = async (incident, nextStatus) => {
    try {
      await updateIncidentStatus(incident.id, { status: nextStatus, notes: `Advanced to ${nextStatus}` });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to advance incident status');
    }
  };

  const workflowSteps = ['IDENTIFICATION', 'CLASSIFICATION', 'INVESTIGATION', 'CONTAINMENT', 'NOTIFICATION', 'REMEDIATION', 'CLOSED'];

  return (
    <div className="app-container">
      <Header activeTab="incident" onNavigate={onNavigate} />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Privacy Incident Management</h1>
            <p className="page-subtitle">
              Track 7-stage incident containment lifecycle: Identification → Classification → Investigation → Containment → Notification → Remediation → Closure.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ Report Incident</button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading privacy incident registry...</div>
        ) : error ? (
          <div style={{ padding: '1rem', background: '#450a0a', color: '#f87171', borderRadius: '6px' }}>{error}</div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#f8fafc' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Incident #</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Title</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Severity</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Affected Subjects</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Lifecycle Stage</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => {
                  const currentIdx = workflowSteps.indexOf(inc.status);
                  const nextStatus = currentIdx >= 0 && currentIdx < workflowSteps.length - 1 ? workflowSteps[currentIdx + 1] : null;

                  return (
                    <tr key={inc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#f87171' }}>{inc.incident_number}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{inc.title}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className={`status-badge ${inc.severity === 'CRITICAL' || inc.severity === 'HIGH' ? 'status-withdrawn' : 'status-granted'}`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>{inc.affected_subjects_count} subjects</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#60a5fa', fontWeight: '600' }}>{inc.status}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {nextStatus && (
                          <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => handleAdvanceStatus(inc, nextStatus)}>
                            Advance to {nextStatus}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Modal */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '10px', width: '500px', maxWidth: '90vw' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#f8fafc' }}>Report Privacy Incident</h2>
              <form onSubmit={handleCreate}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Incident Title</label>
                  <input type="text" className="search-input" style={{ width: '100%' }} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Description</label>
                  <textarea className="search-input" style={{ width: '100%', height: '60px' }} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Severity</label>
                    <select className="search-input" style={{ width: '100%' }} value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })}>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Affected Subjects Count</label>
                    <input type="number" className="search-input" style={{ width: '100%' }} value={formData.affected_subjects_count} onChange={(e) => setFormData({ ...formData, affected_subjects_count: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Report Incident</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
