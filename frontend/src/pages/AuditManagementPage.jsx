import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import AuditTable from '../components/audit/AuditTable';
import AuditForm from '../components/audit/AuditForm';
import { getAudits, createAudit, updateAudit, deleteAudit } from '../services/auditService';

export default function AuditManagementPage({ onNavigate, onViewAudit }) {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadAudits = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAudits(1);
      setAudits(data);
    } catch (err) {
      console.error('Failed to load audits:', err);
      setError(err.message || 'Failed to load audit engagements from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudits();
  }, []);

  const handleOpenCreate = () => {
    setSelectedAudit(null);
    setShowForm(true);
  };

  const handleOpenEdit = (audit) => {
    setSelectedAudit(audit);
    setShowForm(true);
  };

  const handleViewAudit = (audit) => {
    if (onViewAudit) {
      onViewAudit(audit.id);
    }
  };

  const handleDeleteAudit = async (id) => {
    if (deletingId) return;

    try {
      setDeletingId(id);
      await deleteAudit(id, 1);
      await loadAudits();
    } catch (err) {
      console.error('Failed to delete audit:', err);
      alert(err.message || 'Failed to delete audit engagement');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFormSubmit = async (formData) => {
    if (selectedAudit && selectedAudit.id) {
      await updateAudit(selectedAudit.id, formData);
    } else {
      await createAudit(formData);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedAudit(null);
    loadAudits();
  };

  const filteredAudits = audits.filter(a => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.audit_code?.toLowerCase().includes(term) ||
      a.title?.toLowerCase().includes(term) ||
      a.lead_auditor_name?.toLowerCase().includes(term) ||
      a.status?.toLowerCase().includes(term) ||
      a.audit_type?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="app-container">
      <Header activeTab="audits" onNavigate={onNavigate} />
      <main className="main-content">
        <div className="page-header">
          <div className="page-title-row">
            <div>
              <h1 className="page-title">Audit Management</h1>
              <p className="page-description">
                Plan, schedule, and execute internal and external compliance audit engagements.
              </p>
            </div>
          </div>
        </div>

        <div className="action-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search audits by code, title, status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="btn-primary" onClick={handleOpenCreate}>
            <span>+</span> Create Audit
          </button>
        </div>

        <AuditTable
          audits={filteredAudits}
          loading={loading}
          error={error}
          onEdit={handleOpenEdit}
          onDelete={handleDeleteAudit}
          onView={handleViewAudit}
          deletingId={deletingId}
        />

        {showForm && (
          <AuditForm
            initialData={selectedAudit}
            onClose={() => { setShowForm(false); setSelectedAudit(null); }}
            onSuccess={handleFormSuccess}
            onSubmitForm={handleFormSubmit}
          />
        )}
      </main>
    </div>
  );
}
