import { apiFetch } from './apiClient';

const API_BASE_URL = '/api/incidents';

export async function listIncidents(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.severity) queryParams.append('severity', params.severity);
  if (params.search) queryParams.append('search', params.search);

  const url = queryParams.toString() ? `${API_BASE_URL}?${queryParams}` : API_BASE_URL;
  const res = await apiFetch(url, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to list privacy incidents');
  return data.data;
}

export async function getIncidentById(id) {
  const res = await apiFetch(`${API_BASE_URL}/${id}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to get incident details');
  return data.data;
}

export async function createIncident(incidentData) {
  const res = await apiFetch(API_BASE_URL, {
    method: 'POST',
    body: JSON.stringify(incidentData)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to create privacy incident');
  return data.data;
}

export async function updateIncidentStatus(id, payload) {
  const res = await apiFetch(`${API_BASE_URL}/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to update incident status');
  return data.data;
}
