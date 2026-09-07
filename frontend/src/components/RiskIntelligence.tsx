import React from 'react';
import { useInvestigation } from '../context/InvestigationContext';
import { AlertTriangle, ShieldCheck, ShieldAlert, Info, HelpCircle } from 'lucide-react';

type SignalSourceType = 'OBSERVED' | 'ENRICHED' | 'INFERRED' | 'UNKNOWN';

interface RiskSignal {
  factor: string;
  sourceType: SignalSourceType;
  description: string;
}

export function RiskIntelligence() {
  const { activeInvestigation } = useInvestigation();

  if (!activeInvestigation) return null;

  const risk = activeInvestigation.risk;

  if (!risk) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <ShieldCheck size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
        <h3>No Risk Data</h3>
        <p>No risk intelligence available for this target.</p>
      </div>
    );
  }

  // Map backend string factors into structured signals to explain "Why am I seeing this?"
  const signals: RiskSignal[] = (risk.factors || []).map(f => {
    let sourceType: SignalSourceType = 'UNKNOWN';
    let description = 'Unspecified risk factor';

    const lowerF = f.toLowerCase();
    if (lowerF.includes('sanction') || lowerF.includes('ofac')) {
      sourceType = 'ENRICHED';
      description = 'Target address is present on official global sanction lists (e.g., OFAC).';
    } else if (lowerF.includes('darknet') || lowerF.includes('mixer')) {
      sourceType = 'INFERRED';
      description = 'Pattern analysis suggests structural similarities to darknet markets or mixers.';
    } else if (lowerF.includes('volume') || lowerF.includes('velocity')) {
      sourceType = 'OBSERVED';
      description = 'On-chain transaction velocity and volume exceed normal thresholds for typical users.';
    } else {
      sourceType = 'ENRICHED';
      description = 'Flagged by external intelligence provider.';
    }

    return { factor: f, sourceType, description };
  });

  const getSourceBadge = (type: SignalSourceType) => {
    switch (type) {
      case 'OBSERVED':
        return <span className="badge" style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--surface-card-border)' }}>OBSERVED (On-Chain)</span>;
      case 'ENRICHED':
        return <span className="badge" style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', color: 'var(--info)', border: '1px solid rgba(52, 152, 219, 0.3)' }}>ENRICHED (3rd Party)</span>;
      case 'INFERRED':
        return <span className="badge" style={{ backgroundColor: 'rgba(155, 89, 182, 0.1)', color: '#b37ee6', border: '1px solid rgba(155, 89, 182, 0.3)' }}>INFERRED (AI/ML)</span>;
      default:
        return <span className="badge" style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>UNKNOWN</span>;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'CRITICAL': return 'var(--critical)';
      case 'HIGH': return 'var(--warning)';
      case 'MEDIUM': return 'var(--amber)';
      case 'LOW': return 'var(--emerald)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Risk Summary Header */}
      <div className="panel" style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '2rem', borderTop: `4px solid ${getRiskColor(risk.level)}` }}>
        <div style={{ textAlign: 'center', minWidth: '120px' }}>
          <h1 style={{ margin: 0, fontSize: '3rem', color: getRiskColor(risk.level), lineHeight: 1 }}>
            {risk.score}
          </h1>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '1px' }}>
            Risk Score
          </span>
        </div>
        
        <div style={{ width: '1px', alignSelf: 'stretch', backgroundColor: 'var(--surface-card-border)' }} />
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            {risk.level === 'CRITICAL' || risk.level === 'HIGH' ? (
              <ShieldAlert size={24} color={getRiskColor(risk.level)} />
            ) : (
              <ShieldCheck size={24} color={getRiskColor(risk.level)} />
            )}
            <h2 style={{ margin: 0, color: getRiskColor(risk.level) }}>{risk.level} RISK</h2>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            This address has been flagged for {signals.length} risk factor(s). 
            Review the intelligence breakdown below to understand the attribution.
          </p>
        </div>
      </div>

      {/* Why Am I Seeing This? */}
      <div>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HelpCircle size={18} color="var(--primary)" />
          Why am I seeing this?
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {signals.map((signal, idx) => (
            <div key={idx} className="panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{signal.factor}</h4>
                {getSourceBadge(signal.sourceType)}
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--surface-card-border)' }}>
                <Info size={16} color="var(--text-secondary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  {signal.description}
                </p>
              </div>
            </div>
          ))}

          {signals.length === 0 && (
            <div className="panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No specific risk factors were provided by the backend.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
