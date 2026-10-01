import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { getComplianceDashboard } from '../services/dashboardService';

export default function ComplianceDashboardPage({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const res = await getComplianceDashboard();
        setData(res);
      } catch (err) {
        console.error('Failed to load compliance dashboard:', err);
        setError(err.message || 'Failed to load compliance dashboard metrics');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <div className="app-container">
      <Header activeTab="dashboard" onNavigate={onNavigate} />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Executive Privacy & Compliance Dashboard</h1>
            <p className="page-subtitle">
              Real-time governance oversight, DPDP readiness, risk scoring, and privacy operational metrics.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading executive dashboard metrics...</div>
        ) : error ? (
          <div style={{ padding: '1rem', background: '#450a0a', color: '#f87171', borderRadius: '6px' }}>{error}</div>
        ) : data ? (
          <div>
            {/* Top Score Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', padding: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Privacy Compliance Score</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#60a5fa' }}>{data.kpi?.privacy_compliance_score || 0}%</div>
                <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.25rem' }}>Real-time database audit status</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', padding: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>DPDP Compliance Readiness</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#34d399' }}>{data.kpi?.dpdp_compliance_score || 0}%</div>
                <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '0.25rem' }}>Rights & Lawful basis compliance</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', padding: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Vendor Risk Rating</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fbbf24' }}>{data.kpi?.vendor_risk_score || 0} / 100</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>Weighted TPRM assessment score</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Active Privacy Incidents</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f87171' }}>{data.kpi?.active_incidents || 0}</div>
                <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.25rem' }}>Under investigation / containment</div>
              </div>
            </div>

            {/* Middle Grid: Operational Modules Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {/* DPRM / Rights Card */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Data Principal Rights (DPRM)</span>
                  <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => onNavigate && onNavigate('dprm')}>View DPRM</button>
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', padding: '1rem 0' }}>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f8fafc' }}>{data.dsrs?.total || 0}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Requests</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24' }}>{data.dsrs?.pending || 0}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Pending Action</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#34d399' }}>{data.dsrs?.completed || 0}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Resolved</div>
                  </div>
                </div>
              </div>

              {/* Consent Management Summary */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Consent Statistics</span>
                  <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => onNavigate && onNavigate('consent')}>View Consents</button>
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', padding: '1rem 0' }}>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#34d399' }}>{data.consents?.active || 0}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Active Granted</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f87171' }}>{data.consents?.withdrawn || 0}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Withdrawn</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24' }}>{data.consents?.expired || 0}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Expired</div>
                  </div>
                </div>
              </div>

              {/* DPIA Privacy Assessments */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Privacy Impact Assessments (DPIA)</span>
                  <button className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => onNavigate && onNavigate('dpia')}>View DPIA</button>
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', padding: '1rem 0' }}>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f8fafc' }}>{data.dpias?.total || 0}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total DPIAs</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#60a5fa' }}>{data.dpias?.open || 0}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Open / In Review</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f87171' }}>{data.dpias?.high_risk || 0}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>High Risk</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
