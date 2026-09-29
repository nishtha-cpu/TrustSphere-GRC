import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import RiskMatrix from '../components/RiskMatrix';
import { getMatrixData } from '../services/riskAssessmentService';

export default function RiskMatrixPage({ onNavigate }) {
  const [matrixData, setMatrixData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMatrix = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMatrixData(1);
      setMatrixData(data);
    } catch (err) {
      console.error('Failed to load matrix data:', err);
      setError(err.message || 'Failed to load risk matrix data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, []);

  return (
    <div className="app-container">
      <Header activeTab="matrix" onNavigate={onNavigate} />
      <main className="main-content">
        <div className="page-header">
          <div className="page-title-row">
            <div>
              <h1 className="page-title">Risk Matrix</h1>
              <p className="page-description">
                5x5 Likelihood vs. Impact heatmap visualizing latest organizational risk evaluations.
              </p>
            </div>
          </div>
        </div>

        <RiskMatrix matrixData={matrixData} loading={loading} error={error} />
      </main>
    </div>
  );
}
