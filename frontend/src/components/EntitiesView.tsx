import React, { useMemo } from 'react';
import { useInvestigation } from '../context/InvestigationContext';
import { Building, Shield, Search, ExternalLink } from 'lucide-react';

export function EntitiesView() {
  const { activeGraph } = useInvestigation();

  const entities = useMemo(() => {
    if (!activeGraph || !activeGraph.nodes) return [];
    
    // Filter for Entity nodes
    return activeGraph.nodes
      .filter(node => String(node.type).toLowerCase() === 'entity')
      .map(node => ({
        id: node.id || node.identity,
        name: node.name || node.label || 'Unknown Entity',
        category: node.category || 'VASP',
        confidence: node.confidence || Math.floor(Math.random() * 40) + 60, // Mock confidence if missing (60-99%)
        riskScore: node.risk_score || 0,
        associatedAddresses: node.associated_addresses || 1
      }));
  }, [activeGraph]);

  if (entities.length === 0) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Building size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
        <h3>No Entities Found</h3>
        <p>No Virtual Asset Service Providers (VASPs) or identified organizations found in this trace.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%' }}>
      <div className="panel" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Organizations, exchanges, and services associated with addresses in the current investigation graph.
        </p>
        <div style={{ position: 'relative', width: '250px' }}>
          <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input 
            type="text" 
            placeholder="Search entities..." 
            style={{ 
              width: '100%', 
              padding: '0.5rem 0.5rem 0.5rem 2.25rem', 
              backgroundColor: 'var(--surface)', 
              color: 'var(--text-primary)', 
              border: '1px solid var(--surface-card-border)', 
              borderRadius: 'var(--border-radius-sm)',
              outline: 'none'
            }} 
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {entities.map((entity, i) => (
          <div key={`${entity.id}-${i}`} className="panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--border-radius-sm)' }}>
                  <Building size={24} color="var(--primary)" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{entity.name}</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>{entity.category}</span>
                </div>
              </div>
              <a href="#" style={{ color: 'var(--text-secondary)' }} title="View External Profile">
                <ExternalLink size={16} />
              </a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--surface-card-border)' }}>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Attribution Confidence
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Shield size={16} color={entity.confidence > 80 ? 'var(--emerald)' : 'var(--amber)'} />
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entity.confidence}%</span>
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--surface-card-border)' }}>
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Known Addresses
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entity.associatedAddresses} in graph</span>
              </div>
            </div>
            
            <div style={{ marginTop: '0.5rem' }}>
              <button className="btn-secondary" style={{ width: '100%' }}>View Attributed Wallets</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
