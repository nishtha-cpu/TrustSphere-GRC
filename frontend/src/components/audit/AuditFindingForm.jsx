import React, { useState, useEffect } from 'react';
import { getUsers } from '../../services/auditService';
import { getRisks } from '../../services/riskService';

export default function AuditFindingForm({ auditId, initialData, onClose, onSuccess, onSubmitForm }) {
  const isEdit = Boolean(initialData && initialData.id);

  const todayStr = new Date().toISOString().substring(0, 10);

  const [formData, setFormData] = useState({
    finding_code: initialData?.finding_code || '',
    title: initialData?.title || '',
    description: initialData?.description || '',
    severity: initialData?.severity || 'MEDIUM',
    status: initialData?.status || 'DRAFT',
    risk_id: initialData?.risk_id || '',
    identified_by: initialData?.identified_by || 1,
    identified_date: initialData?.identified_date ? initialData.identified_date.substring(0, 10) : todayStr
  });

  const [users, setUsers] = useState([]);
  const [risks, setRisks] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [userList, riskList] = await Promise.all([
          getUsers(1),
          getRisks(1).catch(() => [])
        ]);
        setUsers(userList);
        setRisks(riskList);
      } catch (err) {
        console.error('Failed to load form dropdown options:', err);
      }
    }
    loadOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'identified_by'
        ? Number(value)
        : name === 'risk_id'
          ? (value === '' ? null : Number(value))
          : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!isEdit && !formData.finding_code.trim()) {
      setFormError('Finding Code is required');
      return;
    }
    if (!formData.title.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!formData.description.trim()) {
      setFormError('Description is required');
      return;
    }
    if (!formData.severity) {
      setFormError('Severity is required');
      return;
    }
    if (!formData.status) {
      setFormError('Status is required');
      return;
    }
    if (!formData.identified_by) {
      setFormError('Identified By user is required');
      return;
    }
    if (!formData.identified_date) {
      setFormError('Identified Date is required');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmitForm(formData);
      onSuccess();
    } catch (err) {
      console.error('Finding form submission error:', err);
      setFormError(err.message || 'Failed to save audit finding');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEdit ? `Edit Finding: ${initialData.finding_code}` : 'Record Audit Finding'}
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
              <label>Finding Code *</label>
              <input
                type="text"
                name="finding_code"
                value={formData.finding_code}
                onChange={handleChange}
                placeholder="e.g. FND-2026-001"
                disabled={isEdit}
                required
              />
            </div>

            <div className="form-group">
              <label>Severity *</label>
              <select
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                required
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
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
              placeholder="e.g. Firewall Configuration Gap"
              required
            />
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Detailed description of audit finding and deficiency..."
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="DRAFT">Draft</option>
                <option value="OPEN">Open</option>
                <option value="IN_REMEDIATION">In Remediation</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div className="form-group">
              <label>Related Risk (Risk Register Traceability)</label>
              <select
                name="risk_id"
                value={formData.risk_id === null || formData.risk_id === undefined ? '' : formData.risk_id}
                onChange={handleChange}
              >
                <option value="">No related risk</option>
                {risks.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.risk_code} — {r.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Identified By *</label>
              <select
                name="identified_by"
                value={formData.identified_by}
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
              <label>Identified Date *</label>
              <input
                type="date"
                name="identified_date"
                value={formData.identified_date}
                onChange={handleChange}
                required
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
              {submitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Record Finding')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
