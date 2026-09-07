import React from 'react';
import { useInvestigation } from '../context/InvestigationContext';
import { Target, Activity, Map, Link2, ShieldAlert } from 'lucide-react';

export function OverviewView() {
  const { activeInvestigation } = useInvestigation();

  if (!activeInvestigation) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <div className="panel" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            High-level summary of the investigation trace and key findings.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Target Info */}
        <div className="panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--border-radius-sm)' }}>
              <Target size={20} color="var(--primary)" />
            </div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Target Information</h4>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--surface-card-border)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Address</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>{activeInvestigation.address.slice(0, 12)}...{activeInvestigation.address.slice(-8)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--surface-card-border)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Network</span>
              <span style={{ textTransform: 'uppercase' }}>{activeInvestigation.chain || 'Unknown'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--surface-card-border)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Trace Date</span>
              <span>{new Date(activeInvestigation.created_at || Date.now()).toLocaleDateString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Investigation ID</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{activeInvestigation.investigation_id}</span>
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--border-radius-sm)' }}>
              <ShieldAlert size={20} color={activeInvestigation.risk?.level === 'CRITICAL' ? 'var(--critical)' : 'var(--warning)'} />
            </div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Risk Assessment</h4>
          </div>
          
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: activeInvestigation.risk?.level === 'CRITICAL' ? 'var(--critical)' : 'var(--text-primary)' }}>
                {activeInvestigation.risk?.score || 'N/A'}
              </div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Score</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Level: {activeInvestigation.risk?.level || 'UNKNOWN'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {activeInvestigation.risk?.factors?.length || 0} primary risk factors identified during tracing.
              </div>
            </div>
          </div>
        </div>

        {/* Network Metrics */}
        <div className="panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--border-radius-sm)' }}>
              <Map size={20} color="var(--primary)" />
            </div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Network Metrics</h4>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--surface-card-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {activeInvestigation.graph?.nodes?.filter(n => n.type === 'wallet' || n.kind === 'wallet').length || 0}
              </div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Wallets</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--surface-card-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {activeInvestigation.graph?.nodes?.filter(n => n.type === 'transaction' || n.kind === 'transaction').length || 0}
              </div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Txns</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--surface-card-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {activeInvestigation.graph?.nodes?.filter(n => n.type === 'entity' || n.kind === 'entity').length || 0}
              </div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Entities</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--surface-card-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {activeInvestigation.graph?.edges?.length || 0}
              </div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Links</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
