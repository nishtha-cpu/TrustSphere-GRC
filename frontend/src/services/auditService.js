import { apiFetch } from './apiClient';

/**
 * Service to handle Audit Management API network calls (JWT Authenticated)
 */

const API_BASE_URL = '/api/audits';

export async function getAudits() {
  const response = await apiFetch(API_BASE_URL, { method: 'GET' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function getAuditById(id) {
  const response = await apiFetch(`${API_BASE_URL}/${id}`, { method: 'GET' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function createAudit(auditData) {
  const response = await apiFetch(API_BASE_URL, {
    method: 'POST',
    body: JSON.stringify(auditData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function updateAudit(id, auditData) {
  const response = await apiFetch(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(auditData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function deleteAudit(id) {
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

export async function getUsers() {
  return [
    { id: 1, name: 'John Doe', email: 'john.doe@acme.com' },
    { id: 2, name: 'Jane Smith', email: 'jane.smith@acme.com' }
  ];
}
