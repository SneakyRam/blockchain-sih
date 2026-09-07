import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';
import { useInvestigation } from '../context/InvestigationContext';
import { adaptGraphPayload } from '../graph/adapter';
import fcose from 'cytoscape-fcose';
import nav from 'cytoscape-navigator';
import 'cytoscape-navigator/cytoscape.js-navigator.css';

cytoscape.use(fcose);
cytoscape.use(nav);
import {
  ZoomIn, ZoomOut, Maximize2, RefreshCw, Info,
  Eye, EyeOff, Layers, Target, Share2
} from 'lucide-react';

// ─── Node type definitions ─────────────────────────────────────────────────

const NODE_STYLES = {
  wallet:   { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd', shape: 'ellipse' },
  exchange: { bg: '#422006', border: '#f59e0b', text: '#fcd34d', shape: 'diamond' },
  mixer:    { bg: '#3b0764', border: '#a855f7', text: '#d8b4fe', shape: 'pentagon' },
  suspect:  { bg: '#450a0a', border: '#ef4444', text: '#fca5a5', shape: 'star'    },
  victim:   { bg: '#052e16', border: '#22c55e', text: '#86efac', shape: 'ellipse' },
  bridge:   { bg: '#0c2f3f', border: '#06b6d4', text: '#a5f3fc', shape: 'hexagon' },
  defi:     { bg: '#172554', border: '#818cf8', text: '#c7d2fe', shape: 'octagon' },
  burner:   { bg: '#431407', border: '#f97316', text: '#fdba74', shape: 'triangle' },
  tx:       { bg: '#1c1c1c', border: '#475569', text: '#94a3b8', shape: 'rectangle' },
};

const EDGE_STYLES: Record<string, { color: string; style: string; label?: string }> = {
  SENT_TO:          { color: '#3b82f6', style: 'solid',  label: 'SENT_TO' },
  DEPOSITED_AT:     { color: '#f59e0b', style: 'solid',  label: 'DEPOSITED_AT' },
  EXPOSED_TO:       { color: '#a855f7', style: 'dashed', label: 'EXPOSED_TO' },
  LAYERED_THROUGH:  { color: '#ef4444', style: 'dashed', label: 'LAYERED_THROUGH' },
  RECEIVED_FROM:    { color: '#22c55e', style: 'solid',  label: 'RECEIVED_FROM' },
  CONTROLLED_BY:    { color: '#f97316', style: 'dotted', label: 'CONTROLLED_BY' },
  BRIDGED_TO:       { color: '#06b6d4', style: 'dashed', label: 'BRIDGED_TO' },
  PARTICIPATED_IN:  { color: '#818cf8', style: 'solid',  label: 'PARTICIPATED_IN' },
  default:          { color: '#475569', style: 'solid',  label: '' },
};

function inferEdgeRelation(edge: Record<string, unknown>, srcKind: string, tgtKind: string): string {
  const t = String(edge.type ?? edge.label ?? '').toUpperCase().replace(/ /g, '_');
  if (t && EDGE_STYLES[t]) return t;
  if (tgtKind === 'exchange') return 'DEPOSITED_AT';
  if (tgtKind === 'mixer')    return 'EXPOSED_TO';
  if (tgtKind === 'burner')   return 'LAYERED_THROUGH';
  if (tgtKind === 'bridge')   return 'BRIDGED_TO';
  if (tgtKind === 'defi')     return 'PARTICIPATED_IN';
  if (srcKind === 'victim')   return 'RECEIVED_FROM';
  return 'SENT_TO';
}

function inferNodeKind(node: Record<string, unknown>): string {
  const vasp = String(node.vasp_type ?? '').toLowerCase();
  const kind = String(node.kind ?? node.type ?? '').toLowerCase();
  if (vasp === 'exchange' || kind === 'exchange') return 'exchange';
  if (vasp === 'mixer'    || kind === 'mixer')    return 'mixer';
  if (vasp === 'suspect'  || kind === 'suspect' || node.is_target) return 'suspect';
  if (vasp === 'bridge'   || kind === 'bridge')  return 'bridge';
  if (vasp === 'defi'     || kind === 'defi')    return 'defi';
  if (vasp === 'burner'   || kind === 'burner')  return 'burner';
  if (kind === 'victim')                          return 'victim';
  if (kind === 'tx' || kind === 'transaction')   return 'tx';
  return 'wallet';
}

export function GraphStudio() {
  const { activeGraph, activeInvestigation } = useInvestigation();
  const cyRef = useRef<cytoscape.Core | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<Record<string, unknown> | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);
  const [layout, setLayout] = useState<'fcose' | 'cose' | 'breadthfirst' | 'circle'>('fcose');
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);

  const inv = activeInvestigation as Record<string, unknown>;
  const vasp = (inv?.vasp ?? {}) as Record<string, unknown>;
  const vaspEntities = (vasp.vasp_entities as Array<Record<string, unknown>> | undefined) ?? [];
  const vaspTypeMap = Object.fromEntries(
    vaspEntities.map(e => [String(e.address ?? '').toLowerCase(), String(e.vasp_type ?? '').toLowerCase()])
  );
  const vaspNameMap = Object.fromEntries(
    vaspEntities.map(e => [String(e.address ?? '').toLowerCase(), String(e.name ?? '')])
  );

  const buildElements = useCallback(() => {
    if (!activeGraph?.nodes) return [];

    const elements: cytoscape.ElementDefinition[] = [];

    // Build nodes
    activeGraph.nodes.forEach((rawNode) => {
      const n = rawNode as Record<string, unknown>;
      const id = String(n.identity ?? n.id ?? Math.random());
      const addr = String(n.address ?? '').toLowerCase();
      const vaspType = vaspTypeMap[addr] || String(n.vasp_type ?? '').toLowerCase();
      const vaspName = vaspNameMap[addr] || String(n.name ?? n.label ?? '');
      const kind = inferNodeKind({ ...n, vasp_type: vaspType });
      const style = NODE_STYLES[kind] ?? NODE_STYLES.wallet;

      const label = vaspName && vaspName !== addr
        ? vaspName
        : addr
          ? `${addr.slice(0, 8)}…${addr.slice(-4)}`
          : id.slice(0, 12);

      elements.push({
        group: 'nodes',
        data: {
          id,
          label,
          kind,
          address: addr,
          hop_level: n.hop_level ?? 0,
          risk_score: n.risk_score ?? 0,
          is_target: n.is_target ?? false,
          bg: style.bg,
          border: style.border,
          textColor: style.text,
          shape: style.shape,
          vaspName: vaspName || '',
          fullAddress: addr,
        },
      });
    });

    // Collect valid node IDs
    const nodeIds = new Set(elements.map(e => e.data.id));

    // Build edges
    activeGraph.edges.forEach((rawEdge, i) => {
      const e = rawEdge as Record<string, unknown>;
      const src = String(e.source ?? '');
      const tgt = String(e.target ?? '');
      if (!src || !tgt || !nodeIds.has(src) || !nodeIds.has(tgt)) return;

      const srcNode = elements.find(el => el.data.id === src)?.data;
      const tgtNode = elements.find(el => el.data.id === tgt)?.data;
      const relation = inferEdgeRelation(e, String(srcNode?.kind ?? ''), String(tgtNode?.kind ?? ''));
      const edgeStyle = EDGE_STYLES[relation] ?? EDGE_STYLES.default;
      const amount = String((e as Record<string, unknown>).amount ?? (e.properties as Record<string, unknown>)?.amount ?? '');

      elements.push({
        group: 'edges',
        data: {
          id: `e-${src}-${tgt}-${i}`,
          source: src,
          target: tgt,
          relation,
          label: showEdgeLabels ? (amount || edgeStyle.label) : '',
          color: edgeStyle.color,
          lineStyle: edgeStyle.style,
          amount,
        },
      });
    });

    return elements;
  }, [activeGraph, vaspTypeMap, vaspNameMap, showEdgeLabels]);

  const buildStyles = useCallback((): cytoscape.Stylesheet[] => [
    {
      selector: 'node',
      style: {
        'background-color': 'data(bg)',
        'border-color': 'data(border)',
        'border-width': 2,
        'color': 'data(textColor)',
        'label': showLabels ? 'data(label)' : '',
        'font-size': 11,
        'font-family': 'JetBrains Mono, monospace',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 4,
        'width': 48,
        'height': 48,
        'shape': 'data(shape)',
        'text-background-color': '#0f172a',
        'text-background-opacity': 0.8,
        'text-background-padding': '2px',
        'text-background-shape': 'roundrectangle',
        'text-wrap': 'wrap',
        'text-max-width': '100px',
        'transition-property': 'border-width, border-color, background-color',
        'transition-duration': 200,
      } as Record<string, unknown>,
    },
    {
      selector: 'node[?is_target]',
      style: {
        'border-width': 4,
        'width': 64,
        'height': 64,
        'border-color': '#ef4444',
        'background-color': '#450a0a',
        'font-size': 12,
        'font-weight': 700,
      } as Record<string, unknown>,
    },
    {
      selector: 'node[kind="exchange"]',
      style: { 'background-color': '#422006', 'border-color': '#f59e0b', 'width': 56, 'height': 56 } as Record<string, unknown>,
    },
    {
      selector: 'node[kind="mixer"]',
      style: { 'background-color': '#3b0764', 'border-color': '#a855f7', 'width': 56, 'height': 56 } as Record<string, unknown>,
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 4,
        'border-color': '#60a5fa',
        'background-color': '#1e3a5f',
        'overlay-opacity': 0.1,
      } as Record<string, unknown>,
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': 'data(color)',
        'target-arrow-color': 'data(color)',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': 9,
        'font-family': 'JetBrains Mono, monospace',
        'color': '#94a3b8',
        'text-background-color': '#0f172a',
        'text-background-opacity': 0.85,
        'text-background-padding': '2px',
        'text-background-shape': 'roundrectangle',
        'line-style': 'data(lineStyle)',
        'arrow-scale': 1.2,
        'opacity': 0.85,
      } as Record<string, unknown>,
    },
    {
      selector: 'edge[relation="EXPOSED_TO"], edge[relation="LAYERED_THROUGH"]',
      style: { 'line-style': 'dashed', 'line-dash-pattern': [6, 3], 'width': 2.5 } as Record<string, unknown>,
    },
    {
      selector: 'edge[relation="DEPOSITED_AT"]',
      style: { 'width': 3, 'opacity': 1 } as Record<string, unknown>,
    },
    {
      selector: 'edge:selected',
      style: { 'line-color': '#60a5fa', 'width': 3, 'overlay-opacity': 0.1 } as Record<string, unknown>,
    },
  ], [showLabels, showEdgeLabels]);

  // Mount Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;
    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: buildStyles(),
      layout: { name: 'fcose' },
      minZoom: 0.1,
      maxZoom: 5,
      wheelSensitivity: 0.2,
    });
    
    // Initialize minimap navigator
    (cy as any).navigator({
      container: false, // creates its own DOM element within the cy container
      viewLiveFramerate: 0,
      thumbnailEventFramerate: 30,
      thumbnailLiveFramerate: false,
      dblClickDelay: 200,
      removeCustomContainer: false,
      rerenderDelay: 100
    });

    cy.on('tap', 'node', (evt) => {
      const data = evt.target.data() as Record<string, unknown>;
      setSelectedNode(data);
    });
    cy.on('tap', (evt) => {
      if (evt.target === cy) setSelectedNode(null);
    });

    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

  // Update elements when graph changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const elements = buildElements();
    cy.elements().remove();
    cy.add(elements);
    cy.style(buildStyles());
    setNodeCount(cy.nodes().length);
    setEdgeCount(cy.edges().length);
    if (elements.length > 0) {
      cy.layout({
        name: layout,
        animate: true,
        animationDuration: 600,
        ...(layout === 'fcose' ? {
          quality: 'default',
          randomize: true,
          animate: true,
          animationDuration: 600,
          fit: true,
          padding: 40,
          nodeDimensionsIncludeLabels: true,
          uniformNodeDimensions: false,
          packComponents: true,
          step: 'all',
          nodeRepulsion: (node: any) => 45000,
          idealEdgeLength: (edge: any) => 100,
          edgeElasticity: (edge: any) => 0.45,
          nestingFactor: 0.1,
          numIter: 2500,
        } : layout === 'cose' ? {
          idealEdgeLength: 120,
          nodeOverlap: 20,
          refresh: 20,
          fit: true,
          padding: 40,
          randomize: false,
          componentSpacing: 80,
          nodeRepulsion: () => 450000,
        } : layout === 'breadthfirst' ? {
          directed: true,
          fit: true,
          padding: 40,
          spacingFactor: 1.5,
        } : { fit: true, padding: 40 }),
      } as cytoscape.LayoutOptions).run();
    }
  }, [activeGraph, layout, buildElements, buildStyles]);

  // Update styles without relayout
  useEffect(() => {
    cyRef.current?.style(buildStyles());
  }, [showLabels, showEdgeLabels, buildStyles]);

  const zoomIn = () => cyRef.current?.zoom({ level: (cyRef.current.zoom() * 1.2), renderedPosition: { x: (containerRef.current?.clientWidth ?? 400) / 2, y: (containerRef.current?.clientHeight ?? 400) / 2 } });
  const zoomOut = () => cyRef.current?.zoom({ level: (cyRef.current.zoom() / 1.2), renderedPosition: { x: (containerRef.current?.clientWidth ?? 400) / 2, y: (containerRef.current?.clientHeight ?? 400) / 2 } });
  const fit = () => cyRef.current?.fit(undefined, 40);
  const reLayout = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.layout({ name: layout, animate: true, animationDuration: 600 } as cytoscape.LayoutOptions).run();
  };

  const RISK_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#22c55e' };
  const riskLevel = String(activeInvestigation?.risk?.level ?? 'UNKNOWN');
  const riskColor = RISK_COLORS[riskLevel as keyof typeof RISK_COLORS] ?? '#94a3b8';

  const nodeKindCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    activeGraph?.nodes?.forEach(n => {
      const addr = String((n as Record<string, unknown>).address ?? '').toLowerCase();
      const vt = vaspTypeMap[addr] || String((n as Record<string, unknown>).vasp_type ?? '').toLowerCase();
      const kind = inferNodeKind({ ...(n as Record<string, unknown>), vasp_type: vt });
      counts[kind] = (counts[kind] || 0) + 1;
    });
    return counts;
  }, [activeGraph, vaspTypeMap]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem' }}>

      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
            <span style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 600, fontFamily: 'monospace' }}>NEO4J LIVE</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {Object.entries(nodeKindCounts).map(([kind, count]) => {
              const s = NODE_STYLES[kind as keyof typeof NODE_STYLES] ?? NODE_STYLES.wallet;
              return (
                <span key={kind} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: `${s.border}22`, color: s.text, border: `1px solid ${s.border}44`, fontWeight: 600 }}>
                  {kind} ({count})
                </span>
              );
            })}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {nodeCount} nodes · {edgeCount} edges
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Layout selector */}
          {(['fcose', 'cose', 'breadthfirst', 'circle'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLayout(l)}
              style={{
                padding: '4px 10px', fontSize: '0.72rem', cursor: 'pointer',
                borderRadius: '4px', border: '1px solid',
                backgroundColor: layout === l ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: layout === l ? '#60a5fa' : 'var(--text-secondary)',
                borderColor: layout === l ? '#3b82f6' : 'var(--surface-card-border)',
              }}
            >{l}</button>
          ))}
          <div style={{ width: 1, height: 20, backgroundColor: 'var(--surface-card-border)' }} />
          <button onClick={() => setShowLabels(v => !v)} title={showLabels ? 'Hide labels' : 'Show labels'} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: showLabels ? 'var(--primary)' : 'var(--text-secondary)' }}>
            {showLabels ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button onClick={() => setShowEdgeLabels(v => !v)} title="Toggle edge labels" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: showEdgeLabels ? 'var(--primary)' : 'var(--text-secondary)' }}>
            <Layers size={16} />
          </button>
          <button onClick={zoomIn} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><ZoomIn size={16} /></button>
          <button onClick={zoomOut} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><ZoomOut size={16} /></button>
          <button onClick={fit} title="Fit to view" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><Maximize2 size={16} /></button>
          <button onClick={reLayout} title="Re-layout" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><RefreshCw size={16} /></button>
        </div>
      </div>

      {/* Main graph area */}
      <div style={{ flex: 1, position: 'relative', minHeight: '480px', display: 'flex', gap: '0.75rem' }}>
        {/* Canvas */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            backgroundColor: '#050d1a',
            borderRadius: '8px',
            border: '1px solid #1e293b',
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(59,130,246,0.06) 1px, transparent 0)',
            backgroundSize: '32px 32px',
            position: 'relative',
          }}
        >
          {(!activeGraph || activeGraph.nodes?.length === 0) && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', gap: '1rem' }}>
              <Share2 size={48} strokeWidth={1} color="#334155" />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: '#475569' }}>No Graph Data</p>
                <p style={{ fontSize: '0.82rem', color: '#334155', marginTop: '0.5rem' }}>Run an investigation to visualize the transaction graph</p>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: node inspector + relationship legend */}
        <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {/* Node inspector */}
          {selectedNode ? (
            <div className="panel glass-panel" style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Info size={15} color="var(--primary)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Node Inspector</span>
              </div>
              {(() => {
                const kind = String(selectedNode.kind ?? 'wallet');
                const s = NODE_STYLES[kind] ?? NODE_STYLES.wallet;
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: s.border, boxShadow: `0 0 6px ${s.border}` }} />
                      <span style={{ color: s.text, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.78rem' }}>{kind}</span>
                    </div>
                    {selectedNode.vaspName && (
                      <div style={{ marginBottom: '0.75rem', padding: '0.5rem', backgroundColor: `${s.border}15`, borderRadius: '4px', border: `1px solid ${s.border}40` }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>ENTITY NAME</div>
                        <div style={{ fontWeight: 700, color: s.text, fontSize: '0.9rem' }}>{String(selectedNode.vaspName)}</div>
                      </div>
                    )}
                    {[
                      ['Address', String(selectedNode.fullAddress ?? selectedNode.address ?? '—')],
                      ['Hop Level', String(selectedNode.hop_level ?? 0)],
                      ['Is Target', selectedNode.is_target ? 'YES ⚠' : 'No'],
                      ...(selectedNode.risk_score ? [['Risk Score', `${selectedNode.risk_score}/100`]] : []),
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{k}</span>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: k === 'Is Target' && v.includes('YES') ? '#ef4444' : 'var(--text-primary)', fontWeight: 600, wordBreak: 'break-all', maxWidth: '130px', textAlign: 'right' }}>
                          {v.length > 20 ? `${v.slice(0, 10)}…${v.slice(-6)}` : v}
                        </span>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="panel glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', minHeight: '100px' }}>
              <Target size={20} color="#334155" />
              <span style={{ fontSize: '0.78rem', color: '#475569', textAlign: 'center' }}>Click a node to inspect</span>
            </div>
          )}

          {/* Relationship Legend */}
          <div className="panel glass-panel" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Relationship Types
            </div>
            {Object.entries(EDGE_STYLES).filter(([k]) => k !== 'default').map(([rel, { color, style }]) => (
              <div key={rel} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <svg width="32" height="8">
                  <line
                    x1="0" y1="4" x2="28" y2="4"
                    stroke={color} strokeWidth="2"
                    strokeDasharray={style === 'dashed' ? '4,2' : style === 'dotted' ? '2,2' : 'none'}
                  />
                  <polygon points="24,1 32,4 24,7" fill={color} />
                </svg>
                <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color, fontWeight: 600 }}>{rel}</span>
              </div>
            ))}
          </div>

          {/* Node Types Legend */}
          <div className="panel glass-panel" style={{ padding: '1rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Node Types
            </div>
            {Object.entries(NODE_STYLES).filter(([k]) => k !== 'tx').map(([kind, { border, text }]) => (
              <div key={kind} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: kind === 'suspect' ? '2px' : '50%', backgroundColor: border, boxShadow: `0 0 4px ${border}60`, flexShrink: 0 }} />
                <span style={{ fontSize: '0.72rem', color: text, textTransform: 'capitalize', fontWeight: 600 }}>{kind}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: Risk context bar */}
      {activeInvestigation && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#050d1a', borderRadius: '6px', border: `1px solid ${riskColor}44`, display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: riskColor, boxShadow: `0 0 6px ${riskColor}`, animation: 'critical-pulse 2s infinite' }} />
            <span style={{ color: riskColor, fontWeight: 700, fontSize: '0.82rem' }}>{riskLevel} RISK — {activeInvestigation.risk?.score ?? 0}/100</span>
          </div>
          {Object.entries(activeInvestigation.risk?.components ?? {}).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
              <div style={{ width: 40, height: 4, backgroundColor: '#1e293b', borderRadius: '2px' }}>
                <div style={{ width: `${v}%`, height: '100%', backgroundColor: (v as number) >= 70 ? '#ef4444' : (v as number) >= 40 ? '#f59e0b' : '#22c55e', borderRadius: '2px' }} />
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
