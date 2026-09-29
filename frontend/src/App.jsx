import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RiskRegister from './pages/RiskRegister';
import RiskMatrixPage from './pages/RiskMatrixPage';
import AuditManagementPage from './pages/AuditManagementPage';
import AuditDetailsPage from './pages/AuditDetailsPage';
import PolicyManagementPage from './pages/PolicyManagementPage';
import PolicyDetailsPage from './pages/PolicyDetailsPage';
import ConsentManagementPage from './pages/ConsentManagementPage';
import ConsentDetailsPage from './pages/ConsentDetailsPage';
import DSRManagementPage from './pages/DSRManagementPage';
import './App.css';

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState('register');
  const [selectedAuditId, setSelectedAuditId] = useState(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState(null);
  const [selectedConsentId, setSelectedConsentId] = useState(null);

  const handleViewAudit = (auditId) => {
    setSelectedAuditId(auditId);
    setCurrentView('audit-details');
  };

  const handleViewPolicy = (policyId) => {
    setSelectedPolicyId(policyId);
    setCurrentView('policy-details');
  };

  const handleViewConsent = (consentId) => {
    setSelectedConsentId(consentId);
    setCurrentView('consent-details');
  };

  if (isLoading) {
    return (
      <div className="login-container">
        <div className="loading-spinner">Authenticating...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (currentView === 'matrix') {
    return <RiskMatrixPage onNavigate={setCurrentView} />;
  }

  if (currentView === 'audits') {
    return (
      <AuditManagementPage
        onNavigate={setCurrentView}
        onViewAudit={handleViewAudit}
      />
    );
  }

  if (currentView === 'audit-details') {
    return (
      <AuditDetailsPage
        auditId={selectedAuditId}
        onNavigate={setCurrentView}
        onBack={() => setCurrentView('audits')}
      />
    );
  }

  if (currentView === 'policies') {
    return (
      <PolicyManagementPage
        onNavigate={setCurrentView}
        onViewPolicy={handleViewPolicy}
      />
    );
  }

  if (currentView === 'policy-details') {
    return (
      <PolicyDetailsPage
        policyId={selectedPolicyId}
        onNavigate={setCurrentView}
        onBack={() => setCurrentView('policies')}
      />
    );
  }

  if (currentView === 'consent') {
    return (
      <ConsentManagementPage
        onNavigate={setCurrentView}
        onViewConsent={handleViewConsent}
      />
    );
  }

  if (currentView === 'consent-details') {
    return (
      <ConsentDetailsPage
        consentId={selectedConsentId}
        onNavigate={setCurrentView}
        onBack={() => setCurrentView('consent')}
      />
    );
  }

  if (currentView === 'dsr') {
    return (
      <DSRManagementPage
        onNavigate={setCurrentView}
      />
    );
  }

  return <RiskRegister onNavigate={setCurrentView} />;
}
