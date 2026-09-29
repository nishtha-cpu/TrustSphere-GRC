import { apiFetch } from './apiClient';

/**
 * Service to handle Audit Evidence metadata API network calls (JWT Authenticated)
 */

const API_BASE_URL = '/api';

export async function getAuditEvidence(auditId) {
  const response = await apiFetch(`${API_BASE_URL}/audits/${auditId}/evidence`, { method: 'GET' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function getFindingEvidence(findingId) {
  const response = await apiFetch(`${API_BASE_URL}/findings/${findingId}/evidence`, { method: 'GET' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function getCapaEvidence(capaId) {
  const response = await apiFetch(`${API_BASE_URL}/capa/${capaId}/evidence`, { method: 'GET' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function getEvidenceById(evidenceId) {
  const response = await apiFetch(`${API_BASE_URL}/evidence/${evidenceId}`, { method: 'GET' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function createAuditEvidence(auditId, evidenceData) {
  const response = await apiFetch(`${API_BASE_URL}/audits/${auditId}/evidence`, {
    method: 'POST',
    body: JSON.stringify(evidenceData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function createFindingEvidence(findingId, evidenceData) {
  const response = await apiFetch(`${API_BASE_URL}/findings/${findingId}/evidence`, {
    method: 'POST',
    body: JSON.stringify(evidenceData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function createCapaEvidence(capaId, evidenceData) {
  const response = await apiFetch(`${API_BASE_URL}/capa/${capaId}/evidence`, {
    method: 'POST',
    body: JSON.stringify(capaData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function deleteEvidence(evidenceId) {
  const response = await apiFetch(`${API_BASE_URL}/evidence/${evidenceId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result;
}
