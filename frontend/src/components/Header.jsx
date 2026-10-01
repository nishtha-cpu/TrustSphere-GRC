import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Header({ activeTab = 'dashboard', onNavigate }) {
  const { user, logout } = useAuth();

  const getInitials = () => {
    if (!user) return 'U';
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.email ? user.email[0].toUpperCase() : 'U';
  };

  const getUserDisplayName = () => {
    if (!user) return '';
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.email || '';
  };

  return (
    <header className="header" style={{ flexWrap: 'wrap', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
      <div className="brand">
        <div className="brand-icon">T</div>
        <span className="brand-title">TrustSphere-GRC</span>
      </div>

      <nav className="header-nav" style={{ flexWrap: 'wrap', gap: '0.25rem' }}>
        <button className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => onNavigate && onNavigate('dashboard')}>
          Dashboard
        </button>
        <button className={`nav-link ${activeTab === 'register' ? 'active' : ''}`} onClick={() => onNavigate && onNavigate('register')}>
          Risk Register
        </button>
        <button className={`nav-link ${activeTab === 'audits' ? 'active' : ''}`} onClick={() => onNavigate && onNavigate('audits')}>
          Audits
        </button>
        <button className={`nav-link ${activeTab === 'policies' ? 'active' : ''}`} onClick={() => onNavigate && onNavigate('policies')}>
          Policies
        </button>
        <button className={`nav-link ${activeTab === 'consent' ? 'active' : ''}`} onClick={() => onNavigate && onNavigate('consent')}>
          Consent
        </button>
        <button className={`nav-link ${activeTab === 'dsr' || activeTab === 'dprm' ? 'active' : ''}`} onClick={() => onNavigate && onNavigate('dprm')}>
          DPRM
        </button>
        <button className={`nav-link ${activeTab === 'dpia' ? 'active' : ''}`} onClick={() => onNavigate && onNavigate('dpia')}>
          PIA/DPIA
        </button>
        <button className={`nav-link ${activeTab === 'cookie' ? 'active' : ''}`} onClick={() => onNavigate && onNavigate('cookie')}>
          Cookie
        </button>
        <button className={`nav-link ${activeTab === 'ropa' ? 'active' : ''}`} onClick={() => onNavigate && onNavigate('ropa')}>
          RoPA
        </button>
        <button className={`nav-link ${activeTab === 'datainventory' ? 'active' : ''}`} onClick={() => onNavigate && onNavigate('datainventory')}>
          Data Mapping
        </button>
        <button className={`nav-link ${activeTab === 'tprm' ? 'active' : ''}`} onClick={() => onNavigate && onNavigate('tprm')}>
          TPRM
        </button>
        <button className={`nav-link ${activeTab === 'incident' ? 'active' : ''}`} onClick={() => onNavigate && onNavigate('incident')}>
          Incidents
        </button>
        <button className={`nav-link ${activeTab === 'preferences' ? 'active' : ''}`} onClick={() => onNavigate && onNavigate('preferences')}>
          Preference Center
        </button>
      </nav>

      <div className="user-profile">
        <div className="avatar">{getInitials()}</div>
        <span className="user-name">{getUserDisplayName()}</span>
        <button className="logout-btn" onClick={logout} title="Sign Out">
          Logout
        </button>
      </div>
    </header>
  );
}
