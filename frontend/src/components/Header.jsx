import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Header({ activeTab = 'register', onNavigate }) {
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
    <header className="header">
      <div className="brand">
        <div className="brand-icon">T</div>
        <span className="brand-title">TrustSphere-GRC</span>
      </div>

      <nav className="header-nav">
        <button
          className={`nav-link ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => onNavigate && onNavigate('register')}
        >
          Risk Register
        </button>
        <button
          className={`nav-link ${activeTab === 'matrix' ? 'active' : ''}`}
          onClick={() => onNavigate && onNavigate('matrix')}
        >
          Risk Matrix
        </button>
        <button
          className={`nav-link ${activeTab === 'audits' ? 'active' : ''}`}
          onClick={() => onNavigate && onNavigate('audits')}
        >
          Audit Management
        </button>
        <button
          className={`nav-link ${activeTab === 'policies' ? 'active' : ''}`}
          onClick={() => onNavigate && onNavigate('policies')}
        >
          Policy Management
        </button>
        <button
          className={`nav-link ${activeTab === 'consent' ? 'active' : ''}`}
          onClick={() => onNavigate && onNavigate('consent')}
        >
          Consent & Privacy
        </button>
        <button
          className={`nav-link ${activeTab === 'dsr' ? 'active' : ''}`}
          onClick={() => onNavigate && onNavigate('dsr')}
        >
          Privacy / DSR
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
