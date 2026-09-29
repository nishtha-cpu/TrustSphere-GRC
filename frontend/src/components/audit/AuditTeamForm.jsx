import React, { useState, useEffect } from 'react';
import { getUsers } from '../../services/auditService';

export default function AuditTeamForm({ initialData, onClose, onSuccess, onSubmitForm }) {
  const isEdit = Boolean(initialData && initialData.user_id);

  const [formData, setFormData] = useState({
    user_id: initialData?.user_id || 1,
    role_in_audit: initialData?.role_in_audit || 'AUDITOR'
  });

  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    async function loadUserOptions() {
      try {
        const userList = await getUsers(1);
        setUsers(userList);
        if (!isEdit && userList.length > 0) {
          setFormData(prev => ({ ...prev, user_id: userList[0].id }));
        }
      } catch (err) {
        console.error('Failed to load user list:', err);
      }
    }
    loadUserOptions();
  }, [isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'user_id' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.user_id) {
      setFormError('User selection is required');
      return;
    }
    if (!formData.role_in_audit) {
      setFormError('Role in audit is required');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitForm(formData);
      onSuccess();
    } catch (err) {
      console.error('Team form submission error:', err);
      setFormError(err.message || 'Failed to save team member assignment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEdit ? 'Edit Team Member Role' : 'Add Team Member'}
          </h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        {formError && (
          <div className="form-error-alert">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="risk-form">
          <div className="form-group">
            <label>User *</label>
            {isEdit ? (
              <input
                type="text"
                value={initialData.first_name ? `${initialData.first_name} ${initialData.last_name} (${initialData.email})` : `User #${initialData.user_id}`}
                disabled
              />
            ) : (
              <select
                name="user_id"
                value={formData.user_id}
                onChange={handleChange}
                required
              >
                {users.length > 0 ? (
                  users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))
                ) : (
                  <>
                    <option value={1}>John Doe (john.doe@acme.com)</option>
                    <option value={2}>Jane Smith (jane.smith@acme.com)</option>
                  </>
                )}
              </select>
            )}
          </div>

          <div className="form-group">
            <label>Role in Audit *</label>
            <select
              name="role_in_audit"
              value={formData.role_in_audit}
              onChange={handleChange}
              required
            >
              <option value="AUDITOR">Auditor</option>
              <option value="LEAD_AUDITOR">Lead Auditor</option>
              <option value="OBSERVER">Observer</option>
              <option value="SUBJECT_MATTER_EXPERT">Subject Matter Expert</option>
            </select>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : (isEdit ? 'Save Role' : 'Add Member')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
