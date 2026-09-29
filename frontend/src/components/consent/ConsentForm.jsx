import React, { useState, useEffect } from 'react';

export default function ConsentForm({
  purposes = [],
  users = [],
  onClose,
  onSuccess,
  onSubmitForm
}) {
  const [purposeId, setPurposeId] = useState('');
  const [dataSubjectType, setDataSubjectType] = useState('EXTERNAL_DATA_SUBJECT');
  const [userId, setUserId] = useState('');
  const [dataSubjectIdentifier, setDataSubjectIdentifier] = useState('');
  const [status, setStatus] = useState('GRANTED');
  const [consentVersion, setConsentVersion] = useState('1.0');
  const [source, setSource] = useState('WEB_FORM');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (purposes && purposes.length > 0) {
      const activePurposes = purposes.filter(p => p.status === 'ACTIVE');
      if (activePurposes.length > 0) {
        setPurposeId(activePurposes[0].id);
      } else {
        setPurposeId(purposes[0].id);
      }
    }
  }, [purposes]);

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
    if (!purposeId) {
      setError('Please select a valid processing purpose.');
      return;
    }
    if (!dataSubjectIdentifier.trim()) {
      setError('Data subject identifier is required (e.g., email address or subject ID).');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        purpose_id: Number(purposeId),
        data_subject_type: dataSubjectType,
        data_subject_identifier: dataSubjectIdentifier.trim(),
        status,
        consent_version: consentVersion.trim() || '1.0',
        source: source.trim() || 'WEB_FORM',
        notes: notes.trim()
      };

      if (dataSubjectType === 'APPLICATION_USER' && userId) {
        payload.user_id = Number(userId);
      }

      await onSubmitForm(payload);
      onSuccess();
    } catch (err) {
      console.error('Consent Record Form error:', err);
      if (err.status === 403) {
        setError('You do not have permission to perform this action.');
      } else {
        setError(err.message || 'Failed to record data subject consent');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container" style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Record Data Subject Consent</h2>
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
              Processing Purpose <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="form-input"
              value={purposeId}
              onChange={(e) => setPurposeId(e.target.value)}
              disabled={submitting}
              required
            >
              <option value="">Select Processing Purpose...</option>
              {purposes.map((p) => (
                <option key={p.id} value={p.id} disabled={p.status === 'ARCHIVED'}>
                  [{p.purpose_code}] {p.name} ({p.status})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Data Subject Type</label>
              <select
                className="form-input"
                value={dataSubjectType}
                onChange={(e) => {
                  setDataSubjectType(e.target.value);
                  if (e.target.value === 'EXTERNAL_DATA_SUBJECT') {
                    setUserId('');
                  }
                }}
                disabled={submitting}
              >
                <option value="EXTERNAL_DATA_SUBJECT">External Data Subject</option>
                <option value="APPLICATION_USER">Application User</option>
              </select>
            </div>

            {dataSubjectType === 'APPLICATION_USER' && (
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Select App User</label>
                <select
                  className="form-input"
                  value={userId}
                  onChange={(e) => handleUserSelect(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select User (Optional)...</option>
                  {users.map((u) => (
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
              placeholder="e.g. user@example.com or subject-uuid-1234"
              disabled={submitting}
              required
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Unique identifier for the data subject (e.g., email, UUID, or user identifier).
            </span>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Initial Consent Status</label>
              <select
                className="form-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={submitting}
              >
                <option value="GRANTED">GRANTED (Consent Given)</option>
                <option value="DENIED">DENIED (Consent Refused)</option>
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Consent Version</label>
              <input
                type="text"
                className="form-input"
                value={consentVersion}
                onChange={(e) => setConsentVersion(e.target.value)}
                placeholder="1.0"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Collection Source</label>
            <select
              className="form-input"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              disabled={submitting}
            >
              <option value="WEB_FORM">Web Registration Form</option>
              <option value="MOBILE_APP">Mobile Application</option>
              <option value="PRIVACY_PORTAL">Privacy Preference Center</option>
              <option value="API">API Integration</option>
              <option value="MANUAL_ENTRY">Manual / Admin Entry</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Collection Notes / Context</label>
            <textarea
              className="form-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide context regarding how consent was collected or documented..."
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
              {submitting ? 'Recording...' : 'Record Consent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
