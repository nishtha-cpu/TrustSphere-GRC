import React, { useState, useEffect } from 'react';
import RiskAssessmentForm from './RiskAssessmentForm';
import { getRiskAssessments, createRiskAssessment } from '../services/riskAssessmentService';

export default function RiskAssessmentModal({ risk, onClose }) {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRiskAssessments(risk.id, 1);
      setAssessments(data);
    } catch (err) {
      console.error('Failed to load risk assessments:', err);
      setError(err.message || 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (risk && risk.id) {
      loadAssessments();
    }
  }, [risk]);

  const getLevelClass = (level) => {
    switch (level) {
      case 'CRITICAL':
        return 'level-critical';
      case 'HIGH':
        return 'level-high';
      case 'MEDIUM':
        return 'level-medium';
      default:
        return 'level-low';
    }
  };

  const handleFormSuccess = () => {
    setShowAssessmentForm(false);
    loadAssessments();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-large">
        <div className="modal-header">
          <div>
            <span className="risk-code">{risk.risk_code}</span>
            <h2 className="modal-title">{risk.title}</h2>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="assessment-modal-body">
          <div className="assessment-action-header">
            <h3>Assessment History</h3>
            <button className="btn-primary" onClick={() => setShowAssessmentForm(true)}>
              <span>+</span> Assess Risk
            </button>
          </div>

          {loading ? (
            <div className="table-state-container">
              <p className="state-message">Loading assessment history...</p>
            </div>
          ) : error ? (
            <div className="table-state-container error-state">
              <p className="state-message">Error: {error}</p>
            </div>
          ) : assessments.length === 0 ? (
            <div className="table-state-container">
              <p className="state-message">No assessments recorded yet for this risk.</p>
            </div>
          ) : (
            <div className="table-card">
              <table className="risk-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Likelihood</th>
                    <th>Impact</th>
                    <th>Score</th>
                    <th>Level</th>
                    <th>Assessed At</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((a) => (
                    <tr key={a.id}>
                      <td><strong>{a.assessment_type}</strong></td>
                      <td>{a.likelihood_score}</td>
                      <td>{a.impact_score}</td>
                      <td><span className="risk-score-pill">{a.risk_score}</span></td>
                      <td>
                        <span className={`status-badge ${getLevelClass(a.risk_level)}`}>
                          {a.risk_level}
                        </span>
                      </td>
                      <td className="text-muted">{new Date(a.assessed_at).toLocaleString()}</td>
                      <td>{a.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showAssessmentForm && (
          <RiskAssessmentForm
            riskId={risk.id}
            onClose={() => setShowAssessmentForm(false)}
            onSuccess={handleFormSuccess}
            createAssessmentFn={createRiskAssessment}
          />
        )}
      </div>
    </div>
  );
}
