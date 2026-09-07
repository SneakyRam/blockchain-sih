import React, { useMemo } from 'react';
import { useInvestigation } from '../context/InvestigationContext';
import { ArrowRight, Wallet, Activity, ShieldAlert } from 'lucide-react';

interface FlowNode {
  id: string;
  type: 'wallet' | 'entity';
  label: string;
  risk?: string;
}

interface FlowLink {
  source: string;
  target: string;
  amount: string;
  asset: string;
  hop: number;
}

export function FundFlow() {
  const { activeInvestigation } = useInvestigation();

  // In a real implementation, we'd parse this from the backend's `derived.fund_flow` or `normalized.transactions`.
  // Here we'll derive a simple multi-hop model directly from the transactions array.
  const flowData = useMemo(() => {
    if (!activeInvestigation?.transactions) return null;
    
    // Simplistic derivation of hop-based flow for demonstration.
    // In production, the backend neo4j graph provides exact shortest-path hop data.
    
    const nodes = new Map<string, FlowNode>();
    const links: FlowLink[] = [];

    // Add target wallet
    nodes.set(activeInvestigation.address, {
      id: activeInvestigation.address,
      type: 'wallet',
      label: activeInvestigation.address,
      risk: activeInvestigation.risk?.level,
    });

    // Parse up to 3 hops (simplistic logic)
    activeInvestigation.transactions.forEach((tx) => {
      if (tx.from_address && tx.to_address) {
        if (!nodes.has(tx.from_address)) {
          nodes.set(tx.from_address, { id: tx.from_address, type: 'wallet', label: tx.from_address });
        }
        if (!nodes.has(tx.to_address)) {
          nodes.set(tx.to_address, { id: tx.to_address, type: 'wallet', label: tx.to_address });
        }
        
        links.push({
          source: tx.from_address,
          target: tx.to_address,
          amount: tx.amount || '0',
          asset: tx.asset || 'USD',
          hop: tx.hop_level ?? 1,
        });
      }
    });

    return { nodes: Array.from(nodes.values()), links };
  }, [activeInvestigation]);

  if (!flowData || flowData.links.length === 0) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Activity size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
        <h3>No Fund Flow Data</h3>
        <p>Not enough transactions observed to construct a hop flow.</p>
      </div>
    );
  }

  // Group links by hop level
  const maxHop = Math.max(...flowData.links.map(l => l.hop));
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="panel" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-hover)' }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          This view tracks the movement of funds from the target wallet through intermediary layers towards exchanges or entities.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '2rem', gap: '3rem', alignItems: 'flex-start' }}>
        {Array.from({ length: maxHop }).map((_, i) => {
          const hopLevel = i + 1;
          const hopLinks = flowData.links.filter(l => l.hop === hopLevel);
          
          if (hopLinks.length === 0) return null;

          // Unique sources for this hop
          const sources = Array.from(new Set(hopLinks.map(l => l.source)));
          
          return (
            <div key={`hop-${hopLevel}`} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: '300px' }}>
              <h4 style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', margin: 0 }}>
                Hop Level {hopLevel}
              </h4>
              
              {sources.map(sourceId => {
                const sourceNode = flowData.nodes.find(n => n.id === sourceId);
                const outboundLinks = hopLinks.filter(l => l.source === sourceId);
                
                return (
                  <div key={sourceId} className="panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                      <Wallet size={16} color="var(--primary)" />
                      <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                        {sourceNode?.label.slice(0, 8)}...{sourceNode?.label.slice(-6)}
                      </span>
                      {sourceNode?.risk === 'CRITICAL' && <ShieldAlert size={14} color="var(--critical)" />}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {outboundLinks.map((link, idx) => {
                        const targetNode = flowData.nodes.find(n => n.id === link.target);
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                            <div style={{ color: 'var(--text-muted)' }}>
                              <ArrowRight size={14} />
                            </div>
                            <div style={{ flex: 1, backgroundColor: 'var(--bg-primary)', padding: '0.5rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--surface-card-border)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
                                <span style={{ fontWeight: 600, color: 'var(--emerald)' }}>{link.amount} {link.asset}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                                <Wallet size={12} /> 
                                {targetNode?.label.slice(0, 6)}...{targetNode?.label.slice(-4)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div style={{ marginTop: '0.5rem' }}>
                      <button className="btn-secondary" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}>
                        Trace Funds From Here
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
