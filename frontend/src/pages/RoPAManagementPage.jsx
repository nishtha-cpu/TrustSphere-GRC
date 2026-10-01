import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { listRoPARecords, createRoPARecord, archiveRoPARecord } from '../services/ropaService';

export default function RoPAManagementPage({ onNavigate }) {
  const [ropas, setRopas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    activity_name: '',
    purpose_description: '',
    data_subject_categories: 'Customers, App Users',
    personal_data_categories: 'Name, Email, IP Address, Financial Records',
    legal_basis: 'CONSENT',
    retention_period: '365 Days',
    controller_name: 'Acme Corp Privacy Office',
    security_measures: 'AES-256 Encryption, TLS 1.3, Strict RBAC'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await listRoPARecords();
      setRopas(res);
    } catch (err) {
      setError(err.message || 'Failed to load RoPA records');
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
      await createRoPARecord(formData);
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create RoPA record');
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm('Archive this Record of Processing Activity?')) return;
    try {
      await archiveRoPARecord(id);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to archive RoPA record');
    }
  };

  return (
    <div className="app-container">
      <Header activeTab="ropa" onNavigate={onNavigate} />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Records of Processing Activities (RoPA)</h1>
            <p className="page-subtitle">
              Article 30 & DPDP compliant register of personal data processing operations, legal bases, and retention policies.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ New Processing Activity</button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading RoPA register...</div>
        ) : error ? (
          <div style={{ padding: '1rem', background: '#450a0a', color: '#f87171', borderRadius: '6px' }}>{error}</div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#f8fafc' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>RoPA Code</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Activity Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Legal Basis</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Personal Data Categories</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Retention Period</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ropas.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#60a5fa' }}>{r.ropa_code}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{r.activity_name}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{r.legal_basis}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#cbd5e1' }}>{r.personal_data_categories}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{r.retention_period}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={`status-badge ${r.status === 'ACTIVE' ? 'status-granted' : 'status-withdrawn'}`}>{r.status}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {r.status === 'ACTIVE' && (
                        <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#991b1b' }} onClick={() => handleArchive(r.id)}>
                          Archive
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '10px', width: '500px', maxWidth: '90vw' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#f8fafc' }}>Add Processing Activity (RoPA)</h2>
              <form onSubmit={handleCreate}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Activity Name</label>
                  <input type="text" className="search-input" style={{ width: '100%' }} value={formData.activity_name} onChange={(e) => setFormData({ ...formData, activity_name: e.target.value })} required />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Purpose Description</label>
                  <textarea className="search-input" style={{ width: '100%', height: '60px' }} value={formData.purpose_description} onChange={(e) => setFormData({ ...formData, purpose_description: e.target.value })} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Legal Basis</label>
                    <select className="search-input" style={{ width: '100%' }} value={formData.legal_basis} onChange={(e) => setFormData({ ...formData, legal_basis: e.target.value })}>
                      <option value="CONSENT">Consent</option>
                      <option value="CONTRACT">Contractual Necessity</option>
                      <option value="LEGAL_OBLIGATION">Legal Obligation</option>
                      <option value="LEGITIMATE_INTEREST">Legitimate Interest</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Retention Period</label>
                    <input type="text" className="search-input" style={{ width: '100%' }} value={formData.retention_period} onChange={(e) => setFormData({ ...formData, retention_period: e.target.value })} required />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Create RoPA Record</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
