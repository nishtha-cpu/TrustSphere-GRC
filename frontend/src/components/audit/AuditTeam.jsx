import React, { useState, useEffect } from 'react';
import AuditTeamForm from './AuditTeamForm';
import {
  getAuditTeam,
  addAuditTeamMember,
  updateAuditTeamMember,
  deleteAuditTeamMember
} from '../../services/auditTeamService';

export default function AuditTeam({ auditId, onAuditUpdated }) {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);

  const loadTeam = async () => {
    try {
      setLoading(true);
      setError(null);
      setActionError(null);
      const data = await getAuditTeam(auditId, 1);
      setTeam(data);
    } catch (err) {
      console.error('Failed to load audit team:', err);
      setError(err.message || 'Failed to load audit team from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auditId) {
      loadTeam();
    }
  }, [auditId]);

  const handleOpenAdd = () => {
    setSelectedMember(null);
    setActionError(null);
    setShowForm(true);
  };

  const handleOpenEdit = (member) => {
    setSelectedMember(member);
    setActionError(null);
    setShowForm(true);
  };

  const handleRemoveMember = async (member) => {
    setActionError(null);
    const memberName = member.first_name ? `${member.first_name} ${member.last_name}` : `User #${member.user_id}`;
    const confirmed = window.confirm(
      `Are you sure you want to remove ${memberName} from this audit team?`
    );

    if (!confirmed) return;

    try {
      setDeletingUserId(member.user_id);
      await deleteAuditTeamMember(auditId, member.user_id, 1);
      await loadTeam();
    } catch (err) {
      console.error('Failed to remove team member:', err);
      setActionError(err.message || 'Failed to remove team member');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleFormSubmit = async (formData) => {
    if (selectedMember && selectedMember.user_id) {
      await updateAuditTeamMember(auditId, selectedMember.user_id, {
        role_in_audit: formData.role_in_audit
      });
    } else {
      await addAuditTeamMember(auditId, formData);
    }

    if (formData.role_in_audit === 'LEAD_AUDITOR' && onAuditUpdated) {
      onAuditUpdated();
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedMember(null);
    loadTeam();
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'LEAD_AUDITOR':
        return 'Lead Auditor';
      case 'AUDITOR':
        return 'Auditor';
      case 'OBSERVER':
        return 'Observer';
      case 'SUBJECT_MATTER_EXPERT':
        return 'Subject Matter Expert';
      default:
        return role;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="team-container">
      <div className="action-bar" style={{ marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
            Assigned Audit Auditors & Specialists
          </h3>
        </div>
        <button className="btn-primary" onClick={handleOpenAdd}>
          <span>+</span> Add Team Member
        </button>
      </div>

      {actionError && (
        <div className="form-error-alert" style={{ marginBottom: '1rem' }}>
          {actionError}
        </div>
      )}

      {loading && (
        <div className="table-card table-state-container">
          <p className="state-message">Loading audit team...</p>
        </div>
      )}

      {error && (
        <div className="table-card table-state-container error-state">
          <p className="state-message">Error: {error}</p>
        </div>
      )}

      {!loading && !error && (!team || team.length === 0) && (
        <div className="table-card table-state-container">
          <p className="state-message">No team members assigned to this audit.</p>
        </div>
      )}

      {!loading && !error && team && team.length > 0 && (
        <div className="table-card">
          <table className="risk-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Assigned Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {team.map((member) => {
                const isLead = member.role_in_audit === 'LEAD_AUDITOR';
                return (
                  <tr key={member.user_id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                        {member.first_name} {member.last_name}
                      </div>
                    </td>
                    <td>{member.email}</td>
                    <td>
                      <span className={`status-badge ${isLead ? 'role-lead' : 'status-planned'}`}>
                        {getRoleLabel(member.role_in_audit)}
                      </span>
                    </td>
                    <td>{formatDate(member.created_at)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          title="Edit Role"
                          onClick={() => handleOpenEdit(member)}
                          disabled={deletingUserId === member.user_id}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon"
                          title="Remove Team Member"
                          onClick={() => handleRemoveMember(member)}
                          disabled={deletingUserId === member.user_id}
                        >
                          {deletingUserId === member.user_id ? '⏳' : '🗑️'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AuditTeamForm
          auditId={auditId}
          initialData={selectedMember}
          onClose={() => { setShowForm(false); setSelectedMember(null); }}
          onSuccess={handleFormSuccess}
          onSubmitForm={handleFormSubmit}
        />
      )}
    </div>
  );
}
