import React, { useState, useEffect } from 'react';

const LEGAL_BASIS_OPTIONS = [
  { value: 'CONSENT', label: 'Consent (Art. 6(1)(a))' },
  { value: 'CONTRACT', label: 'Contract (Art. 6(1)(b))' },
  { value: 'LEGAL_OBLIGATION', label: 'Legal Obligation (Art. 6(1)(c))' },
  { value: 'VITAL_INTERESTS', label: 'Vital Interests (Art. 6(1)(d))' },
  { value: 'PUBLIC_TASK', label: 'Public Task (Art. 6(1)(e))' },
  { value: 'LEGITIMATE_INTERESTS', label: 'Legitimate Interests (Art. 6(1)(f))' }
];

export default function PurposeForm({
  initialData = null,
  onClose,
  onSuccess,
  onSubmitForm
}) {
  const isEdit = Boolean(initialData && initialData.id);

  const [purposeCode, setPurposeCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [legalBasis, setLegalBasis] = useState('CONSENT');
  const [version, setVersion] = useState('1.0');
  const [status, setStatus] = useState('ACTIVE');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData) {
      setPurposeCode(initialData.purpose_code || '');
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setLegalBasis(initialData.legal_basis || 'CONSENT');
      setVersion(initialData.version || '1.0');
      setStatus(initialData.status || 'ACTIVE');
    } else {
      setPurposeCode('');
      setName('');
      setDescription('');
      setLegalBasis('CONSENT');
      setVersion('1.0');
      setStatus('ACTIVE');
    }
  }, [initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!purposeCode.trim()) {
      setError('Purpose code is required');
      return;
    }
    if (!name.trim()) {
      setError('Purpose name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        name: name.trim(),
        description: description.trim(),
        legal_basis: legalBasis,
        version: version.trim() || '1.0',
        status
      };

      if (!isEdit) {
        payload.purpose_code = purposeCode.trim().toUpperCase();
      }

      await onSubmitForm(payload);
      onSuccess();
    } catch (err) {
      console.error('Purpose Form error:', err);
      if (err.status === 403) {
        setError('You do not have permission to perform this action.');
      } else {
        setError(err.message || 'Failed to save consent purpose');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">
            {isEdit ? 'Edit Consent Purpose' : 'Create Processing Purpose'}
          </h2>
          <button className="btn-close" onClick={onClose} disabled={submitting}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="alert-error" style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171' }}>
              {error}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">
              Purpose Code <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={purposeCode}
              onChange={(e) => setPurposeCode(e.target.value)}
              placeholder="e.g. PURP-MARKETING, PURP-ANALYTICS"
              disabled={isEdit || submitting}
              required
            />
            {isEdit && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Purpose code is an immutable identifier and cannot be changed.
              </span>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">
              Purpose Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Email Marketing Communications"
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">
              Legal Basis (GDPR Art. 6) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="form-input"
              value={legalBasis}
              onChange={(e) => setLegalBasis(e.target.value)}
              disabled={submitting}
              required
            >
              {LEGAL_BASIS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Version</label>
              <input
                type="text"
                className="form-input"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0"
                disabled={submitting}
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={submitting || (isEdit && initialData?.status === 'ARCHIVED')}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                {isEdit && <option value="ARCHIVED">Archived</option>}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Description & Data Types</label>
            <textarea
              className="form-input"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the scope of data processing, categories of data collected, and intended usage..."
              disabled={submitting}
            />
          </div>

          <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Purpose'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
