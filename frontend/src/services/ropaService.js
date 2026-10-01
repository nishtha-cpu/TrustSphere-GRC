import { apiFetch } from './apiClient';

const API_BASE_URL = '/api/ropa';

export async function listRoPARecords(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.legal_basis) queryParams.append('legal_basis', params.legal_basis);
  if (params.search) queryParams.append('search', params.search);

  const url = queryParams.toString() ? `${API_BASE_URL}?${queryParams}` : API_BASE_URL;
  const res = await apiFetch(url, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to list RoPA records');
  return data.data;
}

export async function getRoPAById(id) {
  const res = await apiFetch(`${API_BASE_URL}/${id}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to get RoPA record details');
  return data.data;
}

export async function createRoPARecord(ropaData) {
  const res = await apiFetch(API_BASE_URL, {
    method: 'POST',
    body: JSON.stringify(ropaData)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to create RoPA record');
  return data.data;
}

export async function updateRoPARecord(id, ropaData) {
  const res = await apiFetch(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(ropaData)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to update RoPA record');
  return data.data;
}

export async function archiveRoPARecord(id) {
  const res = await apiFetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to archive RoPA record');
  return data.data;
}
