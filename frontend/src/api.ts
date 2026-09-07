import type {
  GraphPayload,
  GraphStatusResult,
  InvestigationInput,
  InvestigationResult,
  ProviderDiagnosticsResult,
  AuthUser,
  AuthStatusResult,
} from './types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
    ...init,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.detail ?? payload.message ?? 'Request failed')
  }
  return payload as T
}

export interface AddressResolveResult {
  address: string
  valid: boolean
  detected_format: string | null
  suggested_chain: 'bitcoin' | 'ethereum' | 'polygon' | 'tron' | null
  network_selection_required: boolean
  note?: string
}

export function resolveAddress(address: string): Promise<AddressResolveResult> {
  return request<AddressResolveResult>(`/api/v1/resolve?address=${encodeURIComponent(address)}`)
}

export function investigate(input: InvestigationInput): Promise<InvestigationResult> {
  return request<InvestigationResult>('/api/v1/investigate', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function createCase(payload: any): Promise<any> {
  return request('/api/v1/cases', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function runCaseInvestigation(caseId: string, payload: InvestigationInput): Promise<any> {
  return request(`/api/v1/cases/${encodeURIComponent(caseId)}/investigations`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getCaseInvestigation(caseId: string, runId: string): Promise<any> {
  return request(`/api/v1/cases/${encodeURIComponent(caseId)}/investigations/${encodeURIComponent(runId)}`)
}

export function loadGraph(investigationId: string): Promise<GraphPayload> {
  return request<GraphPayload>(`/api/v1/graph/${encodeURIComponent(investigationId)}`)
}

export function graphStatus(): Promise<GraphStatusResult> {
  return request<GraphStatusResult>('/api/v1/graph/status')
}

export function checkVASP(address: string, chain = 'auto', forceRefresh = false) {
  return request('/api/v1/vasp/check', {
    method: 'POST',
    body: JSON.stringify({ address, chain, force_refresh: forceRefresh }),
  })
}

export function getProviderConfig() {
  return request<Record<string, unknown>>('/api/v1/provider-config')
}

export function providerDiagnostics(): Promise<ProviderDiagnosticsResult> {
  return request<ProviderDiagnosticsResult>('/api/v1/provider-diagnostics', {
    method: 'POST',
    body: '{}',
  })
}

export function login(email: string, password: string): Promise<{ status: string; user: AuthUser }> {
  return request<{ status: string; user: AuthUser }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function currentUser(): Promise<{ status: string; user: AuthUser }> {
  return request<{ status: string; user: AuthUser }>('/api/v1/auth/me')
}

export async function logout(): Promise<void> {
  await request<{ status: string }>('/api/v1/auth/logout', { method: 'POST', body: '{}' })
}

export function googleLoginUrl(): string {
  return '/api/v1/auth/google/start'
}

export function authStatus(): Promise<AuthStatusResult> {
  return request<AuthStatusResult>('/api/v1/auth/status')
}
