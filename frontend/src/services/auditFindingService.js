import { apiFetch } from './apiClient';

/**
 * Service to handle Audit Findings API network calls (JWT Authenticated)
 */

const API_BASE_URL = '/api';

export async function getAuditFindings(auditId) {
  const response = await apiFetch(`${API_BASE_URL}/audits/${auditId}/findings`, { method: 'GET' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function getFindingById(findingId) {
  const response = await apiFetch(`${API_BASE_URL}/findings/${findingId}`, { method: 'GET' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function createAuditFinding(auditId, findingData) {
  const response = await apiFetch(`${API_BASE_URL}/audits/${auditId}/findings`, {
    method: 'POST',
    body: JSON.stringify(findingData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function updateFinding(findingId, findingData) {
  const response = await apiFetch(`${API_BASE_URL}/findings/${findingId}`, {
    method: 'PUT',
    body: JSON.stringify(findingData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function deleteFinding(findingId) {
  const response = await apiFetch(`${API_BASE_URL}/findings/${findingId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result;
}
