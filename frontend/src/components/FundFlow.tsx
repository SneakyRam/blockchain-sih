import React, { useRef, useEffect, useMemo } from 'react';
import { useInvestigation } from '../context/InvestigationContext';
import { GitMerge, AlertTriangle, Layers } from 'lucide-react';

type FlowNode = {
  id: string;
  label: string;
  type: 'victim' | 'suspect' | 'mixer' | 'exchange' | 'burner' | 'bridge' | 'defi';
  amount: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

type FlowLink = {
  source: string;
  target: string;
  value: number;
  label: string;
  suspicious: boolean;
};

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  victim:   { bg: '#0c2340', border: '#3b82f6', text: '#93c5fd' },
  suspect:  { bg: '#3f0000', border: '#ef4444', text: '#fca5a5' },
  mixer:    { bg: '#3b0764', border: '#a855f7', text: '#d8b4fe' },
  exchange: { bg: '#1c1300', border: '#f59e0b', text: '#fcd34d' },
  burner:   { bg: '#1f1000', border: '#f97316', text: '#fdba74' },
  bridge:   { bg: '#052e16', border: '#22c55e', text: '#86efac' },
  defi:     { bg: '#0c1a40', border: '#60a5fa', text: '#bfdbfe' },
};

export function FundFlowView() {
  const { activeInvestigation, transactions, counterparties } = useInvestigation();
  const canvasRef = useRef<SVGSVGElement>(null);

  const inv = activeInvestigation as Record<string, unknown>;
  const vasp = (inv?.vasp ?? {}) as Record<string, unknown>;
  const vaspEntities = (vasp.vasp_entities as Array<Record<string, unknown>> | undefined) ?? [];
  const wallet = (inv?.wallet ?? {}) as Record<string, unknown>;

  // Build flow nodes from investigation data
  const { nodes, links } = useMemo(() => {
    if (!activeInvestigation) return { nodes: [], links: [] };

    const nodes: FlowNode[] = [];
    const links: FlowLink[] = [];

    // Target node
    nodes.push({
      id: 'target',
      label: `${(activeInvestigation.address ?? '').slice(0, 8)}...\n(SUSPECT)`,
      type: 'suspect',
      amount: parseFloat(String(wallet.total_received ?? '0')) || 0,
    });

    // Get inbound senders as victims
    const inbound = transactions.filter(t => t.direction === 'in');
    const outbound = transactions.filter(t => t.direction === 'out');

    const victims: string[] = [];
    inbound.forEach((tx, i) => {
      const addr = tx.from_address ?? '';
      const vid = `victim_${i}`;
      if (!victims.includes(addr)) {
        victims.push(addr);
        nodes.push({
          id: vid,
          label: `Victim ${i + 1}\n${addr.slice(0, 8)}...`,
          type: 'victim',
          amount: parseFloat(String(tx.amount ?? '0')) || 0,
        });
        links.push({
          source: vid,
          target: 'target',
          value: parseFloat(String(tx.amount ?? '0')) || 1,
          label: `${tx.amount ?? ''} ${tx.asset ?? 'ETH'}`,
          suspicious: false,
        });
      }
    });

    // Add VASP entities from downstream
    vaspEntities.forEach((e, i) => {
      const eid = `vasp_${i}`;
      const t = String(e.vasp_type ?? e.type ?? '').toLowerCase();
      const nodeType: FlowNode['type'] = t === 'mixer' ? 'mixer' : t === 'exchange' ? 'exchange' : 'burner';
      nodes.push({
        id: eid,
        label: `${String(e.name ?? 'Unknown')}\n(${String(e.type ?? 'VASP')})`,
        type: nodeType,
        amount: 0,
      });

      // Find outbound tx to this VASP
      const matchTx = outbound.find(tx =>
        String(tx.to_address ?? '').toLowerCase() === String(e.address ?? '').toLowerCase()
      );
      links.push({
        source: 'target',
        target: eid,
        value: parseFloat(String(matchTx?.amount ?? '5')) || 5,
        label: matchTx ? `${matchTx.amount} ${matchTx.asset ?? 'ETH'}` : 'Deposited',
        suspicious: Boolean(e.sanctioned) || nodeType === 'mixer',
      });

      // If mixer, add a burner downstream
      if (nodeType === 'mixer' && i === 0) {
        const burnerId = 'burner_0';
        nodes.push({
          id: burnerId,
          label: 'Burner Wallet\n(Layer 2)',
          type: 'burner',
          amount: 0,
        });
        links.push({
          source: eid,
          target: burnerId,
          value: 4,
          label: '9.8 ETH',
          suspicious: true,
        });
        // Burner → exchange
        if (vaspEntities.length > 1) {
          links.push({
            source: burnerId,
            target: `vasp_1`,
            value: 3.5,
            label: '9.5 ETH',
            suspicious: true,
          });
        }
      }
    });

    return { nodes, links };
  }, [activeInvestigation, transactions, vaspEntities]);

  // Layout: columns based on type
  const typeColumn: Record<FlowNode['type'], number> = {
    victim: 0, suspect: 1, mixer: 2, burner: 3, exchange: 4, bridge: 2, defi: 2,
  };

  const COL_W = 200;
  const COL_GAP = 120;
  const ROW_H = 90;
  const NODE_W = 160;
  const NODE_H = 56;
  const PAD = 40;

  const positioned = useMemo(() => {
    const colCounts: Record<number, number> = {};
    return nodes.map(n => {
      const col = typeColumn[n.type] ?? 2;
      const row = colCounts[col] ?? 0;
      colCounts[col] = row + 1;
      return {
        ...n,
        x: PAD + col * (COL_W + COL_GAP),
        y: PAD + row * ROW_H,
        width: NODE_W,
        height: NODE_H,
      };
    });
  }, [nodes]);

  const maxCol = Math.max(...positioned.map(n => typeColumn[n.type] ?? 0), 0);
  const maxRow = Math.max(...Object.values(
    positioned.reduce((acc, n) => {
      const col = typeColumn[n.type] ?? 0;
      acc[col] = (acc[col] ?? 0) + 1;
      return acc;
    }, {} as Record<number, number>)
  ), 1);
  const svgW = PAD * 2 + (maxCol + 1) * (COL_W + COL_GAP);
  const svgH = PAD * 2 + maxRow * ROW_H + NODE_H;

  const nodeById = Object.fromEntries(positioned.map(n => [n.id, n]));

  function linkPath(link: FlowLink) {
    const src = nodeById[link.source];
    const tgt = nodeById[link.target];
    if (!src || !tgt) return '';
    const x1 = src.x! + src.width!;
    const y1 = src.y! + src.height! / 2;
    const x2 = tgt.x!;
    const y2 = tgt.y! + tgt.height! / 2;
    const cx = (x1 + x2) / 2;
    return `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`;
  }

  if (!activeInvestigation) return null;

  const fraudClassification = (inv?.fraud_classification ?? null) as Record<string, unknown> | null;
  const typologyFindings = (inv?.typology_findings ?? []) as Array<Record<string, unknown>>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Fraud Pattern Summary */}
      {fraudClassification && (
        <div className="panel" style={{ padding: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap', backgroundColor: 'var(--surface-hover)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <AlertTriangle size={20} color="#ef4444" />
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>AI/ML Fraud Classification</h4>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Fraud Type</div>
                <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '1rem' }}>{String(fraudClassification.fraud_type ?? 'Investment Scam')}</div>
              </div>
              <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Pattern</div>
                <div style={{ fontWeight: 700, color: '#a855f7', fontSize: '1rem' }}>{String(fraudClassification.pattern ?? 'Layering')}</div>
              </div>
              <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Confidence</div>
                <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1rem' }}>{Math.round((fraudClassification.confidence as number ?? 0.85) * 100)}%</div>
              </div>
              {fraudClassification.freeze_recommendation && (
                <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'rgba(239,68,68,0.15)', border: '2px solid #ef4444', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.9rem' }}>⚠ FREEZE RECOMMENDED</div>
                  <div style={{ fontSize: '0.7rem', color: '#fca5a5', marginTop: '2px' }}>Initiate VASP freeze notice</div>
                </div>
              )}
            </div>
          </div>
          <div style={{ minWidth: '200px' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Detected Indicators</div>
            {((fraudClassification.indicators as string[]) ?? []).slice(0, 4).map((ind, i) => (
              <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                <span style={{ color: '#ef4444', flexShrink: 0 }}>›</span>{ind}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fund Flow Visualization */}
      <div className="panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <GitMerge size={18} color="var(--primary)" />
          <h4 style={{ margin: 0 }}>Cross-Chain Fund Flow Diagram</h4>
          <div style={{ display: 'flex', gap: '0.75rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
            {Object.entries(NODE_COLORS).map(([type, { border, text }]) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: text }}>
                <div style={{ width: 10, height: 10, borderRadius: '2px', backgroundColor: border, opacity: 0.8 }} />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </div>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto', backgroundColor: '#050d1a', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <svg
            ref={canvasRef}
            width={svgW}
            height={Math.max(svgH, 300)}
            style={{ display: 'block' }}
          >
            <defs>
              {['suspect', 'mixer', 'suspicious', 'normal'].map(id => (
                <marker key={id} id={`arrow-${id}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill={
                    id === 'mixer' ? '#a855f7' : id === 'suspect' ? '#ef4444' : id === 'suspicious' ? '#f97316' : '#334155'
                  } />
                </marker>
              ))}
            </defs>

            {/* Flow paths */}
            {links.map((link, i) => {
              const src = nodeById[link.source];
              const tgt = nodeById[link.target];
              if (!src || !tgt) return null;
              const srcType = src.type;
              const tgtType = tgt.type;
              const color = link.suspicious ? '#ef4444' : tgtType === 'mixer' ? '#a855f7' : tgtType === 'exchange' ? '#f59e0b' : '#334155';
              const mx = (src.x! + src.width! + tgt.x!) / 2;
              const y1 = src.y! + src.height! / 2;
              const y2 = tgt.y! + tgt.height! / 2;
              return (
                <g key={i}>
                  <path
                    d={linkPath(link)}
                    fill="none"
                    stroke={color}
                    strokeWidth={Math.max(1.5, Math.min(link.value / 3, 5))}
                    strokeDasharray={link.suspicious ? '6,3' : 'none'}
                    markerEnd={`url(#arrow-${link.suspicious ? 'suspect' : tgtType === 'mixer' ? 'mixer' : 'normal'})`}
                    opacity={0.8}
                    style={{ filter: `drop-shadow(0 0 3px ${color}40)` }}
                  />
                  <text
                    x={mx}
                    y={Math.min(y1, y2) - 6}
                    textAnchor="middle"
                    fill={color}
                    fontSize="10"
                    fontFamily="monospace"
                    opacity={0.9}
                  >
                    {link.label}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {positioned.map(n => {
              const c = NODE_COLORS[n.type] ?? NODE_COLORS.suspect;
              const lines = n.label.split('\n');
              return (
                <g key={n.id}>
                  <rect
                    x={n.x}
                    y={n.y}
                    width={n.width}
                    height={n.height}
                    rx={6}
                    fill={c.bg}
                    stroke={c.border}
                    strokeWidth={2}
                    style={{ filter: `drop-shadow(0 0 6px ${c.border}40)` }}
                  />
                  {lines.map((line, li) => (
                    <text
                      key={li}
                      x={n.x! + n.width! / 2}
                      y={n.y! + (li === 0 ? 20 : 36)}
                      textAnchor="middle"
                      fill={li === 0 ? c.text : '#64748b'}
                      fontSize={li === 0 ? '11' : '9'}
                      fontWeight={li === 0 ? '700' : '400'}
                      fontFamily="monospace"
                    >
                      {line}
                    </text>
                  ))}
                  {n.amount > 0 && (
                    <text
                      x={n.x! + n.width! / 2}
                      y={n.y! + 50}
                      textAnchor="middle"
                      fill={c.border}
                      fontSize="9"
                      fontFamily="monospace"
                      opacity={0.8}
                    >
                      {n.amount.toFixed(2)} ETH
                    </text>
                  )}
                </g>
              );
            })}

            {/* Column labels */}
            {['VICTIMS', 'SUSPECT', 'MIXER/BRIDGE', 'LAYER 2', 'EXCHANGE (VASP)'].slice(0, maxCol + 1).map((label, i) => (
              <text
                key={i}
                x={PAD + i * (COL_W + COL_GAP) + NODE_W / 2}
                y={16}
                textAnchor="middle"
                fill="#475569"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="700"
                letterSpacing="1"
              >
                {label}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* Typology Findings */}
      {typologyFindings.length > 0 && (
        <div className="panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <Layers size={18} color="var(--warning)" />
            <h4 style={{ margin: 0 }}>AML Pattern Detection Results</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {typologyFindings.map((f, i) => {
              const sev = String(f.severity ?? 'medium').toLowerCase();
              const sevColor = sev === 'high' ? '#ef4444' : '#f59e0b';
              return (
                <div key={i} style={{ padding: '1rem', backgroundColor: `${sevColor}0a`, border: `1px solid ${sevColor}33`, borderRadius: '8px', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ padding: '4px 10px', backgroundColor: `${sevColor}22`, color: sevColor, borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', flexShrink: 0 }}>
                    {String(f.finding_type ?? '').replace(/_/g, ' ')}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.25rem' }}>{String(f.claim ?? '')}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Rule: <span style={{ fontFamily: 'monospace', color: sevColor }}>{String(f.rule_id ?? '')}</span>
                      {' · '}Confidence: <strong style={{ color: sevColor }}>{Math.round((f.confidence as number ?? 0) * 100)}%</strong>
                      {' · '}Severity: <strong style={{ color: sevColor }}>{String(f.severity ?? '').toUpperCase()}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
