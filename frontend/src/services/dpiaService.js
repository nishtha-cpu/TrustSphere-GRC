import { apiFetch } from './apiClient';

const API_BASE_URL = '/api/dpia';

export async function listDPIAs(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.risk_level) queryParams.append('risk_level', params.risk_level);
  if (params.search) queryParams.append('search', params.search);

  const url = queryParams.toString() ? `${API_BASE_URL}?${queryParams}` : API_BASE_URL;
  const res = await apiFetch(url, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to list DPIAs');
  return data.data;
}

export async function getDPIAById(id) {
  const res = await apiFetch(`${API_BASE_URL}/${id}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to get DPIA details');
  return data.data;
}

export async function createDPIA(dpiaData) {
  const res = await apiFetch(API_BASE_URL, {
    method: 'POST',
    body: JSON.stringify(dpiaData)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to create DPIA');
  return data.data;
}

export async function updateDPIAStatus(id, payload) {
  const res = await apiFetch(`${API_BASE_URL}/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to update DPIA status');
  return data.data;
}

export async function addDPIARemediation(id, remediationData) {
  const res = await apiFetch(`${API_BASE_URL}/${id}/remediations`, {
    method: 'POST',
    body: JSON.stringify(remediationData)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to add remediation');
  return data.data;
}
