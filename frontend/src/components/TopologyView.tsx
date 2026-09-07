import React, { useMemo } from 'react';
import { useInvestigation } from '../context/InvestigationContext';
import { Activity, Network, Box } from 'lucide-react';

export function TopologyView() {
  const { activeGraph } = useInvestigation();

  const metrics = useMemo(() => {
    if (!activeGraph || !activeGraph.nodes || !activeGraph.edges) return null;
    
    // Calculate simple degree centrality
    const degrees: Record<string, number> = {};
    activeGraph.edges.forEach(edge => {
      degrees[edge.source] = (degrees[edge.source] || 0) + 1;
      degrees[edge.target] = (degrees[edge.target] || 0) + 1;
    });

    let maxNode = '';
    let maxDegree = 0;
    Object.entries(degrees).forEach(([node, deg]) => {
      if (deg > maxDegree) {
        maxDegree = deg;
        maxNode = node;
      }
    });

    const hubs = Object.keys(degrees).filter(k => degrees[k] > 2).length;

    return {
      nodeCount: activeGraph.nodes.length,
      edgeCount: activeGraph.edges.length,
      maxNode: activeGraph.nodes.find(n => n.id === maxNode || n.identity === maxNode),
      maxDegree,
      hubs,
      density: (activeGraph.edges.length / (activeGraph.nodes.length * (activeGraph.nodes.length - 1))).toFixed(4)
    };
  }, [activeGraph]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <div className="panel" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Analysis of network structure, centralities, and behavioral patterns to identify hubs, mixers, and bridging nodes.
          </p>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <Network size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h4 style={{ marginBottom: '0.5rem' }}>Centrality Analysis</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Identifies highly connected nodes that may represent exchange deposit addresses or key intermediary wallets.
          </p>
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--surface-card-border)', textAlign: 'left' }}>
            {metrics ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Most Connected Node</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                    {metrics.maxNode?.label?.slice(0,12) || metrics.maxNode?.id?.slice(0, 12) || 'N/A'}...
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Max Degree</span>
                  <span style={{ fontWeight: 600 }}>{metrics.maxDegree}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Network Density</span>
                  <span style={{ fontWeight: 600 }}>{metrics.density}</span>
                </div>
              </div>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Waiting for graph data...</span>
            )}
          </div>
        </div>

        <div className="panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <Activity size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h4 style={{ marginBottom: '0.5rem' }}>Behavioral Clustering</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Groups addresses by transaction behavior (e.g. peel chains, fan-out, fan-in) to attribute unified ownership.
          </p>
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--surface-card-border)', textAlign: 'left' }}>
            {metrics ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Detected Hubs ({'>'}2 edges)</span>
                  <span style={{ fontWeight: 600, color: 'var(--warning)' }}>{metrics.hubs}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Nodes Evaluated</span>
                  <span style={{ fontWeight: 600 }}>{metrics.nodeCount}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Primary Pattern</span>
                  <span style={{ fontWeight: 600, color: 'var(--emerald)' }}>
                    {metrics.maxDegree > 5 ? 'Fan-out / Exchange Hub' : 'Linear / Peel Chain'}
                  </span>
                </div>
              </div>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Waiting for graph data...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

