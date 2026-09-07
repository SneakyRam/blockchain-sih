import React, { useState } from 'react';
import { Search, Zap, Activity, Clock, ShieldAlert, ArrowRight } from 'lucide-react';
import { useInvestigation } from '../context/InvestigationContext';

export function CommandCenter({ onStartTrace }: { onStartTrace: (address: string, chain: string) => void }) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'input' | 'trace'>('input');

  const handleTrace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    setLoading(true);
    onStartTrace(address, 'ethereum'); // Defaulting to ethereum for now
    setLoading(false);
  };

  return (
    <div style={{ padding: '4rem', maxWidth: '1000px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '4rem' }}>
      
      {/* Hero / Input Section */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', margin: '0 0 1rem 0', letterSpacing: '-0.02em' }}>
          Enter a target to begin tracing.
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
          TraceX automatically builds the fund flow, attributes entities, and assesses risk across chains.
        </p>

        <form onSubmit={handleTrace} style={{ display: 'flex', gap: '1rem', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={20} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '16px' }} />
            <input 
              type="text" 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter cryptocurrency address, ENS, or transaction hash..." 
              style={{ 
                width: '100%', 
                padding: '1rem 1rem 1rem 3rem', 
                backgroundColor: 'var(--bg-primary)', 
                color: 'var(--text-primary)', 
                border: '2px solid var(--surface-card-border)', 
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }} 
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading || !address}
            style={{ padding: '0 2rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {loading ? 'Analyzing...' : (
              <>
                <Zap size={18} /> Deep Trace
              </>
            )}
          </button>
        </form>
      </div>

      {/* Quick Access / Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        <div className="panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={20} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Active Traces</h3>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 600 }}>12</div>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>Across your team</p>
        </div>
        
        <div className="panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldAlert size={20} color="var(--warning)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>High Risk Flags</h3>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 600 }}>3</div>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>Require immediate review</p>
        </div>

        <div className="panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={20} color="var(--text-secondary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Recent History</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--surface-card-border)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>0x74...44e</span>
              <ArrowRight size={14} color="var(--text-secondary)" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--surface-card-border)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>bc1q...3t4</span>
              <ArrowRight size={14} color="var(--text-secondary)" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
