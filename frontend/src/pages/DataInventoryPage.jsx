import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { listDataAssets, addDataAsset, listDataFlows, addDataFlow } from '../services/dataInventoryService';

export default function DataInventoryPage({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('assets'); // 'assets' | 'flows'
  const [assets, setAssets] = useState([]);
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAssetModal, setShowAssetModal] = useState(false);

  const [assetForm, setAssetForm] = useState({
    asset_name: '',
    asset_type: 'DATABASE',
    system_source: 'AWS RDS Postgres',
    data_categories: 'Customer PII, Payment Data',
    sensitivity_level: 'CONFIDENTIAL',
    location: 'US-East Cloud Data Center',
    retention_policy: '7 Years'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [assetList, flowList] = await Promise.all([
        listDataAssets(),
        listDataFlows()
      ]);
      setAssets(assetList);
      setFlows(flowList);
    } catch (err) {
      setError(err.message || 'Failed to load data inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    try {
      await addDataAsset(assetForm);
      setShowAssetModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to add data asset');
    }
  };

  return (
    <div className="app-container">
      <Header activeTab="datainventory" onNavigate={onNavigate} />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Data Asset Inventory & Data Flow Mapping</h1>
            <p className="page-subtitle">
              Classify personal data assets, map system data lineages, recipients, and encryption mechanisms.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowAssetModal(true)}>+ Register Data Asset</button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
          <button
            className={`nav-link ${activeTab === 'assets' ? 'active' : ''}`}
            onClick={() => setActiveTab('assets')}
            style={{ padding: '0.75rem 1.25rem', borderBottom: activeTab === 'assets' ? '2px solid #3b82f6' : '2px solid transparent', background: 'none', color: activeTab === 'assets' ? '#60a5fa' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
          >
            Data Assets ({assets.length})
          </button>
          <button
            className={`nav-link ${activeTab === 'flows' ? 'active' : ''}`}
            onClick={() => setActiveTab('flows')}
            style={{ padding: '0.75rem 1.25rem', borderBottom: activeTab === 'flows' ? '2px solid #3b82f6' : '2px solid transparent', background: 'none', color: activeTab === 'flows' ? '#60a5fa' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
          >
            Data Flows ({flows.length})
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading data inventory...</div>
        ) : error ? (
          <div style={{ padding: '1rem', background: '#450a0a', color: '#f87171', borderRadius: '6px' }}>{error}</div>
        ) : activeTab === 'assets' ? (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#f8fafc' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Asset Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>System Source</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Data Categories</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Sensitivity</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Location</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Retention</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#60a5fa' }}>{a.asset_name} ({a.asset_type})</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{a.system_source}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>{a.data_categories}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className={`status-badge ${a.sensitivity_level === 'RESTRICTED' || a.sensitivity_level === 'CONFIDENTIAL' ? 'status-withdrawn' : 'status-granted'}`}>
                        {a.sensitivity_level}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{a.location}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{a.retention_policy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#f8fafc' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Flow Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Source Asset</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Recipient / Target</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Transfer Mechanism</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Encryption</th>
                </tr>
              </thead>
              <tbody>
                {flows.map((f) => (
                  <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#34d399' }}>{f.flow_name}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{f.source_asset_name} ({f.source_system})</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{f.recipient_name}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{f.transfer_mechanism}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#60a5fa' }}>{f.encryption_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {showAssetModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '10px', width: '450px' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#f8fafc' }}>Register Data Asset</h2>
              <form onSubmit={handleCreateAsset}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Asset Name</label>
                  <input type="text" className="search-input" style={{ width: '100%' }} value={assetForm.asset_name} onChange={(e) => setAssetForm({ ...assetForm, asset_name: e.target.value })} required />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>System / Source</label>
                  <input type="text" className="search-input" style={{ width: '100%' }} value={assetForm.system_source} onChange={(e) => setAssetForm({ ...assetForm, system_source: e.target.value })} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sensitivity</label>
                    <select className="search-input" style={{ width: '100%' }} value={assetForm.sensitivity_level} onChange={(e) => setAssetForm({ ...assetForm, sensitivity_level: e.target.value })}>
                      <option value="PUBLIC">Public</option>
                      <option value="INTERNAL">Internal</option>
                      <option value="CONFIDENTIAL">Confidential</option>
                      <option value="RESTRICTED">Restricted</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Location</label>
                    <input type="text" className="search-input" style={{ width: '100%' }} value={assetForm.location} onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })} required />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowAssetModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Register Asset</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
