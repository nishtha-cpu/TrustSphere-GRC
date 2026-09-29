import React, { useState, useEffect } from 'react';
import { getUsers } from '../../services/auditService';

export default function AuditCapaForm({
  findings = [],
  preselectedFindingId = null,
  initialData = null,
  onClose,
  onSuccess,
  onSubmitForm
}) {
  const isEdit = Boolean(initialData && initialData.id);

  const todayStr = new Date().toISOString().substring(0, 10);

  const defaultFindingId = initialData?.finding_id
    ? initialData.finding_id
    : preselectedFindingId || (findings.length > 0 ? findings[0].id : '');

  const [formData, setFormData] = useState({
    finding_id: defaultFindingId,
    capa_code: initialData?.capa_code || '',
    action_plan: initialData?.action_plan || '',
    owner_id: initialData?.owner_id || (1),
    due_date: initialData?.due_date ? initialData.due_date.substring(0, 10) : '',
    status: initialData?.status || 'ASSIGNED',
    completion_date: initialData?.completion_date ? initialData.completion_date.substring(0, 10) : '',
    verification_notes: initialData?.verification_notes || '',
    verified_by: initialData?.verified_by || '',
    verified_at: initialData?.verified_at ? initialData.verified_at.substring(0, 10) : ''
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
        console.error('Failed to load user options for CAPA owner:', err);
      }
    }
    loadUsers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'finding_id' || name === 'owner_id' || name === 'verified_by')
        ? (value === '' ? '' : Number(value))
        : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // 1. Basic required fields
    if (!formData.finding_id) {
      setFormError('Please select a Finding.');
      return;
    }
    if (!isEdit && !formData.capa_code.trim()) {
      setFormError('CAPA Code is required.');
      return;
    }
    if (!formData.action_plan.trim()) {
      setFormError('Action Plan is required.');
      return;
    }
    if (!formData.owner_id) {
      setFormError('CAPA Owner is required.');
      return;
    }
    if (!formData.due_date) {
      setFormError('Due Date is required.');
      return;
    }

    // 2. Conditional verification rules
    if (formData.status === 'VERIFIED') {
      if (!formData.verified_by || !formData.verified_at) {
        setFormError('When status is VERIFIED, Verified By and Verified Date are required.');
        return;
      }
    }

    if (formData.status === 'CLOSED') {
      if (!formData.completion_date || !formData.verified_by || !formData.verified_at) {
        setFormError('When status is CLOSED, Completion Date, Verified By, and Verified Date are required.');
        return;
      }
    }

    // Prepare payload
    const payload = {
      finding_id: Number(formData.finding_id),
      capa_code: formData.capa_code.trim(),
      action_plan: formData.action_plan.trim(),
      owner_id: Number(formData.owner_id),
      due_date: formData.due_date,
      status: formData.status,
      completion_date: formData.completion_date || null,
      verification_notes: formData.verification_notes || null,
      verified_by: formData.verified_by ? Number(formData.verified_by) : null,
      verified_at: formData.verified_at || null
    };

    try {
      setSubmitting(true);
      await onSubmitForm(payload);
      onSuccess();
    } catch (err) {
      console.error('CAPA form submission error:', err);
      setFormError(err.message || 'Failed to save CAPA');
    } finally {
      setSubmitting(false);
    }
  };

  const showVerificationFields = formData.status === 'VERIFIED' || formData.status === 'CLOSED';
  const showCompletionField = formData.status === 'CLOSED' || formData.status === 'VERIFIED' || formData.status === 'SUBMITTED';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEdit ? `Edit CAPA: ${initialData.capa_code}` : 'Create Corrective Action (CAPA)'}
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
              <label>Finding Scope *</label>
              <select
                name="finding_id"
                value={formData.finding_id}
                onChange={handleChange}
                disabled={isEdit}
                required
              >
                <option value="">Select a Finding</option>
                {findings.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.finding_code} — {f.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>CAPA Code *</label>
              <input
                type="text"
                name="capa_code"
                value={formData.capa_code}
                onChange={handleChange}
                placeholder="e.g. CAPA-2026-001"
                disabled={isEdit}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Action Plan *</label>
            <textarea
              name="action_plan"
              rows={3}
              value={formData.action_plan}
              onChange={handleChange}
              placeholder="Detailed corrective action plan, remediation steps, and preventive measures..."
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Assigned Owner *</label>
              <select
                name="owner_id"
                value={formData.owner_id}
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
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="VERIFIED">Verified</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Target Due Date *</label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                required
              />
            </div>

            {showCompletionField && (
              <div className="form-group">
                <label>Completion Date {formData.status === 'CLOSED' ? '*' : ''}</label>
                <input
                  type="date"
                  name="completion_date"
                  value={formData.completion_date}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>

          {showVerificationFields && (
            <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px dashed var(--card-border)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#818cf8', fontSize: '0.9rem' }}>
                Verification & Closure Sign-off
              </h4>

              <div className="form-grid">
                <div className="form-group">
                  <label>Verified By *</label>
                  <select
                    name="verified_by"
                    value={formData.verified_by}
                    onChange={handleChange}
                  >
                    <option value="">Select Verifier</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Verified Date *</label>
                  <input
                    type="date"
                    name="verified_at"
                    value={formData.verified_at}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label>Verification Notes</label>
                <textarea
                  name="verification_notes"
                  rows={2}
                  value={formData.verification_notes}
                  onChange={handleChange}
                  placeholder="Notes on testing, validation evidence, or sign-off approval..."
                />
              </div>
            </div>
          )}

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
              {submitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create CAPA')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
