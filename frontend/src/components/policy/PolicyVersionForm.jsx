import React, { useState, useEffect } from 'react';
import { getUsers } from '../../services/auditService';

export default function PolicyVersionForm({
  policyId,
  nextVersionNumber = 1,
  onClose,
  onSuccess,
  onSubmitForm
}) {
  const [formData, setFormData] = useState({
    version_number: nextVersionNumber,
    version_label: `${nextVersionNumber}.0`,
    content: '',
    change_summary: '',
    created_by: 1
  });

  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        const userList = await getUsers(1);
        setUsers(userList);
        if (userList.length > 0 && !formData.created_by) {
          setFormData(prev => ({ ...prev, created_by: userList[0].id }));
        }
      } catch (err) {
        console.error('Failed to load users for version creator select:', err);
      }
    }
    loadUsers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'version_number' || name === 'created_by'
        ? (value === '' ? '' : Number(value))
        : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    const numVer = Number(formData.version_number);
    if (!formData.version_number || isNaN(numVer) || numVer <= 0 || !Number.isInteger(numVer)) {
      setFormError('Version number must be a positive integer (e.g. 1, 2, 3).');
      return;
    }

    if (!formData.version_label || !formData.version_label.trim()) {
      setFormError('Version label is required (e.g. 1.0, 1.1).');
      return;
    }

    if (!formData.content || !formData.content.trim()) {
      setFormError('Policy content text is required.');
      return;
    }

    if (!formData.created_by) {
      setFormError('Author / Creator user is required.');
      return;
    }

    const payload = {
      version_number: numVer,
      version_label: formData.version_label.trim(),
      content: formData.content.trim(),
      change_summary: formData.change_summary ? formData.change_summary.trim() : null,
      created_by: Number(formData.created_by)
    };

    try {
      setSubmitting(true);
      await onSubmitForm(payload);
      onSuccess();
    } catch (err) {
      console.error('Policy version creation error:', err);
      setFormError(err.message || 'Failed to create policy version');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create New Policy Version</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        {formError && (
          <div className="form-error-alert">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="risk-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Sequential Version Number *</label>
              <input
                type="number"
                name="version_number"
                value={formData.version_number}
                onChange={handleChange}
                placeholder="e.g. 1, 2, 3"
                min="1"
                step="1"
                required
              />
            </div>

            <div className="form-group">
              <label>Display Version Label *</label>
              <input
                type="text"
                name="version_label"
                value={formData.version_label}
                onChange={handleChange}
                placeholder="e.g. 1.0, 1.1, 2.0"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Author / Creator *</label>
            <select
              name="created_by"
              value={formData.created_by}
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
          </div>

          <div className="form-group">
            <label>Policy Content Text / Markdown *</label>
            <textarea
              name="content"
              rows={8}
              value={formData.content}
              onChange={handleChange}
              placeholder="# Policy Title&#10;&#10;1. Purpose and Scope&#10;2. Policy Statements..."
              required
            />
          </div>

          <div className="form-group">
            <label>Revision / Change Summary</label>
            <textarea
              name="change_summary"
              rows={2}
              value={formData.change_summary}
              onChange={handleChange}
              placeholder="Summary of revisions, additions, or policy changes in this version..."
            />
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
              {submitting ? 'Saving...' : 'Create Version'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
