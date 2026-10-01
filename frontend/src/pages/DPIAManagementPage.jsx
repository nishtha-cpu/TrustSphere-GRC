import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { listDPIAs, createDPIA, updateDPIAStatus, addDPIARemediation } from '../services/dpiaService';

export default function DPIAManagementPage({ onNavigate }) {
  const [dpias, setDpias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDPIA, setSelectedDPIA] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    data_collection_score: 15,
    data_processing_score: 20,
    data_sharing_score: 25,
    data_retention_score: 15,
    security_controls_score: 10,
    executive_summary: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await listDPIAs();
      setDpias(res);
    } catch (err) {
      setError(err.message || 'Failed to load DPIAs');
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
      await createDPIA(formData);
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create DPIA');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateDPIAStatus(id, { status, reviewer_notes: `Status changed to ${status}` });
      loadData();
      if (selectedDPIA && selectedDPIA.id === id) {
        setSelectedDPIA(null);
      }
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  return (
    <div className="app-container">
      <Header activeTab="dpia" onNavigate={onNavigate} />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Privacy Impact Assessment (PIA / DPIA)</h1>
            <p className="page-subtitle">
              Evaluate data collection, processing, sharing, retention, and security control risk profiles.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>+ Initiate DPIA</button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading DPIA assessments...</div>
        ) : error ? (
          <div style={{ padding: '1rem', background: '#450a0a', color: '#f87171', borderRadius: '6px' }}>{error}</div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#f8fafc' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Assessment #</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Title</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Overall Score</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Risk Level</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dpias.map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#60a5fa' }}>{d.assessment_number}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{d.title}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{d.overall_risk_score} / 100</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={`status-badge ${d.risk_level === 'CRITICAL' || d.risk_level === 'HIGH' ? 'status-withdrawn' : 'status-granted'}`}>
                        {d.risk_level}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{d.status}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {d.status === 'DRAFT' && (
                        <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => handleStatusChange(d.id, 'IN_REVIEW')}>
                          Submit Review
                        </button>
                      )}
                      {d.status === 'IN_REVIEW' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#059669' }} onClick={() => handleStatusChange(d.id, 'APPROVED')}>
                            Approve
                          </button>
                          <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#dc2626' }} onClick={() => handleStatusChange(d.id, 'REJECTED')}>
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {showCreateModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '10px', width: '500px', maxWidth: '90vw' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#f8fafc' }}>Initiate Privacy Assessment (DPIA)</h2>
              <form onSubmit={handleCreate}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Title</label>
                  <input type="text" className="search-input" style={{ width: '100%' }} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Executive Summary</label>
                  <textarea className="search-input" style={{ width: '100%', height: '80px' }} value={formData.executive_summary} onChange={(e) => setFormData({ ...formData, executive_summary: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Collection Risk (0-100)</label>
                    <input type="number" className="search-input" style={{ width: '100%' }} value={formData.data_collection_score} onChange={(e) => setFormData({ ...formData, data_collection_score: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sharing Risk (0-100)</label>
                    <input type="number" className="search-input" style={{ width: '100%' }} value={formData.data_sharing_score} onChange={(e) => setFormData({ ...formData, data_sharing_score: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Create Assessment</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
