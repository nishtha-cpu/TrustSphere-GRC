import { apiFetch } from './apiClient';

/**
 * Service to handle Data Subject Request (DSR) & Privacy Dashboard API calls (JWT Authenticated)
 */

const API_BASE_URL = '/api';

export async function listDSRs(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.request_type) queryParams.append('request_type', params.request_type);
  if (params.assigned_to) queryParams.append('assigned_to', params.assigned_to);
  if (params.search) queryParams.append('search', params.search);

  const queryString = queryParams.toString();
  const url = queryString ? `${API_BASE_URL}/dsr?${queryString}` : `${API_BASE_URL}/dsr`;

  const response = await apiFetch(url, { method: 'GET' });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function getDSR(id) {
  const response = await apiFetch(`${API_BASE_URL}/dsr/${id}`, { method: 'GET' });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function createDSR(dsrData) {
  const response = await apiFetch(`${API_BASE_URL}/dsr`, {
    method: 'POST',
    body: JSON.stringify(dsrData)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function updateDSR(id, dsrData) {
  const response = await apiFetch(`${API_BASE_URL}/dsr/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dsrData)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function updateDSRStatus(id, status, resolutionNotes = null) {
  const response = await apiFetch(`${API_BASE_URL}/dsr/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, resolution_notes: resolutionNotes })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function deleteDSR(id) {
  const response = await apiFetch(`${API_BASE_URL}/dsr/${id}`, {
    method: 'DELETE'
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function getPrivacySummaryStats() {
  const response = await apiFetch(`${API_BASE_URL}/privacy/stats`, { method: 'GET' });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}
