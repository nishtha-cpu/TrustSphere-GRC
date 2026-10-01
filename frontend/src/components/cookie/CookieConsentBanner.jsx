import React, { useState } from 'react';
import { recordCookieConsent } from '../../services/cookieService';

export default function CookieConsentBanner({ onConsentSaved }) {
  const [showPreferences, setShowPreferences] = useState(false);
  const [acceptedCategories, setAcceptedCategories] = useState({
    essential: true,
    functional: false,
    performance: false,
    analytics: false,
    advertising: false
  });

  const handleSave = async (allAccepted = false) => {
    const session = `SESS_${Math.random().toString(36).substring(2, 10)}`;
    const payload = {
      session_identifier: session,
      essential_accepted: true,
      functional_accepted: allAccepted ? true : acceptedCategories.functional,
      performance_accepted: allAccepted ? true : acceptedCategories.performance,
      analytics_accepted: allAccepted ? true : acceptedCategories.analytics,
      advertising_accepted: allAccepted ? true : acceptedCategories.advertising,
      language: navigator.language || 'en'
    };

    try {
      await recordCookieConsent(payload);
      if (onConsentSaved) onConsentSaved(payload);
    } catch (err) {
      console.error('Consent save error:', err);
    }
  };

  return (
    <div style={{ background: '#0f172a', border: '1px solid #3b82f6', borderRadius: '10px', padding: '1.25rem', color: '#f8fafc', margin: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 'bold' }}>🍪 Cookie & Privacy Consent Preferences</h3>
        <span style={{ fontSize: '0.75rem', background: 'rgba(59,130,246,0.2)', color: '#60a5fa', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
          BRD Compliant Banner
        </span>
      </div>

      <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
        We use essential and analytics cookies to optimize user experience and adhere to DPDP & GDPR compliance regulations.
      </p>

      {showPreferences && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
          <label style={{ fontSize: '0.8rem', opacity: 0.7 }}><input type="checkbox" checked disabled /> Essential (Required)</label>
          <label style={{ fontSize: '0.8rem' }}><input type="checkbox" checked={acceptedCategories.functional} onChange={(e) => setAcceptedCategories({ ...acceptedCategories, functional: e.target.checked })} /> Functional</label>
          <label style={{ fontSize: '0.8rem' }}><input type="checkbox" checked={acceptedCategories.performance} onChange={(e) => setAcceptedCategories({ ...acceptedCategories, performance: e.target.checked })} /> Performance</label>
          <label style={{ fontSize: '0.8rem' }}><input type="checkbox" checked={acceptedCategories.analytics} onChange={(e) => setAcceptedCategories({ ...acceptedCategories, analytics: e.target.checked })} /> Analytics</label>
          <label style={{ fontSize: '0.8rem' }}><input type="checkbox" checked={acceptedCategories.advertising} onChange={(e) => setAcceptedCategories({ ...acceptedCategories, advertising: e.target.checked })} /> Advertising</label>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setShowPreferences(!showPreferences)}>
          {showPreferences ? 'Hide Options' : 'Customize Preferences'}
        </button>
        <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleSave(false)}>
          Save Selection
        </button>
        <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleSave(true)}>
          Accept All
        </button>
      </div>
    </div>
  );
}
