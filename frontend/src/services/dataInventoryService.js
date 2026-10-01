import { apiFetch } from './apiClient';

const API_BASE_URL = '/api/data-inventory';

export async function listDataAssets(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.sensitivity_level) queryParams.append('sensitivity_level', params.sensitivity_level);
  if (params.search) queryParams.append('search', params.search);

  const url = queryParams.toString() ? `${API_BASE_URL}/assets?${queryParams}` : `${API_BASE_URL}/assets`;
  const res = await apiFetch(url, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to list data assets');
  return data.data;
}

export async function addDataAsset(assetData) {
  const res = await apiFetch(`${API_BASE_URL}/assets`, {
    method: 'POST',
    body: JSON.stringify(assetData)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to add data asset');
  return data.data;
}

export async function listDataFlows(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.source_asset_id) queryParams.append('source_asset_id', params.source_asset_id);

  const url = queryParams.toString() ? `${API_BASE_URL}/flows?${queryParams}` : `${API_BASE_URL}/flows`;
  const res = await apiFetch(url, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to list data flows');
  return data.data;
}

export async function addDataFlow(flowData) {
  const res = await apiFetch(`${API_BASE_URL}/flows`, {
    method: 'POST',
    body: JSON.stringify(flowData)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to add data flow');
  return data.data;
}
