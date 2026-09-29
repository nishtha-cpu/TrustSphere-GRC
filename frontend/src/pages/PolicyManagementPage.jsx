import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import PolicyTable from '../components/policy/PolicyTable';
import PolicyForm from '../components/policy/PolicyForm';
import {
  getPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy
} from '../services/policyService';
import { getUsers } from '../services/auditService';

export default function PolicyManagementPage({ onNavigate, onViewPolicy }) {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');

  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.policy_type = typeFilter;
      if (ownerFilter) params.owner_id = ownerFilter;

      const data = await getPolicies(params, 1);
      setPolicies(data);
    } catch (err) {
      console.error('Failed to load policies:', err);
      setError(err.message || 'Failed to load policies from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadUserOptions() {
      try {
        const uList = await getUsers(1);
        setUsers(uList);
      } catch (err) {
        console.error('Failed to load users for filter select:', err);
      }
    }
    loadUserOptions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, typeFilter, ownerFilter]);

  const handleOpenCreate = () => {
    setSelectedPolicy(null);
    setShowForm(true);
  };

  const handleOpenEdit = (policy) => {
    setSelectedPolicy(policy);
    setShowForm(true);
  };

  const handleDeletePolicy = async (id, code) => {
    if (deletingId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete policy "${code}"?\n\nNote: This is a soft deletion.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await deletePolicy(id, 1);
      await loadData();
    } catch (err) {
      console.error('Failed to delete policy:', err);
      alert(err.message || 'Failed to delete policy');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFormSubmit = async (formData) => {
    if (selectedPolicy && selectedPolicy.id) {
      await updatePolicy(selectedPolicy.id, formData);
    } else {
      await createPolicy(formData);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedPolicy(null);
    loadData();
  };

  return (
    <div className="app-container">
      <Header activeTab="policies" onNavigate={onNavigate} />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Policy Management</h1>
            <p className="page-subtitle">
              Create, manage, review and maintain organizational compliance and governance policies.
            </p>
          </div>
          <button className="btn-primary" onClick={handleOpenCreate}>
            <span>+</span> Create Policy
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="filter-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              className="search-input"
              style={{ width: '100%' }}
              placeholder="Search by policy code or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ minWidth: '150px' }}>
            <select
              className="search-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div style={{ minWidth: '180px' }}>
            <select
              className="search-input"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Policy Types</option>
              <option value="INFORMATION_SECURITY">Information Security</option>
              <option value="PRIVACY">Privacy</option>
              <option value="ACCESS_CONTROL">Access Control</option>
              <option value="INCIDENT_RESPONSE">Incident Response</option>
              <option value="BUSINESS_CONTINUITY">Business Continuity</option>
              <option value="DATA_RETENTION">Data Retention</option>
              <option value="ACCEPTABLE_USE">Acceptable Use</option>
              <option value="THIRD_PARTY">Third Party</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div style={{ minWidth: '160px' }}>
            <select
              className="search-input"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
            >
              <option value="">All Owners</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Policy Table */}
        <PolicyTable
          policies={policies}
          loading={loading}
          error={error}
          onView={onViewPolicy}
          onEdit={handleOpenEdit}
          onDelete={handleDeletePolicy}
          deletingId={deletingId}
        />

        {/* Policy Form Modal */}
        {showForm && (
          <PolicyForm
            initialData={selectedPolicy}
            onClose={() => {
              setShowForm(false);
              setSelectedPolicy(null);
            }}
            onSuccess={handleFormSuccess}
            onSubmitForm={handleFormSubmit}
          />
        )}
      </main>
    </div>
  );
}
