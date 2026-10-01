import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import PrivacySummaryCards from '../components/privacy/PrivacySummaryCards';
import DSRTable from '../components/dsr/DSRTable';
import DSRForm from '../components/dsr/DSRForm';
import DSRDetailsModal from '../components/dsr/DSRDetailsModal';
import { useAuth } from '../context/AuthContext';
import {
  listDSRs,
  createDSR,
  updateDSRStatus,
  deleteDSR,
  getPrivacySummaryStats
} from '../services/dsrService';
import { getUsers } from '../services/auditService';

export default function DSRManagementPage({ onNavigate }) {
  const { user } = useAuth();

  const [dsrs, setDsrs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDsr, setSelectedDsr] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Permission UX Check
  const userRoles = Array.isArray(user?.roles)
    ? user.roles
    : (user?.role ? [user.role] : []);
  const canManageDSR = userRoles.some(r => ['POLICY_MGR', 'RISK_MANAGER', 'AUDITOR', 'SEC_OFFICER', 'TENANT_ADMIN', 'SYSTEM_ADMIN'].includes(r));
  const canDeleteDSR = userRoles.some(r => ['TENANT_ADMIN', 'SYSTEM_ADMIN'].includes(r));

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.request_type = typeFilter;

      const data = await listDSRs(params);
      setDsrs(data);
    } catch (err) {
      console.error('Failed to load DSRs:', err);
      if (err.status === 403) {
        setError('You do not have permission to view Data Subject / Principal Requests.');
      } else {
        setError(err.message || 'Failed to load Data Subject Requests');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const summaryData = await getPrivacySummaryStats();
      setStats(summaryData);
    } catch (err) {
      console.error('Failed to load privacy summary stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

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
    loadStats();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, typeFilter]);

  const handleCreateSubmit = async (formData) => {
    await createDSR(formData);
    loadStats();
  };

  const handleStatusUpdate = async (dsrId, status, resolutionNotes) => {
    await updateDSRStatus(dsrId, status, resolutionNotes);
    loadData();
    loadStats();
  };

  const handleDelete = async (dsrId, reference) => {
    if (deletingId) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete Data Subject Request "${reference}"?\n\nThis is a soft deletion.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(dsrId);
      await deleteDSR(dsrId);
      await loadData();
      await loadStats();
    } catch (err) {
      console.error('Failed to delete DSR:', err);
      if (err.status === 403) {
        alert('You do not have permission to delete Data Subject Requests.');
      } else {
        alert(err.message || 'Failed to delete request');
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="app-container">
      <Header activeTab="dsr" onNavigate={onNavigate} />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Data Principal Rights Management (DPRM)</h1>
            <p className="page-subtitle">
              Fulfill statutory data principal rights (Access, Correction, Erasure, Consent Withdrawal, Grievance) via the 7-stage workflow.
            </p>
          </div>

          {canManageDSR && (
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <span>+</span> Log DPRM Request
            </button>
          )}
        </div>

        {/* Real-time Privacy & DSR Summary Dashboard */}
        <PrivacySummaryCards stats={stats} loading={statsLoading} />

        {/* Search & Filter Bar */}
        <div className="filter-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              className="search-input"
              style={{ width: '100%' }}
              placeholder="Search by reference code or subject identifier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '200px' }}>
            <select
              className="search-input"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Rights & Types</option>
              <option value="ACCESS">Right to Access</option>
              <option value="CORRECTION">Right to Correction</option>
              <option value="ERASURE">Right to Erasure (RTBF)</option>
              <option value="CONSENT_WITHDRAWAL">Consent Withdrawal</option>
              <option value="GRIEVANCE">Grievance Management</option>
              <option value="RECTIFICATION">Right to Rectification</option>
              <option value="RESTRICTION">Restriction of Processing</option>
              <option value="PORTABILITY">Data Portability</option>
              <option value="OBJECTION">Right to Object</option>
            </select>
          </div>

          <div style={{ minWidth: '200px' }}>
            <select
              className="search-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Workflow Stages</option>
              <option value="SUBMITTED">1. Submitted</option>
              <option value="IDENTITY_VERIFICATION">2. Identity Verification</option>
              <option value="CASE_ASSIGNED">3. Case Assigned</option>
              <option value="DATA_COLLECTION">4. Data Collection</option>
              <option value="APPROVAL_PENDING">5. Approval Pending</option>
              <option value="RESPONSE_GENERATION">6. Response Generation</option>
              <option value="CLOSED">7. Closed / Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* DSR Table */}
        <DSRTable
          dsrs={dsrs}
          loading={loading}
          error={error}
          onView={(dsr) => setSelectedDsr(dsr)}
          onUpdateStatus={(dsr) => setSelectedDsr(dsr)}
          onDelete={canDeleteDSR ? handleDelete : null}
          deletingId={deletingId}
          canManage={canManageDSR}
        />

        {/* Create DSR Form Modal */}
        {showForm && (
          <DSRForm
            users={users}
            onClose={() => setShowForm(false)}
            onSuccess={() => {
              setShowForm(false);
              loadData();
            }}
            onSubmitForm={handleCreateSubmit}
          />
        )}

        {/* DSR Details Modal */}
        {selectedDsr && (
          <DSRDetailsModal
            dsr={selectedDsr}
            users={users}
            onClose={() => setSelectedDsr(null)}
            onStatusUpdate={handleStatusUpdate}
            canManage={canManageDSR}
          />
        )}
      </main>
    </div>
  );
}
