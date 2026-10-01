import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ComplianceDashboardPage from './pages/ComplianceDashboardPage';
import RiskRegister from './pages/RiskRegister';
import RiskMatrixPage from './pages/RiskMatrixPage';
import AuditManagementPage from './pages/AuditManagementPage';
import AuditDetailsPage from './pages/AuditDetailsPage';
import PolicyManagementPage from './pages/PolicyManagementPage';
import PolicyDetailsPage from './pages/PolicyDetailsPage';
import ConsentManagementPage from './pages/ConsentManagementPage';
import ConsentDetailsPage from './pages/ConsentDetailsPage';
import DSRManagementPage from './pages/DSRManagementPage';
import PreferenceCenterPage from './pages/PreferenceCenterPage';
import DPIAManagementPage from './pages/DPIAManagementPage';
import CookieManagementPage from './pages/CookieManagementPage';
import RoPAManagementPage from './pages/RoPAManagementPage';
import DataInventoryPage from './pages/DataInventoryPage';
import TPRMManagementPage from './pages/TPRMManagementPage';
import IncidentManagementPage from './pages/IncidentManagementPage';
import './App.css';

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
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

  if (currentView === 'dashboard') {
    return <ComplianceDashboardPage onNavigate={setCurrentView} />;
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

  if (currentView === 'dsr' || currentView === 'dprm') {
    return <DSRManagementPage onNavigate={setCurrentView} />;
  }

  if (currentView === 'preferences') {
    return <PreferenceCenterPage onNavigate={setCurrentView} />;
  }

  if (currentView === 'dpia') {
    return <DPIAManagementPage onNavigate={setCurrentView} />;
  }

  if (currentView === 'cookie') {
    return <CookieManagementPage onNavigate={setCurrentView} />;
  }

  if (currentView === 'ropa') {
    return <RoPAManagementPage onNavigate={setCurrentView} />;
  }

  if (currentView === 'datainventory') {
    return <DataInventoryPage onNavigate={setCurrentView} />;
  }

  if (currentView === 'tprm') {
    return <TPRMManagementPage onNavigate={setCurrentView} />;
  }

  if (currentView === 'incident') {
    return <IncidentManagementPage onNavigate={setCurrentView} />;
  }

  return <RiskRegister onNavigate={setCurrentView} />;
}
