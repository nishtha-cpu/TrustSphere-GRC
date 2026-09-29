import React, { useState, useEffect } from 'react';
import { getUsers } from '../../services/auditService';

export default function AuditForm({ initialData, onClose, onSuccess, onSubmitForm }) {
  const isEdit = Boolean(initialData && initialData.id);

  const [formData, setFormData] = useState({
    audit_code: initialData?.audit_code || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    audit_type: initialData?.audit_type || 'INTERNAL',
    lead_auditor_id: initialData?.lead_auditor_id || 1,
    status: initialData?.status || 'PLANNED',
    planned_start_date: initialData?.planned_start_date ? initialData.planned_start_date.substring(0, 10) : '',
    planned_end_date: initialData?.planned_end_date ? initialData.planned_end_date.substring(0, 10) : '',
    actual_start_date: initialData?.actual_start_date ? initialData.actual_start_date.substring(0, 10) : '',
    actual_end_date: initialData?.actual_end_date ? initialData.actual_end_date.substring(0, 10) : '',
    scope: initialData?.scope || '',
    objectives: initialData?.objectives || ''
  });

  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        const userList = await getUsers(1);
        setUsers(userList);
      } catch (err) {
        console.error('Failed to load user list:', err);
      }
    }
    loadUsers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'lead_auditor_id' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Client-side required field validation
    if (!formData.audit_code.trim()) {
      setFormError('Audit Code is required');
      return;
    }
    if (!formData.title.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!formData.audit_type) {
      setFormError('Audit Type is required');
      return;
    }
    if (!formData.lead_auditor_id) {
      setFormError('Lead Auditor is required');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitForm(formData);
      onSuccess();
    } catch (err) {
      console.error('Audit form submission error:', err);
      setFormError(err.message || 'Failed to save audit engagement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEdit ? `Edit Audit: ${initialData.audit_code}` : 'Create Audit Engagement'}
          </h2>
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
              <label>Audit Code *</label>
              <input
                type="text"
                name="audit_code"
                value={formData.audit_code}
                onChange={handleChange}
                placeholder="e.g. AUD-2026-001"
                disabled={isEdit}
                required
              />
            </div>

            <div className="form-group">
              <label>Audit Type *</label>
              <select
                name="audit_type"
                value={formData.audit_type}
                onChange={handleChange}
                required
              >
                <option value="INTERNAL">Internal</option>
                <option value="EXTERNAL">External</option>
                <option value="REGULATORY">Regulatory</option>
                <option value="CERTIFICATION">Certification</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Audit Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Annual Information Security Controls Audit"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              rows={2}
              value={formData.description}
              onChange={handleChange}
              placeholder="Brief summary of audit engagement..."
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Lead Auditor *</label>
              <select
                name="lead_auditor_id"
                value={formData.lead_auditor_id}
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
              <label>Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="PLANNED">Planned</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="FIELDWORK_COMPLETE">Fieldwork Complete</option>
                <option value="REPORTING">Reporting</option>
                <option value="CLOSED">Closed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Planned Start Date</label>
              <input
                type="date"
                name="planned_start_date"
                value={formData.planned_start_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Planned End Date</label>
              <input
                type="date"
                name="planned_end_date"
                value={formData.planned_end_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Actual Start Date</label>
              <input
                type="date"
                name="actual_start_date"
                value={formData.actual_start_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Actual End Date</label>
              <input
                type="date"
                name="actual_end_date"
                value={formData.actual_end_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Scope</label>
              <textarea
                name="scope"
                rows={2}
                value={formData.scope}
                onChange={handleChange}
                placeholder="Audit scope and system boundaries..."
              />
            </div>

            <div className="form-group">
              <label>Objectives</label>
              <textarea
                name="objectives"
                rows={2}
                value={formData.objectives}
                onChange={handleChange}
                placeholder="Audit objectives and compliance criteria..."
              />
            </div>
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
              {submitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Audit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
