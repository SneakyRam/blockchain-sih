import React, { useState } from 'react'
import {
  ShieldAlert,
  ArrowLeft,
  Download,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Zap,
  Repeat,
  Layers,
  AlertOctagon,
  FileCheck,
} from 'lucide-react'
import type { InvestigationResult, GraphPayload } from '../types'
import { GraphCanvas } from './GraphCanvas'

interface TraceResultsViewProps {
  result: InvestigationResult
  graph: GraphPayload | null
  onBack: () => void
  onSelectNode: (node: Record<string, unknown>) => void
}

export function TraceResultsView({ result, graph, onBack, onSelectNode }: TraceResultsViewProps) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'graph' | 'transactions'>('graph')
  const [downloadSuccess, setDownloadSuccess] = useState(false)

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // Calculate synthetic or derived metrics
  const transactions = result.normalized?.transactions ?? result.transactions ?? []
  const txCount = transactions.length
  const counterparties = result.counterparties?.length ?? result.normalized?.counterparties?.length ?? 0
  const vaspTarget = (result.vasp?.target as Record<string, any> | undefined)?.verdict
  const targetState = vaspTarget?.state ?? 'unidentified'
  const targetProviders = ((result.vasp?.target as Record<string, any> | undefined)?.providers ?? []) as Array<Record<string, any>>
  const attributionRows = targetProviders.length
    ? targetProviders.filter((provider) => provider.entity_name || provider.label || provider.wallet_id).slice(0, 6)
    : [{ entity_name: vaspTarget?.consensus || 'No VASP identified', confidence: vaspTarget?.confidence || 'none', provider: 'comparison' }]

  const riskScore = result.risk?.score ?? 0
  const riskLevel = result.risk?.level ?? 'LOW'
  const riskComponents = result.risk?.components ?? {}
  const riskColor = riskScore > 80 ? 'var(--critical)' : riskScore > 50 ? 'var(--amber)' : 'var(--emerald)'
  const identifiedEntity = String(vaspTarget?.consensus || '')
  const outboundEvents = Number(result.risk?.signals?.outbound_event_count ?? result.derived?.outbound_event_count ?? 0)
  const maxHop = Number(result.risk?.signals?.max_hop ?? 0)

  const handleDownloadPDF = () => {
    setDownloadSuccess(true)
    setTimeout(() => {
      window.print()
      setDownloadSuccess(false)
    }, 300)
  }

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2))
    const dlAnchor = document.createElement('a')
    dlAnchor.setAttribute('href', dataStr)
    dlAnchor.setAttribute('download', `cryptotrace_${result.investigation_id}.json`)
    dlAnchor.click()
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={onBack}
            className="btn-cyber-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge badge-medium">CASE #{result.investigation_id.slice(0, 8)}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Queried {new Date(result.queried_at || Date.now()).toLocaleTimeString()}
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Trace Dossier: <span className="font-mono" style={{ color: 'var(--primary)' }}>{result.address.slice(0, 12)}...{result.address.slice(-6)}</span>
              <button
                onClick={() => copyAddress(result.address)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                title="Copy Full Address"
              >
                {copied ? <Check size={16} color="var(--emerald)" /> : <Copy size={16} />}
              </button>
            </h2>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleDownloadJSON} className="btn-cyber-secondary">
            <Download size={15} /> Export JSON
          </button>
          <button onClick={handleDownloadPDF} className="btn-cyber-primary">
            <FileCheck size={15} /> {downloadSuccess ? 'Generating...' : 'Download Forensic PDF'}
          </button>
        </div>
      </div>

      {/* Main Grid: Left 2/3 Graph / Explorer + Right 1/3 Risk Gauge & Sub-scores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left 2/3 Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', gridColumn: 'span 2' }}>
          {/* Graph Enclosure */}
          <section className="glass-panel" style={{ padding: '1.25rem', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Interactive Fund Movement Graph</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Visualizing multi-hop fan-out, peel chains, and exchange deposit addresses
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <span className="badge badge-critical" style={{ fontSize: '0.7rem' }}>🔴 Suspect</span>
                <span className="badge badge-low" style={{ fontSize: '0.7rem' }}>🟢 Exchange</span>
                <span className="badge badge-medium" style={{ fontSize: '0.7rem' }}>🔵 Relay</span>
              </div>
            </div>

            {/* Graph Visualizer Container */}
            <div style={{ flex: 1, minHeight: '440px', position: 'relative', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'rgba(4, 5, 8, 0.7)' }}>
              {graph && graph.nodes.length > 0 ? (
                <GraphCanvas graph={graph} onSelect={onSelectNode} />
              ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <Zap size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <div>Graph network synchronized with {txCount} transactions.</div>
                  <span style={{ fontSize: '0.8rem' }}>Click on transaction table rows below to inspect node links.</span>
                </div>
              )}
            </div>
          </section>

          {/* Identified Exchanges & Off-Ramps Row */}
          <section className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Identified Exchanges & Off-Ramp Attribution</h3>
              <span className="badge badge-low">VASP REPUTATION MATCH</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {attributionRows.map((provider, index) => {
                const label = provider.entity_name || provider.label || provider.wallet_id || 'Unidentified provider'
                const evidence = provider.provider || 'provider comparison'
                const confidence = provider.confidence || vaspTarget?.confidence || 'none'
                const color = index === 0 ? '#00FFA3' : index % 2 ? '#00F2FE' : '#FFB800'
                return (
                  <div key={`${label}-${index}`} className="glass-panel" style={{ padding: '1rem', borderLeft: `3px solid ${color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '1rem' }}>{String(label)}</strong>
                      <span className="badge badge-medium" style={{ fontSize: '0.65rem' }}>{String(evidence)}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem', fontFamily: 'var(--font-mono)' }}>
                      {String(provider.wallet_id || result.address)}
                    </div>
                    <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Confidence</span>
                      <span style={{ color: color, fontWeight: 600 }}>{String(confidence)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Detected Patterns */}
          <section className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              Forensic Pattern Indicators & Heuristics
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--surface-card-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--amber)', fontWeight: 600, fontSize: '0.9rem' }}>
                  <Zap size={16} /> Rapid Velocity Movement
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                  {outboundEvents} outbound event(s) were observed in the collected evidence. Confirm timing and victim linkage before escalation.
                </p>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--surface-card-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                  <Repeat size={16} /> Peel Chain Structuring
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                  The deepest observed path is {maxHop} hop(s). Review repeated counterparties and amount patterns before classifying layering.
                </p>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--surface-card-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--critical)', fontWeight: 600, fontSize: '0.9rem' }}>
                  <AlertOctagon size={16} /> High-Risk Mixer Proximity
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
                  VASP state is {targetState}. No mixer or darknet conclusion is made unless a provider supplies explicit supporting evidence.
                </p>
              </div>
            </div>
          </section>

          {/* Law Enforcement Recommendations */}
          <section className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Investigator Recommendations (I4C Action Plan)
            </h3>
            <ol style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Validate attribution:</strong> {identifiedEntity ? `Review ${identifiedEntity} evidence and confirm the provider confidence before sending a preservation request.` : 'No provider consensus was returned; seek additional lawful evidence before contacting a VASP.'}
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Review graph hops:</strong> Inspect {counterparties} unique counterparty address(es) and preserve the raw provider snapshot with the investigation ID.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>Record limitations:</strong> Treat the baseline score ({riskScore}/100) as triage only; it is not a legal conclusion or trained-model output.
              </li>
            </ol>
          </section>
        </div>

        {/* Right 1/3 Column: Risk Gauge & Dossier Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Risk Score Gauge */}
          <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Overall Threat & AML Score</h3>
            
            {/* SVG Circular Ring Gauge */}
            <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto' }}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="65" fill="none" stroke="var(--surface-hover)" strokeWidth="12" />
                <circle
                  cx="80"
                  cy="80"
                  r="65"
                  fill="none"
                  stroke={riskColor}
                  strokeWidth="12"
                  strokeDasharray="408"
                  strokeDashoffset={408 - (408 * riskScore) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 80 80)"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: riskColor }}>
                  {riskScore}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>/ 100</span>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <span className={`badge ${riskLevel === 'CRITICAL' ? 'badge-critical' : riskLevel === 'HIGH' ? 'badge-high' : riskLevel === 'MEDIUM' ? 'badge-medium' : 'badge-low'}`}>
                {riskLevel} RISK CLUSTER
              </span>
            </div>

            {/* Sub-scores */}
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                  <span>Mixer / Darknet Proximity</span>
                  <strong className="mono-val" style={{ color: 'var(--critical)' }}>{riskComponents.vasp_signal ?? 0}%</strong>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${riskComponents.vasp_signal ?? 0}%`, height: '100%', backgroundColor: 'var(--critical)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                  <span>Transaction Velocity</span>
                  <strong className="mono-val" style={{ color: 'var(--amber)' }}>{riskComponents.transaction_velocity ?? 0}%</strong>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${riskComponents.transaction_velocity ?? 0}%`, height: '100%', backgroundColor: 'var(--amber)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                  <span>Fan-Out Entropy</span>
                  <strong className="mono-val" style={{ color: 'var(--primary)' }}>{riskComponents.counterparty_fanout ?? 0}%</strong>
                </div>
                <div style={{ height: '6px', backgroundColor: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${riskComponents.counterparty_fanout ?? 0}%`, height: '100%', backgroundColor: 'var(--primary)' }} />
                </div>
              </div>
            </div>
            {result.risk?.disclaimer && <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.7rem', lineHeight: 1.4 }}>{result.risk.disclaimer}</p>}
          </div>

          {/* Address Telemetry Summary */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>Chain Telemetry</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--surface-card-border)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Blockchain</span>
                <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{result.chain}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--surface-card-border)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Analyzed Events</span>
                <span className="mono-val" style={{ fontWeight: 600 }}>{txCount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--surface-card-border)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Unique Counterparties</span>
                <span className="mono-val" style={{ fontWeight: 600 }}>{counterparties}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>VASP State</span>
                <span className="badge badge-medium" style={{ textTransform: 'uppercase' }}>
                  {targetState}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
