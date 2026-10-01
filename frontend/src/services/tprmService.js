import { apiFetch } from './apiClient';

const API_BASE_URL = '/api/tprm';

export async function listVendors(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.risk_classification) queryParams.append('risk_classification', params.risk_classification);
  if (params.search) queryParams.append('search', params.search);

  const url = queryParams.toString() ? `${API_BASE_URL}/vendors?${queryParams}` : `${API_BASE_URL}/vendors`;
  const res = await apiFetch(url, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to list vendors');
  return data.data;
}

export async function getVendorById(id) {
  const res = await apiFetch(`${API_BASE_URL}/vendors/${id}`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to get vendor details');
  return data.data;
}

export async function createVendor(vendorData) {
  const res = await apiFetch(`${API_BASE_URL}/vendors`, {
    method: 'POST',
    body: JSON.stringify(vendorData)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to create vendor');
  return data.data;
}

export async function createTPRMAssessment(vendorId, assessmentData) {
  const res = await apiFetch(`${API_BASE_URL}/vendors/${vendorId}/assessments`, {
    method: 'POST',
    body: JSON.stringify(assessmentData)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to create TPRM assessment');
  return data.data;
}

export async function addTPRMFinding(vendorId, findingData) {
  const res = await apiFetch(`${API_BASE_URL}/vendors/${vendorId}/findings`, {
    method: 'POST',
    body: JSON.stringify(findingData)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to add TPRM finding');
  return data.data;
}
