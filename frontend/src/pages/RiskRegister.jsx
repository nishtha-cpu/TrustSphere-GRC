import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import RiskTable from '../components/RiskTable';
import RiskForm from '../components/RiskForm';
import RiskAssessmentModal from '../components/RiskAssessmentModal';
import { getRisks, createRisk, updateRisk, deleteRisk } from '../services/riskService';

export default function RiskRegister({ onNavigate }) {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [assessmentRisk, setAssessmentRisk] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadRisks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRisks(1);
      setRisks(data);
    } catch (err) {
      console.error('Failed to load risks:', err);
      setError(err.message || 'Failed to load risks from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRisks();
  }, []);

  const handleOpenCreate = () => {
    setSelectedRisk(null);
    setShowForm(true);
  };

  const handleOpenEdit = (risk) => {
    setSelectedRisk(risk);
    setShowForm(true);
  };

  const handleOpenAssess = (risk) => {
    setAssessmentRisk(risk);
  };

  const handleDeleteRisk = async (id) => {
    if (deletingId) return;

    try {
      setDeletingId(id);
      await deleteRisk(id, 1);
      await loadRisks();
    } catch (err) {
      console.error('Failed to delete risk:', err);
      alert(err.message || 'Failed to delete risk');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFormSubmit = async (formData) => {
    if (selectedRisk && selectedRisk.id) {
      await updateRisk(selectedRisk.id, formData);
    } else {
      await createRisk(formData);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedRisk(null);
    loadRisks();
  };

  return (
    <div className="app-container">
      <Header activeTab="register" onNavigate={onNavigate} />
      <main className="main-content">
        <div className="page-header">
          <div className="page-title-row">
            <div>
              <h1 className="page-title">Risk Register</h1>
              <p className="page-description">
                Identify, assess, and monitor organizational risks across departments.
              </p>
            </div>
          </div>
        </div>

        <div className="action-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search risks..."
            readOnly
          />
          <button className="btn-primary" onClick={handleOpenCreate}>
            <span>+</span> Add Risk
          </button>
        </div>

        <RiskTable
          risks={risks}
          loading={loading}
          error={error}
          onEdit={handleOpenEdit}
          onDelete={handleDeleteRisk}
          onAssess={handleOpenAssess}
          deletingId={deletingId}
        />

        {showForm && (
          <RiskForm
            initialData={selectedRisk}
            onClose={() => { setShowForm(false); setSelectedRisk(null); }}
            onSuccess={handleFormSuccess}
            onSubmitForm={handleFormSubmit}
          />
        )}

        {assessmentRisk && (
          <RiskAssessmentModal
            risk={assessmentRisk}
            onClose={() => setAssessmentRisk(null)}
          />
        )}
      </main>
    </div>
  );
}
