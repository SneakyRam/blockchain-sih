import React from 'react'
import { Activity, Database, DatabaseZap, Server, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react'
import type { AuthStatusResult, GraphStatusResult, ProviderDiagnostic, ProviderDiagnosticsResult } from '../types'

interface SystemStatusPanelProps {
  apiConnected: boolean
  apiError: string
  graphStatus: GraphStatusResult | null
  diagnostics: ProviderDiagnosticsResult | null
  databaseStatus: AuthStatusResult | null
  loading: boolean
}

function statusTone(value?: string) {
  if (!value) return 'var(--text-muted)'
  const normalized = value.toLowerCase()
  if (normalized === 'ok' || normalized === 'connected' || normalized === 'healthy') return 'var(--emerald)'
  if (normalized === 'disabled' || normalized === 'unavailable') return 'var(--amber)'
  if (normalized === 'error' || normalized === 'failed') return 'var(--critical)'
  return 'var(--text-secondary)'
}

function summaryValue(diagnostic: ProviderDiagnostic | undefined) {
  if (!diagnostic) return 'n/a'
  if (!diagnostic.configured) return 'not configured'
  if (diagnostic.successful) return 'connected'
  if (diagnostic.reachable) return 'partial'
  return 'offline'
}

export function SystemStatusPanel({
  apiConnected,
  apiError,
  graphStatus,
  diagnostics,
  databaseStatus,
  loading,
}: SystemStatusPanelProps) {
  const topProviders = diagnostics?.providers.slice(0, 4) ?? []
  const apiLabel = apiConnected ? 'connected' : 'offline'
  const graphLabel = graphStatus?.status ?? 'unknown'
  const providerLabel = diagnostics?.summary
    ? `${diagnostics.summary.successful}/${diagnostics.summary.configured} ready`
    : 'not loaded'

  return (
    <section className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            <Activity size={14} /> Backend And Provider Health
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.25rem' }}>
            Live connection status for the investigation stack
          </h3>
        </div>
        {loading && (
          <span className="badge badge-medium" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Loader2 size={14} className="animate-spin" /> refreshing
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem', marginTop: '1rem' }}>
        <div style={{ padding: '0.9rem', borderRadius: '10px', border: '1px solid var(--surface-card-border)', backgroundColor: 'var(--surface-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <Server size={15} /> API
            </span>
            <span className="badge" style={{ backgroundColor: 'var(--surface-hover)', color: statusTone(apiLabel) }}>
              {apiLabel}
            </span>
          </div>
          <div style={{ marginTop: '0.65rem', fontSize: '1rem', fontWeight: 600 }}>
            {apiConnected ? 'Frontend can reach the FastAPI backend' : 'Frontend could not reach the FastAPI backend'}
          </div>
          {apiError && <div style={{ marginTop: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{apiError}</div>}
        </div>

        <div style={{ padding: '0.9rem', borderRadius: '10px', border: '1px solid var(--surface-card-border)', backgroundColor: 'var(--surface-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <DatabaseZap size={15} /> Neo4j
            </span>
            <span className="badge" style={{ backgroundColor: 'var(--surface-hover)', color: statusTone(graphLabel) }}>
              {graphLabel}
            </span>
          </div>
          <div style={{ marginTop: '0.65rem', fontSize: '1rem', fontWeight: 600 }}>
            {graphStatus?.detail || 'Graph projection status from /api/v1/graph/status'}
          </div>
          <div style={{ marginTop: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Database: {graphStatus?.database || 'neo4j'} {graphStatus?.driver_available === false ? '· driver unavailable' : ''}
          </div>
        </div>

        <div style={{ padding: '0.9rem', borderRadius: '10px', border: '1px solid var(--surface-card-border)', backgroundColor: 'var(--surface-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <ShieldCheck size={15} /> Providers
            </span>
            <span className="badge badge-low">{providerLabel}</span>
          </div>
          <div style={{ marginTop: '0.65rem', fontSize: '1rem', fontWeight: 600 }}>
            {diagnostics?.summary
              ? `${diagnostics.summary.reachable} reachable, ${diagnostics.summary.failed} failed`
              : 'Provider diagnostics not yet loaded'}
          </div>
          <div style={{ marginTop: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            {diagnostics?.generated_at ? `Refreshed ${new Date(diagnostics.generated_at).toLocaleString()}` : 'Waiting for diagnostics response'}
          </div>
        </div>

        <div style={{ padding: '0.9rem', borderRadius: '10px', border: '1px solid var(--surface-card-border)', backgroundColor: 'var(--surface-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <Database size={15} /> PostgreSQL
            </span>
            <span className="badge" style={{ backgroundColor: 'var(--surface-hover)', color: statusTone(databaseStatus?.database.status) }}>
              {databaseStatus?.database.status ?? 'unknown'}
            </span>
          </div>
          <div style={{ marginTop: '0.65rem', fontSize: '1rem', fontWeight: 600 }}>
            {databaseStatus?.database.detail || (databaseStatus?.active_users_last_30_days == null ? 'Identity store status unavailable' : `${databaseStatus.active_users_last_30_days} active users in 30 days`)}
          </div>
          <div style={{ marginTop: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Google OAuth: {databaseStatus?.google_oauth_configured ? 'configured' : 'not configured'} · Sessions: {databaseStatus?.session_configured ? 'configured' : 'not configured'}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
        {topProviders.map((provider) => (
          <div
            key={provider.provider}
            style={{
              padding: '0.8rem 0.9rem',
              borderRadius: '10px',
              border: '1px solid var(--surface-card-border)',
              backgroundColor: 'rgba(255,255,255,0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
              <strong style={{ textTransform: 'capitalize' }}>{provider.provider.replace(/_/g, ' ')}</strong>
              <span className="badge" style={{ backgroundColor: 'var(--surface-hover)', color: statusTone(summaryValue(provider)) }}>
                {summaryValue(provider)}
              </span>
            </div>
            <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {provider.purpose}
            </div>
            <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {provider.supported_chains.join(', ')} · {provider.latency_ms} ms · {provider.record_count} records
            </div>
            {provider.error && provider.error !== 'not configured' && (
              <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--critical)' }}>
                <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '0.3rem' }} />
                {provider.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
