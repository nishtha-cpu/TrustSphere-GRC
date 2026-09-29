import React, { useState, useEffect } from 'react';

export default function RiskForm({ onClose, onSuccess, onSubmitForm, initialData }) {
  const isEditMode = Boolean(initialData && initialData.id);

  const [formData, setFormData] = useState({
    tenant_id: 1,
    risk_code: '',
    title: '',
    description: '',
    category_id: 1,
    owner_id: 1,
    status: 'IDENTIFIED'
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        tenant_id: initialData.tenant_id || 1,
        risk_code: initialData.risk_code || '',
        title: initialData.title || '',
        description: initialData.description || '',
        category_id: initialData.category_id || 1,
        owner_id: initialData.owner_id || 1,
        status: initialData.status || 'IDENTIFIED'
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'category_id' || name === 'owner_id' || name === 'tenant_id' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.risk_code.trim() || !formData.title.trim() || !formData.description.trim()) {
      setFormError('Please fill in all required fields (Risk Code, Title, Description).');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitForm(formData);
      onSuccess();
    } catch (err) {
      console.error('Form submission failed:', err);
      setFormError(err.message || 'Operation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h2 className="modal-title">{isEditMode ? 'Edit Risk' : 'Create New Risk'}</h2>
          <button type="button" className="btn-close" onClick={onClose}>&times;</button>
        </div>

        {formError && (
          <div className="form-error-alert">{formError}</div>
        )}

        <form onSubmit={handleSubmit} className="risk-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="risk_code">Risk Code *</label>
              <input
                type="text"
                id="risk_code"
                name="risk_code"
                value={formData.risk_code}
                onChange={handleChange}
                placeholder="e.g. RSK-2026-004"
                disabled={isEditMode}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="IDENTIFIED">IDENTIFIED</option>
                <option value="ASSESSED">ASSESSED</option>
                <option value="MITIGATED">MITIGATED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Summary of the risk"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              rows="3"
              value={formData.description}
              onChange={handleChange}
              placeholder="Detailed description of the risk impact and context"
              required
            ></textarea>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="category_id">Category ID *</label>
              <input
                type="number"
                id="category_id"
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="owner_id">Owner User ID *</label>
              <input
                type="number"
                id="owner_id"
                name="owner_id"
                value={formData.owner_id}
                onChange={handleChange}
                min="1"
                required
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting
                ? (isEditMode ? 'Updating Risk...' : 'Saving Risk...')
                : (isEditMode ? 'Update Risk' : 'Create Risk')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
