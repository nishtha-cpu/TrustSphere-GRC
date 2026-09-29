import React, { useState } from 'react';

export default function RiskMatrix({ matrixData, loading, error }) {
  const [selectedCell, setSelectedCell] = useState(null);

  const getRiskLevel = (score) => {
    if (score <= 4) return { level: 'LOW', className: 'cell-low' };
    if (score <= 9) return { level: 'MEDIUM', className: 'cell-medium' };
    if (score <= 16) return { level: 'HIGH', className: 'cell-high' };
    return { level: 'CRITICAL', className: 'cell-critical' };
  };

  const getCellRisks = (likelihood, impact) => {
    if (!matrixData) return [];
    return matrixData.filter(
      (r) => Number(r.likelihood_score) === likelihood && Number(r.impact_score) === impact
    );
  };

  const likelihoods = [5, 4, 3, 2, 1];
  const impacts = [1, 2, 3, 4, 5];

  const likelihoodLabels = {
    5: '5 - Almost Certain',
    4: '4 - Likely',
    3: '3 - Moderate',
    2: '2 - Unlikely',
    1: '1 - Rare'
  };

  const impactLabels = {
    1: '1 - Insignificant',
    2: '2 - Minor',
    3: '3 - Moderate',
    4: '4 - Major',
    5: '5 - Severe'
  };

  if (loading) {
    return (
      <div className="table-card table-state-container">
        <p className="state-message">Loading Risk Matrix data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="table-card table-state-container error-state">
        <p className="state-message">Error: {error}</p>
      </div>
    );
  }

  const selectedCellRisks = selectedCell ? getCellRisks(selectedCell.likelihood, selectedCell.impact) : [];

  return (
    <div className="matrix-wrapper">
      <div className="matrix-card">
        <div className="matrix-legend">
          <div className="legend-item"><span className="legend-color cell-low"></span> LOW (1-4)</div>
          <div className="legend-item"><span className="legend-color cell-medium"></span> MEDIUM (5-9)</div>
          <div className="legend-item"><span className="legend-color cell-high"></span> HIGH (10-16)</div>
          <div className="legend-item"><span className="legend-color cell-critical"></span> CRITICAL (17-25)</div>
        </div>

        <div className="matrix-layout">
          {/* Y-Axis Label */}
          <div className="y-axis-label">
            <span>LIKELIHOOD</span>
          </div>

          <div className="matrix-grid-container">
            <div className="matrix-grid">
              {likelihoods.map((l) => (
                <div key={`row-${l}`} className="matrix-row">
                  <div className="axis-row-header">{likelihoodLabels[l]}</div>
                  {impacts.map((i) => {
                    const score = l * i;
                    const { level, className } = getRiskLevel(score);
                    const cellRisks = getCellRisks(l, i);
                    const count = cellRisks.length;

                    return (
                      <div
                        key={`cell-${l}-${i}`}
                        className={`matrix-cell ${className} ${count > 0 ? 'has-risks' : ''}`}
                        onClick={() => count > 0 && setSelectedCell({ likelihood: l, impact: i, score, level })}
                        title={count > 0 ? `Click to view ${count} risk(s)` : `Score: ${score} (${level})`}
                      >
                        <div className="cell-score">{score}</div>
                        <div className="cell-level">{level}</div>
                        {count > 0 && (
                          <div className="cell-count-badge">
                            {count} {count === 1 ? 'Risk' : 'Risks'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* X-Axis Header */}
            <div className="matrix-x-headers">
              <div className="axis-corner"></div>
              {impacts.map((i) => (
                <div key={`x-header-${i}`} className="axis-col-header">
                  {impactLabels[i]}
                </div>
              ))}
            </div>

            {/* X-Axis Label */}
            <div className="x-axis-label">
              <span>IMPACT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Cell Modal */}
      {selectedCell && (
        <div className="modal-backdrop">
          <div className="modal-card modal-large">
            <div className="modal-header">
              <div>
                <span className="risk-code">Score: {selectedCell.score} ({selectedCell.level})</span>
                <h2 className="modal-title">
                  Risks at Likelihood {selectedCell.likelihood} & Impact {selectedCell.impact}
                </h2>
              </div>
              <button type="button" className="btn-close" onClick={() => setSelectedCell(null)}>&times;</button>
            </div>

            <div className="table-card" style={{ marginTop: '1rem' }}>
              <table className="risk-table">
                <thead>
                  <tr>
                    <th>Risk Code</th>
                    <th>Title</th>
                    <th>Likelihood</th>
                    <th>Impact</th>
                    <th>Score</th>
                    <th>Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCellRisks.map((r) => (
                    <tr key={r.risk_id}>
                      <td className="risk-code">{r.risk_code}</td>
                      <td>{r.title}</td>
                      <td>{r.likelihood_score}</td>
                      <td>{r.impact_score}</td>
                      <td><span className="risk-score-pill">{r.risk_score}</span></td>
                      <td>
                        <span className={`status-badge level-${r.risk_level.toLowerCase()}`}>
                          {r.risk_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
