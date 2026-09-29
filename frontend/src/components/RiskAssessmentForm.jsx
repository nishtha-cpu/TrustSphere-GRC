import React, { useState } from 'react';

export default function RiskAssessmentForm({ riskId, onClose, onSuccess, createAssessmentFn }) {
  const [formData, setFormData] = useState({
    tenant_id: 1,
    risk_id: riskId,
    assessor_id: 1,
    assessment_type: 'INHERENT',
    likelihood_score: 3,
    impact_score: 3,
    risk_level: 'MEDIUM',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'likelihood_score' || name === 'impact_score' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    try {
      setSubmitting(true);
      await createAssessmentFn({
        ...formData,
        risk_id: riskId
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to save risk assessment:', err);
      setFormError(err.message || 'Failed to save assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h2 className="modal-title">Perform Risk Assessment</h2>
          <button type="button" className="btn-close" onClick={onClose}>&times;</button>
        </div>

        {formError && (
          <div className="form-error-alert">{formError}</div>
        )}

        <form onSubmit={handleSubmit} className="risk-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="assessment_type">Assessment Type *</label>
              <select
                id="assessment_type"
                name="assessment_type"
                value={formData.assessment_type}
                onChange={handleChange}
              >
                <option value="INHERENT">INHERENT</option>
                <option value="RESIDUAL">RESIDUAL</option>
                <option value="TARGET">TARGET</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="risk_level">Risk Level *</label>
              <select
                id="risk_level"
                name="risk_level"
                value={formData.risk_level}
                onChange={handleChange}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="likelihood_score">Likelihood Score (1 - 5) *</label>
              <select
                id="likelihood_score"
                name="likelihood_score"
                value={formData.likelihood_score}
                onChange={handleChange}
              >
                <option value="1">1 - Rare</option>
                <option value="2">2 - Unlikely</option>
                <option value="3">3 - Moderate</option>
                <option value="4">4 - Likely</option>
                <option value="5">5 - Almost Certain</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="impact_score">Impact Score (1 - 5) *</label>
              <select
                id="impact_score"
                name="impact_score"
                value={formData.impact_score}
                onChange={handleChange}
              >
                <option value="1">1 - Insignificant</option>
                <option value="2">2 - Minor</option>
                <option value="3">3 - Moderate</option>
                <option value="4">4 - Major</option>
                <option value="5">5 - Severe</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Calculated Risk Score</label>
            <div className="score-preview">
              {formData.likelihood_score * formData.impact_score} (Likelihood × Impact)
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes / Evaluation Rationale</label>
            <textarea
              id="notes"
              name="notes"
              rows="3"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Provide comments or justification for scores..."
            ></textarea>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving Assessment...' : 'Save Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
