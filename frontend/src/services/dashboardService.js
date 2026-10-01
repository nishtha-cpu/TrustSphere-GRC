import { apiFetch } from './apiClient';

const API_BASE_URL = '/api/dashboard';

export async function getComplianceDashboard() {
  const res = await apiFetch(`${API_BASE_URL}/compliance-overview`, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to get compliance overview metrics');
  return data.data;
}
