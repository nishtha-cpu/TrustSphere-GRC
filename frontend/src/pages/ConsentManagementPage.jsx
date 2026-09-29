import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import PurposeTable from '../components/consent/PurposeTable';
import PurposeForm from '../components/consent/PurposeForm';
import ConsentTable from '../components/consent/ConsentTable';
import ConsentForm from '../components/consent/ConsentForm';
import { useAuth } from '../context/AuthContext';
import {
  listPurposes,
  createPurpose,
  updatePurpose,
  archivePurpose,
  listConsents,
  createConsent,
  withdrawConsent
} from '../services/consentService';
import { getUsers } from '../services/auditService';

export default function ConsentManagementPage({ onNavigate, onViewConsent }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('purposes'); // 'purposes' | 'consents'

  // Purposes State
  const [purposes, setPurposes] = useState([]);
  const [loadingPurposes, setLoadingPurposes] = useState(true);
  const [purposeError, setPurposeError] = useState(null);
  const [purposeSearch, setPurposeSearch] = useState('');
  const [purposeStatusFilter, setPurposeStatusFilter] = useState('');
  const [showPurposeForm, setShowPurposeForm] = useState(false);
  const [selectedPurpose, setSelectedPurpose] = useState(null);
  const [archivingId, setArchivingId] = useState(null);

  // Consents State
  const [consents, setConsents] = useState([]);
  const [loadingConsents, setLoadingConsents] = useState(true);
  const [consentError, setConsentError] = useState(null);
  const [consentSearch, setConsentSearch] = useState('');
  const [consentStatusFilter, setConsentStatusFilter] = useState('');
  const [consentPurposeFilter, setConsentPurposeFilter] = useState('');
  const [showConsentForm, setShowConsentForm] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState(null);

  // Shared Users List for Form / Filter select
  const [users, setUsers] = useState([]);

  // Permission UX Checks (Backend RBAC remains authoritative)
  const userRoles = Array.isArray(user?.roles)
    ? user.roles
    : (user?.role ? [user.role] : []);

  const canEditPurpose = userRoles.some(r => ['POLICY_MGR', 'TENANT_ADMIN', 'SYSTEM_ADMIN'].includes(r));
  const canArchivePurpose = userRoles.some(r => ['TENANT_ADMIN', 'SYSTEM_ADMIN'].includes(r));
  const canManageConsent = userRoles.some(r => ['POLICY_MGR', 'RISK_MANAGER', 'AUDITOR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'].includes(r));

  // Load Purposes Data
  const loadPurposesData = async () => {
    try {
      setLoadingPurposes(true);
      setPurposeError(null);

      const params = {};
      if (purposeSearch.trim()) params.search = purposeSearch.trim();
      if (purposeStatusFilter) params.status = purposeStatusFilter;

      const data = await listPurposes(params);
      setPurposes(data);
    } catch (err) {
      console.error('Failed to load consent purposes:', err);
      if (err.status === 403) {
        setPurposeError('You do not have permission to view processing purposes.');
      } else {
        setPurposeError(err.message || 'Failed to load consent purposes');
      }
    } finally {
      setLoadingPurposes(false);
    }
  };

  // Load Consents Data
  const loadConsentsData = async () => {
    try {
      setLoadingConsents(true);
      setConsentError(null);

      const params = {};
      if (consentSearch.trim()) params.search = consentSearch.trim();
      if (consentStatusFilter) params.status = consentStatusFilter;
      if (consentPurposeFilter) params.purpose_id = consentPurposeFilter;

      const data = await listConsents(params);
      setConsents(data);
    } catch (err) {
      console.error('Failed to load consent records:', err);
      if (err.status === 403) {
        setConsentError('You do not have permission to view consent records.');
      } else {
        setConsentError(err.message || 'Failed to load consent records');
      }
    } finally {
      setLoadingConsents(false);
    }
  };

  // Initial load & user options
  useEffect(() => {
    async function loadUserOptions() {
      try {
        const uList = await getUsers();
        setUsers(uList);
      } catch (err) {
        console.error('Failed to load users list:', err);
      }
    }
    loadUserOptions();
  }, []);

  // Debounced purpose search/filter
  useEffect(() => {
    const timer = setTimeout(() => {
      loadPurposesData();
    }, 300);
    return () => clearTimeout(timer);
  }, [purposeSearch, purposeStatusFilter]);

  // Debounced consent search/filter
  useEffect(() => {
    const timer = setTimeout(() => {
      loadConsentsData();
    }, 300);
    return () => clearTimeout(timer);
  }, [consentSearch, consentStatusFilter, consentPurposeFilter]);

  // Purpose Handlers
  const handleOpenCreatePurpose = () => {
    setSelectedPurpose(null);
    setShowPurposeForm(true);
  };

  const handleOpenEditPurpose = (purpose) => {
    setSelectedPurpose(purpose);
    setShowPurposeForm(true);
  };

  const handleArchivePurpose = async (purpose) => {
    if (archivingId) return;
    const confirmed = window.confirm(
      `Are you sure you want to archive processing purpose "${purpose.name}" (${purpose.purpose_code})?\n\nThis will mark the purpose as archived.`
    );
    if (!confirmed) return;

    try {
      setArchivingId(purpose.id);
      await archivePurpose(purpose.id);
      await loadPurposesData();
    } catch (err) {
      console.error('Failed to archive purpose:', err);
      if (err.status === 403) {
        alert('You do not have permission to archive consent purposes.');
      } else {
        alert(err.message || 'Failed to archive purpose');
      }
    } finally {
      setArchivingId(null);
    }
  };

  const handlePurposeFormSubmit = async (formData) => {
    if (selectedPurpose && selectedPurpose.id) {
      await updatePurpose(selectedPurpose.id, formData);
    } else {
      await createPurpose(formData);
    }
  };

  // Consent Handlers
  const handleConsentFormSubmit = async (formData) => {
    await createConsent(formData);
  };

  const handleWithdrawConsent = async (consentId, identifier) => {
    if (withdrawingId) return;
    const confirmed = window.confirm(
      `Are you sure you want to withdraw consent for data subject "${identifier}"?\n\nThis action will update the consent status to WITHDRAWN and record an immutable audit history event.`
    );
    if (!confirmed) return;

    try {
      setWithdrawingId(consentId);
      await withdrawConsent(consentId, { notes: 'Consent withdrawn by administrator action' });
      await loadConsentsData();
    } catch (err) {
      console.error('Failed to withdraw consent:', err);
      if (err.status === 403) {
        alert('You do not have permission to withdraw consents.');
      } else {
        alert(err.message || 'Failed to withdraw consent');
      }
    } finally {
      setWithdrawingId(null);
    }
  };

  return (
    <div className="app-container">
      <Header activeTab="consent" onNavigate={onNavigate} />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Consent & Privacy Management</h1>
            <p className="page-subtitle">
              Manage data processing legal bases, purpose definitions, and data subject consent lifecycles.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {activeTab === 'purposes' && canEditPurpose && (
              <button className="btn-primary" onClick={handleOpenCreatePurpose}>
                <span>+</span> Create Purpose
              </button>
            )}
            {activeTab === 'consents' && canManageConsent && (
              <button className="btn-primary" onClick={() => setShowConsentForm(true)}>
                <span>+</span> Record Consent
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
          <button
            className={`nav-link ${activeTab === 'purposes' ? 'active' : ''}`}
            onClick={() => setActiveTab('purposes')}
            style={{ padding: '0.75rem 1.25rem', borderBottom: activeTab === 'purposes' ? '2px solid #3b82f6' : '2px solid transparent', background: 'none', color: activeTab === 'purposes' ? '#60a5fa' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
          >
            Processing Purposes ({purposes.length})
          </button>
          <button
            className={`nav-link ${activeTab === 'consents' ? 'active' : ''}`}
            onClick={() => setActiveTab('consents')}
            style={{ padding: '0.75rem 1.25rem', borderBottom: activeTab === 'consents' ? '2px solid #3b82f6' : '2px solid transparent', background: 'none', color: activeTab === 'consents' ? '#60a5fa' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
          >
            Consent Records ({consents.length})
          </button>
        </div>

        {/* TAB A: PROCESSING PURPOSES */}
        {activeTab === 'purposes' && (
          <>
            {/* Search & Filter Bar */}
            <div className="filter-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%' }}
                  placeholder="Search by purpose code or name..."
                  value={purposeSearch}
                  onChange={(e) => setPurposeSearch(e.target.value)}
                />
              </div>

              <div style={{ minWidth: '160px' }}>
                <select
                  className="search-input"
                  value={purposeStatusFilter}
                  onChange={(e) => setPurposeStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>

            <PurposeTable
              purposes={purposes}
              loading={loadingPurposes}
              error={purposeError}
              onView={(p) => {
                setSelectedPurpose(p);
                setShowPurposeForm(true);
              }}
              onEdit={handleOpenEditPurpose}
              onArchive={handleArchivePurpose}
              archivingId={archivingId}
              canEdit={canEditPurpose}
              canArchive={canArchivePurpose}
            />
          </>
        )}

        {/* TAB B: CONSENT RECORDS */}
        {activeTab === 'consents' && (
          <>
            {/* Search & Filter Bar */}
            <div className="filter-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <input
                  type="text"
                  className="search-input"
                  style={{ width: '100%' }}
                  placeholder="Search by data subject identifier or source..."
                  value={consentSearch}
                  onChange={(e) => setConsentSearch(e.target.value)}
                />
              </div>

              <div style={{ minWidth: '160px' }}>
                <select
                  className="search-input"
                  value={consentStatusFilter}
                  onChange={(e) => setConsentStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="GRANTED">Granted</option>
                  <option value="DENIED">Denied</option>
                  <option value="WITHDRAWN">Withdrawn</option>
                </select>
              </div>

              <div style={{ minWidth: '200px' }}>
                <select
                  className="search-input"
                  value={consentPurposeFilter}
                  onChange={(e) => setConsentPurposeFilter(e.target.value)}
                >
                  <option value="">All Purposes</option>
                  {purposes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.purpose_code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <ConsentTable
              consents={consents}
              loading={loadingConsents}
              error={consentError}
              onView={(id) => onViewConsent && onViewConsent(id)}
              onWithdraw={handleWithdrawConsent}
              withdrawingId={withdrawingId}
              canWithdraw={canManageConsent}
            />
          </>
        )}

        {/* Purpose Form Modal */}
        {showPurposeForm && (
          <PurposeForm
            initialData={selectedPurpose}
            onClose={() => {
              setShowPurposeForm(false);
              setSelectedPurpose(null);
            }}
            onSuccess={() => {
              setShowPurposeForm(false);
              setSelectedPurpose(null);
              loadPurposesData();
            }}
            onSubmitForm={handlePurposeFormSubmit}
          />
        )}

        {/* Consent Record Form Modal */}
        {showConsentForm && (
          <ConsentForm
            purposes={purposes}
            users={users}
            onClose={() => setShowConsentForm(false)}
            onSuccess={() => {
              setShowConsentForm(false);
              loadConsentsData();
            }}
            onSubmitForm={handleConsentFormSubmit}
          />
        )}
      </main>
    </div>
  );
}
