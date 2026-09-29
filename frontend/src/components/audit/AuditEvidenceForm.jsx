import React, { useState, useEffect } from 'react';
import { getUsers } from '../../services/auditService';

export default function AuditEvidenceForm({
  auditId,
  findings = [],
  capasMap = {},
  onClose,
  onSuccess,
  onSubmitForm
}) {
  const [parentType, setParentType] = useState('AUDIT'); // AUDIT, FINDING, CAPA
  const [parentId, setParentId] = useState(auditId);

  const [formData, setFormData] = useState({
    file_name: '',
    file_key: '',
    file_size_bytes: '',
    mime_type: 'application/pdf',
    uploaded_by: 1
  });

  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Flatten all CAPAs with finding info
  const allCapas = [];
  findings.forEach(f => {
    const list = capasMap[f.id] || [];
    list.forEach(c => {
      allCapas.push({
        ...c,
        finding_code: f.finding_code
      });
    });
  });

  useEffect(() => {
    async function loadUsers() {
      try {
        const userList = await getUsers(1);
        setUsers(userList);
        if (userList.length > 0 && !formData.uploaded_by) {
          setFormData(prev => ({ ...prev, uploaded_by: userList[0].id }));
        }
      } catch (err) {
        console.error('Failed to load user options for evidence uploader:', err);
      }
    }
    loadUsers();
  }, []);

  // Update parentId when parentType changes
  const handleParentTypeChange = (e) => {
    const newType = e.target.value;
    setParentType(newType);
    setFormError(null);

    if (newType === 'AUDIT') {
      setParentId(auditId);
    } else if (newType === 'FINDING') {
      setParentId(findings.length > 0 ? findings[0].id : '');
    } else if (newType === 'CAPA') {
      setParentId(allCapas.length > 0 ? allCapas[0].id : '');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'uploaded_by' ? (value === '' ? '' : Number(value)) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // 1. Validate Parent
    if (parentType === 'AUDIT' && !auditId) {
      setFormError('Audit scope is invalid.');
      return;
    }
    if (parentType === 'FINDING' && !parentId) {
      setFormError('Please select a valid Finding.');
      return;
    }
    if (parentType === 'CAPA' && !parentId) {
      setFormError('Please select a valid CAPA.');
      return;
    }

    // 2. Validate Metadata fields
    if (!formData.file_name || !formData.file_name.trim()) {
      setFormError('File Name is required.');
      return;
    }

    if (!formData.file_key || !formData.file_key.trim()) {
      setFormError('File Key (Storage Reference Path) is required.');
      return;
    }

    if (formData.file_size_bytes === '' || formData.file_size_bytes === null || formData.file_size_bytes === undefined) {
      setFormError('File Size (bytes) is required.');
      return;
    }

    const numBytes = Number(formData.file_size_bytes);
    if (isNaN(numBytes) || numBytes < 0 || !Number.isInteger(numBytes)) {
      setFormError('File Size must be a non-negative integer (e.g. 1048576).');
      return;
    }

    if (!formData.mime_type || !formData.mime_type.trim()) {
      setFormError('MIME Type is required.');
      return;
    }

    if (!formData.uploaded_by) {
      setFormError('Uploaded By user is required.');
      return;
    }

    const payload = {
      parent_type: parentType,
      parent_id: Number(parentType === 'AUDIT' ? auditId : parentId),
      file_name: formData.file_name.trim(),
      file_key: formData.file_key.trim(),
      file_size_bytes: numBytes,
      mime_type: formData.mime_type.trim(),
      uploaded_by: Number(formData.uploaded_by)
    };

    try {
      setSubmitting(true);
      await onSubmitForm(payload);
      onSuccess();
    } catch (err) {
      console.error('Evidence metadata submission error:', err);
      setFormError(err.message || 'Failed to save evidence metadata');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Evidence Metadata</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="evidence-metadata-notice">
          ℹ️ <strong>Metadata-Only Mode:</strong> Entering evidence metadata creates a catalog reference for a file stored in external storage (e.g., S3/SharePoint). No physical file binary will be uploaded or stored by this form.
        </div>

        {formError && (
          <div className="form-error-alert" style={{ marginTop: '0.75rem' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="risk-form" style={{ marginTop: '1rem' }}>
          <div className="form-grid">
            <div className="form-group">
              <label>Parent Target Level *</label>
              <select
                value={parentType}
                onChange={handleParentTypeChange}
                required
              >
                <option value="AUDIT">Audit-Level Evidence</option>
                <option value="FINDING">Finding-Level Evidence</option>
                <option value="CAPA">CAPA-Level Evidence</option>
              </select>
            </div>

            <div className="form-group">
              <label>Select Parent Target *</label>
              {parentType === 'AUDIT' && (
                <input
                  type="text"
                  value={`Current Audit (ID: ${auditId})`}
                  disabled
                />
              )}

              {parentType === 'FINDING' && (
                <select
                  value={parentId}
                  onChange={(e) => setParentId(Number(e.target.value))}
                  required
                >
                  {findings.length > 0 ? (
                    findings.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.finding_code} — {f.title}
                      </option>
                    ))
                  ) : (
                    <option value="">No findings available for this audit</option>
                  )}
                </select>
              )}

              {parentType === 'CAPA' && (
                <select
                  value={parentId}
                  onChange={(e) => setParentId(Number(e.target.value))}
                  required
                >
                  {allCapas.length > 0 ? (
                    allCapas.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.capa_code} — {c.action_plan.length > 35 ? `${c.action_plan.substring(0, 35)}...` : c.action_plan} (under {c.finding_code})
                      </option>
                    ))
                  ) : (
                    <option value="">No CAPAs available for this audit</option>
                  )}
                </select>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>File Name *</label>
            <input
              type="text"
              name="file_name"
              value={formData.file_name}
              onChange={handleChange}
              placeholder="e.g. Q3_Firewall_Configuration_Audit_Report.pdf"
              required
            />
          </div>

          <div className="form-group">
            <label>File Key / External Storage Path *</label>
            <input
              type="text"
              name="file_key"
              value={formData.file_key}
              onChange={handleChange}
              placeholder="e.g. s3://trustsphere-evidence-bucket/2026/audits/AUD-001/report.pdf"
              required
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>File Size (Bytes) *</label>
              <input
                type="number"
                name="file_size_bytes"
                value={formData.file_size_bytes}
                onChange={handleChange}
                placeholder="e.g. 2048000"
                min="0"
                step="1"
                required
              />
            </div>

            <div className="form-group">
              <label>MIME Type *</label>
              <select
                name="mime_type"
                value={formData.mime_type}
                onChange={handleChange}
                required
              >
                <option value="application/pdf">PDF (application/pdf)</option>
                <option value="image/png">PNG Image (image/png)</option>
                <option value="image/jpeg">JPEG Image (image/jpeg)</option>
                <option value="text/plain">Text (text/plain)</option>
                <option value="application/json">JSON (application/json)</option>
                <option value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">Word Document (.docx)</option>
                <option value="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">Excel Spreadsheet (.xlsx)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Uploaded By User *</label>
            <select
              name="uploaded_by"
              value={formData.uploaded_by}
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
              {submitting ? 'Saving...' : 'Add Evidence Metadata'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
