import React, { useMemo } from 'react';
import { useInvestigation } from '../context/InvestigationContext';
import { Activity, Network, Layers, TrendingUp, AlertTriangle, Target, BellRing, Route } from 'lucide-react';

function MetricCard({ label, value, sub, color = 'var(--primary)' }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '1.25rem', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--surface-card-border)' }}>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color, fontFamily: 'monospace' }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: '4px' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

function CentralityRow({ rank, label, degree, type, suspicious }: {
  rank: number; label: string; degree: number; type: string; suspicious: boolean;
}) {
  const color = suspicious ? '#ef4444' : type === 'exchange' ? '#f59e0b' : type === 'mixer' ? '#a855f7' : 'var(--primary)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.6rem 0', borderBottom: '1px solid var(--surface-card-border)' }}>
      <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: `${color}22`, color, fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {rank}
      </span>
      <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: `${color}22`, color, fontWeight: 600, textTransform: 'uppercase', flexShrink: 0 }}>{type}</span>
      <div style={{ width: '80px', flexShrink: 0 }}>
        <div style={{ height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(degree * 15, 100)}%`, height: '100%', backgroundColor: color, borderRadius: '3px', boxShadow: `0 0 4px ${color}` }} />
        </div>
        <div style={{ fontSize: '0.65rem', color, textAlign: 'right', marginTop: '2px' }}>deg {degree}</div>
      </div>
    </div>
  );
}

export function TopologyView() {
  const { activeGraph, activeInvestigation } = useInvestigation();
  const inv = activeInvestigation as Record<string, unknown>;
  const vasp = (inv?.vasp ?? {}) as Record<string, unknown>;
  const vaspEntities = (vasp.vasp_entities as Array<Record<string, unknown>> | undefined) ?? [];
  const typologyFindings = (inv?.typology_findings ?? []) as Array<Record<string, unknown>>;
  const fraudClassification = (inv?.fraud_classification ?? null) as Record<string, unknown> | null;

  const vaspTypeMap = Object.fromEntries(
    vaspEntities.map(e => [String(e.address ?? '').toLowerCase(), String(e.vasp_type ?? e.type ?? '').toLowerCase()])
  );
  const vaspNameMap = Object.fromEntries(
    vaspEntities.map(e => [String(e.address ?? '').toLowerCase(), String(e.name ?? '')])
  );

  const metrics = useMemo(() => {
    if (!activeGraph?.nodes || !activeGraph?.edges) return null;

    // Degree centrality
    const degrees: Record<string, number> = {};
    activeGraph.edges.forEach(edge => {
      degrees[edge.source] = (degrees[edge.source] || 0) + 1;
      degrees[edge.target] = (degrees[edge.target] || 0) + 1;
    });

    const nodeList = activeGraph.nodes.map(n => {
      const id = n.identity ?? n.id ?? '';
      const addr = String(n.address ?? '').toLowerCase();
      return {
        id,
        label: String(n.label ?? n.address ?? n.name ?? id),
        degree: degrees[id] ?? 0,
        type: String((n as Record<string, unknown>).vasp_type ?? vaspTypeMap[addr] ?? n.type ?? 'wallet').toLowerCase(),
        suspicious: !!(n as Record<string, unknown>).is_target || vaspTypeMap[addr] === 'mixer',
        address: addr,
      };
    }).sort((a, b) => b.degree - a.degree);

    const totalNodes = activeGraph.nodes.length;
    const totalEdges = activeGraph.edges.length;
    const density = totalNodes > 1 ? (totalEdges / (totalNodes * (totalNodes - 1))).toFixed(4) : '0';
    const hubs = nodeList.filter(n => n.degree >= 3).length;
    const mixerNodes = nodeList.filter(n => n.type === 'mixer').length;
    const exchangeNodes = nodeList.filter(n => n.type === 'exchange').length;
    const maxHop = Math.max(...((activeGraph.nodes.map(n => Number((n as Record<string, unknown>).hop_level ?? 0)))), 0);

    return { nodeList, totalNodes, totalEdges, density, hubs, mixerNodes, exchangeNodes, maxHop };
  }, [activeGraph, vaspTypeMap]);

  if (!activeInvestigation) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1060px', margin: '0 auto', width: '100%' }}>

      {/* Metrics Grid */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
          <MetricCard label="Total Nodes" value={metrics.totalNodes} sub="Graph vertices" />
          <MetricCard label="Total Edges" value={metrics.totalEdges} sub="Transactions" />
          <MetricCard label="Network Density" value={metrics.density} sub="Connectivity ratio" />
          <MetricCard label="Hub Nodes" value={metrics.hubs} sub="Degree ≥ 3" color="var(--warning)" />
          <MetricCard label="Mixer Nodes" value={metrics.mixerNodes} sub="Tumbler activity" color="#a855f7" />
          <MetricCard label="VASP Nodes" value={metrics.exchangeNodes} sub="Identified exchanges" color="#f59e0b" />
          <MetricCard label="Max Hop Depth" value={metrics.maxHop} sub="Layering depth" color={metrics.maxHop >= 2 ? '#ef4444' : '#22c55e'} />
          <MetricCard label="AML Findings" value={typologyFindings.length} sub="Detected patterns" color={typologyFindings.length > 0 ? '#ef4444' : '#22c55e'} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        {/* Degree Centrality */}
        <div className="panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Network size={18} color="var(--primary)" />
            <h4 style={{ margin: 0 }}>Degree Centrality Ranking</h4>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
            Highly connected nodes indicate exchange deposit addresses, mixers, or key intermediaries.
          </p>
          {metrics ? (
            <div>
              {metrics.nodeList.slice(0, 8).map((n, i) => (
                <CentralityRow
                  key={n.id}
                  rank={i + 1}
                  label={n.label.length > 24 ? n.label.slice(0, 22) + '...' : n.label}
                  degree={n.degree}
                  type={n.type}
                  suspicious={n.suspicious}
                />
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>
              No graph data available
            </div>
          )}
        </div>

        {/* Behavioral Clustering */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <Layers size={18} color="var(--warning)" />
              <h4 style={{ margin: 0 }}>Behavioral Clustering</h4>
            </div>
            {fraudClassification ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'Primary Pattern', value: String(fraudClassification.pattern ?? 'Unknown'), color: '#a855f7' },
                  { label: 'Fraud Classification', value: String(fraudClassification.fraud_type ?? 'Unknown'), color: '#ef4444' },
                  { label: 'Severity', value: String(fraudClassification.severity ?? 'UNKNOWN'), color: '#f59e0b' },
                  { label: 'ML Confidence', value: `${Math.round((fraudClassification.confidence as number ?? 0) * 100)}%`, color: '#22c55e' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--surface-card-border)' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{value}</span>
                  </div>
                ))}
                {(fraudClassification.sub_patterns as string[] | undefined)?.length ? (
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase', fontWeight: 700 }}>Sub-Patterns</div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {(fraudClassification.sub_patterns as string[]).map(p => (
                        <span key={p} style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }}>{p}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {metrics ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Primary Pattern</span>
                      <span style={{ fontWeight: 600, color: '#a855f7' }}>
                        {(metrics.hubs ?? 0) >= 2 ? 'Fan-out / Hub-and-Spoke' : 'Peel Chain / Linear'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Mixer Activity</span>
                      <span style={{ fontWeight: 600, color: metrics.mixerNodes > 0 ? '#ef4444' : '#22c55e' }}>
                        {metrics.mixerNodes > 0 ? 'DETECTED' : 'None'}
                      </span>
                    </div>
                  </div>
                ) : 'Waiting for graph data...'}
              </div>
            )}
          </div>

          {/* AML Rules Fired */}
          <div className="panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <AlertTriangle size={18} color="#ef4444" />
              <h4 style={{ margin: 0 }}>AML Typology Rules Fired</h4>
            </div>
            {typologyFindings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {typologyFindings.map((f, i) => {
                  const sev = String(f.severity ?? '').toLowerCase();
                  const sevColor = sev === 'high' ? '#ef4444' : '#f59e0b';
                  return (
                    <div key={i} style={{ padding: '0.75rem', backgroundColor: `${sevColor}0a`, borderRadius: '6px', border: `1px solid ${sevColor}33` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: sevColor, fontWeight: 700 }}>{String(f.rule_id ?? '')}</span>
                        <span style={{ fontSize: '0.72rem', color: sevColor }}>{Math.round((f.confidence as number ?? 0) * 100)}% confidence</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{String(f.claim ?? '')}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                {activeInvestigation ? 'No AML patterns detected.' : 'Run an investigation to see AML detections.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Network Visualization Summary */}
      {metrics && (
        <div className="panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <TrendingUp size={18} color="var(--primary)" />
            <h4 style={{ margin: 0 }}>Graph Traversal Analysis</h4>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
            {[
              {
                title: 'Money Mule Detection',
                desc: `${metrics.hubs} hub nodes identified with ≥3 connections. These are likely intermediary wallets or exchange hot wallets used for layering.`,
                status: metrics.hubs > 0 ? 'DETECTED' : 'CLEAR',
                color: metrics.hubs > 0 ? '#ef4444' : '#22c55e',
              },
              {
                title: 'Mixer/Tumbler Activity',
                desc: `${metrics.mixerNodes > 0 ? 'Funds passed through ' + metrics.mixerNodes + ' known mixer address(es).' : 'No confirmed mixer interaction detected.'}`,
                status: metrics.mixerNodes > 0 ? 'CONFIRMED' : 'CLEAR',
                color: metrics.mixerNodes > 0 ? '#a855f7' : '#22c55e',
              },
              {
                title: 'Exchange Attribution',
                desc: `${metrics.exchangeNodes} VASP/exchange node(s) identified in fund flow. LEA freeze notice eligibility: confirmed.`,
                status: `${metrics.exchangeNodes} VASP(s)`,
                color: '#f59e0b',
              },
              {
                title: 'Layering Depth',
                desc: `Maximum hop depth of ${metrics.maxHop} detected. ${metrics.maxHop >= 2 ? 'Multi-hop layering suggests deliberate obfuscation.' : 'Simple direct transfer pattern.'}`,
                status: `${metrics.maxHop} HOP(S)`,
                color: metrics.maxHop >= 2 ? '#ef4444' : '#22c55e',
              },
            ].map(({ title, desc, status, color }) => (
              <div key={title} style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: `1px solid ${color}33` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{title}</span>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: `${color}22`, color, fontWeight: 700 }}>{status}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Automated Alerts & Laundering Detection */}
      <div className="panel" style={{ padding: '1.5rem', marginTop: '0.5rem', borderLeft: '4px solid #ef4444' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <BellRing size={20} color="#ef4444" />
          <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Automated Alerts & Laundering Detection</h4>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          
          {/* Typology Alerts */}
          <div style={{ padding: '1rem', backgroundColor: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--surface-card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Layers size={16} color="#ef4444" />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Intermediary Laundering Wallets</span>
            </div>
            {typologyFindings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {typologyFindings.map((t, idx) => (
                  <div key={idx} style={{ padding: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: '#ef4444', display: 'block', marginBottom: '0.2rem' }}>{String(t.typology ?? 'Alert')}</strong>
                    {String(t.description ?? '')}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                No explicit laundering intermediaries detected in current graph depth.
              </p>
            )}
          </div>

          {/* Cross-chain Alerts */}
          <div style={{ padding: '1rem', backgroundColor: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--surface-card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Route size={16} color="#06b6d4" />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Cross-Chain Fund Movement</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
              Detects bridged assets to other networks to evade tracking.
            </p>
            {activeGraph?.nodes.some(n => String((n as Record<string,unknown>).vasp_type ?? (n as Record<string,unknown>).type ?? '').toLowerCase() === 'bridge') ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#06b6d4', backgroundColor: '#06b6d422', padding: '0.4rem 0.75rem', borderRadius: '4px', width: 'fit-content' }}>
                <AlertTriangle size={14} /> Bridge Nodes Detected
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', backgroundColor: 'var(--surface-hover)', padding: '0.4rem 0.75rem', borderRadius: '4px', width: 'fit-content' }}>
                No bridges detected
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
