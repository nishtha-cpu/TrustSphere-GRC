import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { listVendors, createVendor, createTPRMAssessment } from '../services/tprmService';

export default function TPRMManagementPage({ onNavigate }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [selectedVendorForAssessment, setSelectedVendorForAssessment] = useState(null);

  const [vendorForm, setVendorForm] = useState({
    vendor_name: '',
    vendor_type: 'CLOUD_PROVIDER',
    services_provided: 'Managed Infrastructure Hosting & DB',
    data_handled: 'Customer PII, Financial Logs',
    contact_email: 'security@vendor.com'
  });

  const [assessmentForm, setAssessmentForm] = useState({
    sensitivity_score: 70,
    compliance_exposure_score: 60,
    security_controls_score: 80,
    vendor_maturity_score: 75,
    incident_history_score: 85
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await listVendors();
      setVendors(res);
    } catch (err) {
      setError(err.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    try {
      await createVendor(vendorForm);
      setShowVendorModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create vendor');
    }
  };

  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    if (!selectedVendorForAssessment) return;
    try {
      await createTPRMAssessment(selectedVendorForAssessment.id, assessmentForm);
      setSelectedVendorForAssessment(null);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to run TPRM assessment');
    }
  };

  return (
    <div className="app-container">
      <Header activeTab="tprm" onNavigate={onNavigate} />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Third-Party Risk Management (TPRM)</h1>
            <p className="page-subtitle">
              Vendor privacy risk assessments based on weighted BRD formula (Sensitivity 25%, Compliance 20%, Security 25%, Maturity 15%, Incident History 15%).
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowVendorModal(true)}>+ Register Vendor</button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading vendor directory...</div>
        ) : error ? (
          <div style={{ padding: '1rem', background: '#450a0a', color: '#f87171', borderRadius: '6px' }}>{error}</div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#f8fafc' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Vendor Code</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Vendor Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Services Provided</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Risk Level</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#60a5fa' }}>{v.vendor_code}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>{v.vendor_name}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{v.vendor_type}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>{v.services_provided}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={`status-badge ${v.risk_classification === 'CRITICAL' || v.risk_classification === 'HIGH' ? 'status-withdrawn' : 'status-granted'}`}>
                        {v.risk_classification}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setSelectedVendorForAssessment(v)}>
                        Run Assessment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Vendor Modal */}
        {showVendorModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '10px', width: '450px' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#f8fafc' }}>Register Third-Party Vendor</h2>
              <form onSubmit={handleCreateVendor}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Vendor Name</label>
                  <input type="text" className="search-input" style={{ width: '100%' }} value={vendorForm.vendor_name} onChange={(e) => setVendorForm({ ...vendorForm, vendor_name: e.target.value })} required />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Contact Email</label>
                  <input type="email" className="search-input" style={{ width: '100%' }} value={vendorForm.contact_email} onChange={(e) => setVendorForm({ ...vendorForm, contact_email: e.target.value })} required />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowVendorModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Register</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assessment Modal */}
        {selectedVendorForAssessment && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '10px', width: '500px' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#f8fafc' }}>Assess Vendor: {selectedVendorForAssessment.vendor_name}</h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>Input domain scores (0-100) to calculate weighted BRD risk rating.</p>
              <form onSubmit={handleCreateAssessment}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Data Sensitivity (25%)</label>
                    <input type="number" className="search-input" style={{ width: '100%' }} value={assessmentForm.sensitivity_score} onChange={(e) => setAssessmentForm({ ...assessmentForm, sensitivity_score: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Compliance Exposure (20%)</label>
                    <input type="number" className="search-input" style={{ width: '100%' }} value={assessmentForm.compliance_exposure_score} onChange={(e) => setAssessmentForm({ ...assessmentForm, compliance_exposure_score: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Security Controls (25%)</label>
                    <input type="number" className="search-input" style={{ width: '100%' }} value={assessmentForm.security_controls_score} onChange={(e) => setAssessmentForm({ ...assessmentForm, security_controls_score: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Vendor Maturity (15%)</label>
                    <input type="number" className="search-input" style={{ width: '100%' }} value={assessmentForm.vendor_maturity_score} onChange={(e) => setAssessmentForm({ ...assessmentForm, vendor_maturity_score: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setSelectedVendorForAssessment(null)}>Cancel</button>
                  <button type="submit" className="btn-primary">Calculate & Submit Assessment</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
