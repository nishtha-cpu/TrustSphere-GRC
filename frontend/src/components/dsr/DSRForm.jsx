import React, { useState, useEffect } from 'react';

const REQUEST_TYPE_OPTIONS = [
  { value: 'ACCESS', label: 'Right to Access (GDPR Art. 15)' },
  { value: 'RECTIFICATION', label: 'Right to Rectification (GDPR Art. 16)' },
  { value: 'ERASURE', label: 'Right to Erasure / Right to be Forgotten (GDPR Art. 17)' },
  { value: 'RESTRICTION', label: 'Restriction of Processing (GDPR Art. 18)' },
  { value: 'PORTABILITY', label: 'Data Portability (GDPR Art. 20)' },
  { value: 'OBJECTION', label: 'Right to Object (GDPR Art. 21)' }
];

export default function DSRForm({
  users = [],
  onClose,
  onSuccess,
  onSubmitForm
}) {
  const [dataSubjectIdentifier, setDataSubjectIdentifier] = useState('');
  const [dataSubjectType, setDataSubjectType] = useState('EXTERNAL');
  const [userId, setUserId] = useState('');
  const [requestType, setRequestType] = useState('ACCESS');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDays, setDueDays] = useState('30');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleUserSelect = (selectedUserId) => {
    setUserId(selectedUserId);
    if (selectedUserId) {
      const matched = users.find(u => String(u.id) === String(selectedUserId));
      if (matched) {
        setDataSubjectIdentifier(matched.email || matched.name || `user-${matched.id}`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dataSubjectIdentifier.trim()) {
      setError('Data subject identifier is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const days = parseInt(dueDays, 10) || 30;
      const dueDateObj = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      const dueAtFormatted = dueDateObj.toISOString().slice(0, 19).replace('T', ' ');

      const payload = {
        data_subject_identifier: dataSubjectIdentifier.trim(),
        request_type: requestType,
        description: description.trim() || null,
        due_at: dueAtFormatted
      };

      if (dataSubjectType === 'APP_USER' && userId) {
        payload.user_id = Number(userId);
      }

      if (assignedTo) {
        payload.assigned_to = Number(assignedTo);
      }

      await onSubmitForm(payload);
      onSuccess();
    } catch (err) {
      console.error('DSR Form Error:', err);
      if (err.status === 403) {
        setError('You do not have permission to submit Data Subject Requests.');
      } else {
        setError(err.message || 'Failed to submit Data Subject Request');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container" style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Log Data Subject Request (DSR)</h2>
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

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Subject Category</label>
              <select
                className="form-input"
                value={dataSubjectType}
                onChange={(e) => {
                  setDataSubjectType(e.target.value);
                  if (e.target.value === 'EXTERNAL') setUserId('');
                }}
                disabled={submitting}
              >
                <option value="EXTERNAL">External Data Subject</option>
                <option value="APP_USER">Application User</option>
              </select>
            </div>

            {dataSubjectType === 'APP_USER' && (
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Select Application User</label>
                <select
                  className="form-input"
                  value={userId}
                  onChange={(e) => handleUserSelect(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select User...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email} (#{u.id})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">
              Data Subject Identifier <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={dataSubjectIdentifier}
              onChange={(e) => setDataSubjectIdentifier(e.target.value)}
              placeholder="e.g., subject@example.com or Customer UUID"
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">
              Request Type (GDPR Right) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="form-input"
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              disabled={submitting}
              required
            >
              {REQUEST_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Assign Officer / Handler</label>
              <select
                className="form-input"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                disabled={submitting}
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Response Due Window</label>
              <select
                className="form-input"
                value={dueDays}
                onChange={(e) => setDueDays(e.target.value)}
                disabled={submitting}
              >
                <option value="30">30 Days (Standard GDPR Statutory Limit)</option>
                <option value="15">15 Days (Priority Processing)</option>
                <option value="60">60 Days (Extended Complex Request)</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Request Scope & Description</label>
            <textarea
              className="form-input"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details regarding the data subject's request, specific systems involved, or scope of personal data affected..."
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
              {submitting ? 'Submitting...' : 'Log Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
