import { apiFetch } from './apiClient';

/**
 * Service to handle Risk Assessment API network calls (JWT Authenticated)
 */

const API_BASE_URL = '/api/risk-assessments';

export async function getRiskAssessments(riskId) {
  const response = await apiFetch(`/api/risks/${riskId}/assessments`, { method: 'GET' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function createRiskAssessment(assessmentData) {
  const response = await apiFetch(API_BASE_URL, {
    method: 'POST',
    body: JSON.stringify(assessmentData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function getMatrixData() {
  const response = await apiFetch(`${API_BASE_URL}/matrix`, { method: 'GET' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}
