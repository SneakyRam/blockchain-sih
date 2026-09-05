export type GraphNode = {
  id?: string
  identity?: string
  type?: string
  label?: string
  address?: string
  name?: string
  chain?: string
  [key: string]: unknown
}

export type GraphEdge = {
  source: string
  target: string
  type?: string
  properties?: Record<string, unknown>
}

export type GraphPayload = {
  status?: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  node_count?: number
  edge_count?: number
}

export type GraphStatusResult = {
  status: string
  detail?: string
  configured?: boolean
  driver_available?: boolean
  database?: string
  uri?: string
}

export type Transaction = {
  event_id?: string
  tx_hash?: string
  timestamp?: number
  from_address?: string
  to_address?: string
  from_addresses?: string[]
  to_addresses?: string[]
  direction?: string
  transaction_type?: string
  event_type?: string
  asset?: string
  amount?: string
  amount_raw?: string
  provider?: string
  hop_level?: number
  vasp_state?: string
  chain?: string
  [key: string]: unknown
}

export type InvestigationResult = {
  investigation_id: string
  address: string
  chain: string
  queried_at: string
  wallet?: Record<string, unknown>
  normalized?: {
    transactions?: Transaction[]
    counterparties?: Array<{ address: string; count: number }>
    counts?: Record<string, number>
    [key: string]: unknown
  }
  transactions?: Transaction[]
  counterparties?: Array<{ address: string; count: number }>
  graph?: GraphPayload
  graph_sync?: Record<string, unknown>
  vasp?: Record<string, unknown>
  derived?: Record<string, unknown>
  risk?: {
    score?: number
    level?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    components?: Record<string, number>
    signals?: Record<string, number | string>
    method?: string
    model_ready?: boolean
    disclaimer?: string
  }
  errors?: string[]
  storage?: Record<string, string>
}

export type InvestigationInput = {
  address: string
  chain: string
  case_id: string
  complaint_id: string
  fraud_type: string
  reported_amount: string
  reported_at: string
  victim_reference: string
  include_vasp: boolean
  include_raw: boolean
  force_refresh: boolean
}

export type ProviderDiagnostic = {
  provider: string
  purpose: string
  supported_chains: string[]
  configured: boolean
  reachable: boolean
  successful: boolean
  record_count: number
  error: string
  latency_ms: number
  evidence_limitation: string
}

export type ProviderDiagnosticsResult = {
  status: string
  generated_at: string
  summary: {
    configured: number
    reachable: number
    successful: number
    failed: number
  }
  providers: ProviderDiagnostic[]
}

export type AuthUser = {
  id: string
  email: string
  display_name?: string
  picture_url?: string
  provider?: string
  role?: string
}

export type AuthStatusResult = {
  status: string
  database: { status: string; detail?: string; database?: string }
  database_configured: boolean
  driver_available: boolean
  active_users_last_30_days: number | null
  google_oauth_configured: boolean
  session_configured: boolean
}
