import { apiFetch } from './apiClient';

/**
 * Service to handle Data Subject Request (DSR) & DPRM Workflow API calls (JWT Authenticated)
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

export async function getDSRHistory(id) {
  const response = await apiFetch(`${API_BASE_URL}/dsr/${id}/history`, { method: 'GET' });
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

/**
 * DPRM WORKFLOW APIs
 */
export async function verifyDSRIdentity(id, payload) {
  const response = await apiFetch(`${API_BASE_URL}/dsr/${id}/verify-identity`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function assignDSRCase(id, payload) {
  const response = await apiFetch(`${API_BASE_URL}/dsr/${id}/assign`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function collectDSRData(id, payload) {
  const response = await apiFetch(`${API_BASE_URL}/dsr/${id}/collect-data`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function approveDSR(id, payload) {
  const response = await apiFetch(`${API_BASE_URL}/dsr/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function generateDSRResponse(id, payload) {
  const response = await apiFetch(`${API_BASE_URL}/dsr/${id}/generate-response`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || `HTTP error! Status: ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return data.data;
}

export async function closeDSR(id, payload) {
  const response = await apiFetch(`${API_BASE_URL}/dsr/${id}/close`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
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
