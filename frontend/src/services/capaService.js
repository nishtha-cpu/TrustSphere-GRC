import { apiFetch } from './apiClient';

/**
 * Service to handle Audit CAPA / Corrective Actions API network calls (JWT Authenticated)
 */

const API_BASE_URL = '/api';

export async function getCapasByFinding(findingId) {
  const response = await apiFetch(`${API_BASE_URL}/findings/${findingId}/capa`, { method: 'GET' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function getCapaById(capaId) {
  const response = await apiFetch(`${API_BASE_URL}/capa/${capaId}`, { method: 'GET' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function createCapa(findingId, capaData) {
  const response = await apiFetch(`${API_BASE_URL}/findings/${findingId}/capa`, {
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

export async function updateCapa(capaId, capaData) {
  const response = await apiFetch(`${API_BASE_URL}/capa/${capaId}`, {
    method: 'PUT',
    body: JSON.stringify(capaData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function deleteCapa(capaId) {
  const response = await apiFetch(`${API_BASE_URL}/capa/${capaId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result;
}
