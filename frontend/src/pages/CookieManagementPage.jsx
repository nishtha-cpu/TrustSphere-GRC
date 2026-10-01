import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import CookieConsentBanner from '../components/cookie/CookieConsentBanner';
import { listCookies, addCookie, getCookieAnalytics } from '../services/cookieService';

export default function CookieManagementPage({ onNavigate }) {
  const [cookies, setCookies] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    provider: '',
    category: 'ESSENTIAL',
    party_type: 'FIRST_PARTY',
    duration: '1 Year',
    description: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [cookieList, analyticsData] = await Promise.all([
        listCookies(),
        getCookieAnalytics()
      ]);
      setCookies(cookieList);
      setAnalytics(analyticsData);
    } catch (err) {
      setError(err.message || 'Failed to load cookie management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await addCookie(formData);
      setShowAddModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to add cookie');
    }
  };

  return (
    <div className="app-container">
      <Header activeTab="cookie" onNavigate={onNavigate} />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Cookie Discovery & Compliance Management</h1>
            <p className="page-subtitle">
              Inventory cookies, classify compliance categories, monitor banner acceptance rate, and track consent statistics.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ Register Cookie</button>
        </div>

        {/* Live Banner Demonstration */}
        <CookieConsentBanner onConsentSaved={() => loadData()} />

        {/* Analytics Summary */}
        {analytics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Discovered Cookies</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f8fafc' }}>{analytics.total_cookies || 0}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Banner Sessions Recorded</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#60a5fa' }}>{analytics.analytics?.total_sessions || 0}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Banner Acceptance Rate</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#34d399' }}>{analytics.analytics?.consent_rate_percentage || 0}%</div>
            </div>
          </div>
        )}

        {/* Inventory Table */}
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading cookie inventory...</div>
        ) : error ? (
          <div style={{ padding: '1rem', background: '#450a0a', color: '#f87171', borderRadius: '6px' }}>{error}</div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#f8fafc' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Cookie Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Domain / Provider</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Party Type</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Duration</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {cookies.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#60a5fa' }}>{c.name}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{c.domain} ({c.provider})</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{c.party_type}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="status-badge status-granted">{c.category}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{c.duration}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', padding: '2rem', borderRadius: '10px', width: '450px' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#f8fafc' }}>Register Discovered Cookie</h2>
              <form onSubmit={handleAdd}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Cookie Name</label>
                  <input type="text" className="search-input" style={{ width: '100%' }} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Domain</label>
                  <input type="text" className="search-input" style={{ width: '100%' }} value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} required />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Category</label>
                  <select className="search-input" style={{ width: '100%' }} value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    <option value="ESSENTIAL">Essential</option>
                    <option value="FUNCTIONAL">Functional</option>
                    <option value="PERFORMANCE">Performance</option>
                    <option value="ANALYTICS">Analytics</option>
                    <option value="ADVERTISING">Advertising</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Register</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
