import { apiFetch, getStoredToken } from './apiClient';

/**
 * Service to handle Policy Management API network calls (JWT Authenticated)
 */

const API_BASE_URL = '/api';

export async function getPolicies(params = {}) {
  const queryParams = new URLSearchParams();
  
  // If not authenticated, allow fallback query param for legacy tests
  if (!getStoredToken() && params.tenant_id) {
    queryParams.append('tenant_id', params.tenant_id);
  }
  
  if (params.status) queryParams.append('status', params.status);
  if (params.policy_type) queryParams.append('policy_type', params.policy_type);
  if (params.owner_id) queryParams.append('owner_id', params.owner_id);
  if (params.search) queryParams.append('search', params.search);

  const queryString = queryParams.toString();
  const url = queryString ? `${API_BASE_URL}/policies?${queryString}` : `${API_BASE_URL}/policies`;

  const response = await apiFetch(url, { method: 'GET' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function getPolicyById(policyId) {
  const response = await apiFetch(`${API_BASE_URL}/policies/${policyId}`, { method: 'GET' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function createPolicy(policyData) {
  const response = await apiFetch(`${API_BASE_URL}/policies`, {
    method: 'POST',
    body: JSON.stringify(policyData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function updatePolicy(policyId, policyData) {
  const response = await apiFetch(`${API_BASE_URL}/policies/${policyId}`, {
    method: 'PUT',
    body: JSON.stringify(policyData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function deletePolicy(policyId) {
  const response = await apiFetch(`${API_BASE_URL}/policies/${policyId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result;
}

export async function createPolicyVersion(policyId, versionData) {
  const response = await apiFetch(`${API_BASE_URL}/policies/${policyId}/versions`, {
    method: 'POST',
    body: JSON.stringify(versionData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function getPolicyVersions(policyId) {
  const response = await apiFetch(`${API_BASE_URL}/policies/${policyId}/versions`, { method: 'GET' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function getPolicyVersionById(versionId) {
  const response = await apiFetch(`${API_BASE_URL}/policy-versions/${versionId}`, { method: 'GET' });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function reviewPolicyVersion(versionId, reviewerId) {
  const response = await apiFetch(`${API_BASE_URL}/policy-versions/${versionId}/review`, {
    method: 'PUT',
    body: JSON.stringify({ reviewer_id: reviewerId })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}

export async function approvePolicyVersion(versionId, approverId, setAsCurrent = true) {
  const response = await apiFetch(`${API_BASE_URL}/policy-versions/${versionId}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ approver_id: approverId, set_as_current: setAsCurrent })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  return result.data;
}
