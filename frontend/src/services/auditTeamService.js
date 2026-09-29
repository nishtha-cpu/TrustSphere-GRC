import { apiFetch } from './apiClient';

/**
 * Service to handle Audit Team API network calls (JWT Authenticated)
 */

const API_BASE_URL = '/api/audits';

export async function getAuditTeam(auditId) {
  const response = await apiFetch(`${API_BASE_URL}/${auditId}/team`, { method: 'GET' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function addAuditTeamMember(auditId, data) {
  const response = await apiFetch(`${API_BASE_URL}/${auditId}/team`, {
    method: 'POST',
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function updateAuditTeamMember(auditId, userId, data) {
  const response = await apiFetch(`${API_BASE_URL}/${auditId}/team/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function deleteAuditTeamMember(auditId, userId) {
  const response = await apiFetch(`${API_BASE_URL}/${auditId}/team/${userId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result;
}
