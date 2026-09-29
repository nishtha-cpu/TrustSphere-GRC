import { apiFetch } from './apiClient';

/**
 * Service to handle Risk Register API network calls (JWT Authenticated)
 */

const API_BASE_URL = '/api/risks';

export async function getRisks() {
  const response = await apiFetch(API_BASE_URL, { method: 'GET' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function createRisk(riskData) {
  const response = await apiFetch(API_BASE_URL, {
    method: 'POST',
    body: JSON.stringify(riskData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function updateRisk(id, riskData) {
  const response = await apiFetch(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(riskData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function deleteRisk(id) {
  const response = await apiFetch(`${API_BASE_URL}/${id}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result;
}
