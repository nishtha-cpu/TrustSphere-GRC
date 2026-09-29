import React from 'react';

export default function RiskTable({ risks, loading, error, onEdit, onDelete, onAssess, deletingId }) {
  const getStatusClass = (status) => {
    switch (status) {
      case 'IDENTIFIED':
        return 'status-identified';
      case 'ASSESSED':
        return 'status-assessed';
      case 'MITIGATED':
        return 'status-mitigated';
      default:
        return 'status-closed';
    }
  };

  const handleDeleteClick = (risk) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove risk "${risk.risk_code} - ${risk.title}" from the active Risk Register?`
    );
    if (confirmed) {
      onDelete(risk.id);
    }
  };

  if (loading) {
    return (
      <div className="table-card table-state-container">
        <p className="state-message">Loading risks from server...</p>
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

  if (!risks || risks.length === 0) {
    return (
      <div className="table-card table-state-container">
        <p className="state-message">No risks registered yet for this tenant.</p>
      </div>
    );
  }

  return (
    <div className="table-card">
      <table className="risk-table">
        <thead>
          <tr>
            <th>Risk Code</th>
            <th>Title</th>
            <th>Category</th>
            <th>Owner</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {risks.map((risk) => (
            <tr key={risk.id}>
              <td className="risk-code">{risk.risk_code}</td>
              <td>{risk.title}</td>
              <td>Category #{risk.category_id}</td>
              <td>User #{risk.owner_id}</td>
              <td>
                <span className={`status-badge ${getStatusClass(risk.status)}`}>
                  {risk.status}
                </span>
              </td>
              <td>
                <div className="action-buttons">
                  <button
                    className="btn-icon"
                    title="Assess Risk"
                    onClick={() => onAssess(risk)}
                  >
                    📊
                  </button>
                  <button
                    className="btn-icon"
                    title="Edit Risk"
                    onClick={() => onEdit(risk)}
                    disabled={deletingId === risk.id}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon"
                    title="Delete Risk"
                    onClick={() => handleDeleteClick(risk)}
                    disabled={deletingId === risk.id}
                  >
                    {deletingId === risk.id ? '⏳' : '🗑️'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
