import React, { useState, useEffect } from 'react';
import { getUsers } from '../../services/auditService';

export default function PolicyForm({
  initialData = null,
  onClose,
  onSuccess,
  onSubmitForm
}) {
  const isEdit = Boolean(initialData && initialData.id);
  const isArchived = initialData?.status === 'ARCHIVED';

  const [formData, setFormData] = useState({
    policy_code: initialData?.policy_code || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    policy_type: initialData?.policy_type || 'INFORMATION_SECURITY',
    owner_id: initialData?.owner_id || 1,
    status: initialData?.status || 'DRAFT',
    review_date: initialData?.review_date ? initialData.review_date.substring(0, 10) : '',
    effective_date: initialData?.effective_date ? initialData.effective_date.substring(0, 10) : '',
    expiry_date: initialData?.expiry_date ? initialData.expiry_date.substring(0, 10) : ''
  });

  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        const userList = await getUsers(1);
        setUsers(userList);
        if (!initialData && userList.length > 0 && !formData.owner_id) {
          setFormData(prev => ({ ...prev, owner_id: userList[0].id }));
        }
      } catch (err) {
        console.error('Failed to load users for policy owner select:', err);
      }
    }
    loadUsers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'owner_id' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (isArchived) {
      setFormError('Cannot update an archived policy.');
      return;
    }

    if (!isEdit && !formData.policy_code.trim()) {
      setFormError('Policy Code is required.');
      return;
    }
    if (!formData.title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!formData.policy_type) {
      setFormError('Policy Type is required.');
      return;
    }
    if (!formData.owner_id) {
      setFormError('Policy Owner is required.');
      return;
    }

    // Validate dates
    if (formData.effective_date && formData.expiry_date) {
      if (new Date(formData.expiry_date) < new Date(formData.effective_date)) {
        setFormError('Expiry date cannot be earlier than effective date.');
        return;
      }
    }

    try {
      setSubmitting(true);
      await onSubmitForm(formData);
      onSuccess();
    } catch (err) {
      console.error('Policy form submission error:', err);
      setFormError(err.message || 'Failed to save policy');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEdit ? `Edit Policy: ${initialData.policy_code}` : 'Create Policy'}
          </h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        {isArchived && (
          <div className="form-error-alert">
            🔒 <strong>Archived Policy:</strong> This policy is archived and cannot be edited.
          </div>
        )}

        {formError && !isArchived && (
          <div className="form-error-alert">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="risk-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Policy Code *</label>
              <input
                type="text"
                name="policy_code"
                value={formData.policy_code}
                onChange={handleChange}
                placeholder="e.g. POL-SEC-001"
                disabled={isEdit || isArchived}
                required
              />
            </div>

            <div className="form-group">
              <label>Policy Category / Type *</label>
              <select
                name="policy_type"
                value={formData.policy_type}
                onChange={handleChange}
                disabled={isArchived}
                required
              >
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
          </div>

          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Access Control and Authentication Policy"
              disabled={isArchived}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Overview, scope, and objectives of this policy document..."
              disabled={isArchived}
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Policy Owner *</label>
              <select
                name="owner_id"
                value={formData.owner_id}
                onChange={handleChange}
                disabled={isArchived}
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
                disabled={isArchived}
                required
              >
                <option value="DRAFT">Draft</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Next Review Date</label>
              <input
                type="date"
                name="review_date"
                value={formData.review_date}
                onChange={handleChange}
                disabled={isArchived}
              />
            </div>

            <div className="form-group">
              <label>Effective Date</label>
              <input
                type="date"
                name="effective_date"
                value={formData.effective_date}
                onChange={handleChange}
                disabled={isArchived}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Expiry Date</label>
            <input
              type="date"
              name="expiry_date"
              value={formData.expiry_date}
              onChange={handleChange}
              disabled={isArchived}
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
              disabled={submitting || isArchived}
            >
              {submitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Policy')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
