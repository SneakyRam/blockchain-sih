import React from 'react';
import { useInvestigation } from '../context/InvestigationContext';
import { ShieldAlert, AlertTriangle, TrendingUp, Users, Layers, Zap, CheckCircle, Info } from 'lucide-react';

const LEVEL_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#f59e0b',
  LOW:      '#22c55e',
};

const COMPONENT_LABELS: Record<string, { label: string; icon: React.ReactNode; desc: string }> = {
  vasp_signal: {
    label: 'VASP/Mixer Signal',
    icon: <ShieldAlert size={16} />,
    desc: 'Risk from known exchanges, mixers, or sanctioned entities in the transaction flow.',
  },
  transaction_velocity: {
    label: 'Transaction Velocity',
    icon: <Zap size={16} />,
    desc: 'Ratio of outbound to total transactions — high velocity indicates rapid layering.',
  },
  counterparty_fanout: {
    label: 'Counterparty Fanout',
    icon: <Users size={16} />,
    desc: 'Number of distinct receiving addresses — high fanout indicates fund dispersal (structuring).',
  },
  layering_depth: {
    label: 'Layering Depth',
    icon: <Layers size={16} />,
    desc: 'Max hop depth observed — deeper chains indicate sophisticated layering attempts.',
  },
};

function ScoreGauge({ score, level }: { score: number; level: string }) {
  const color = LEVEL_COLORS[level] ?? '#94a3b8';
  const angle = (score / 100) * 180;
  const rad = (angle - 90) * (Math.PI / 180);
  const cx = 80, cy = 80, r = 60;
  const nx = cx + r * Math.cos(rad);
  const ny = cy + r * Math.sin(rad);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg width="160" height="100" viewBox="0 0 160 100">
        {/* Track */}
        <path d="M 20 80 A 60 60 0 0 1 140 80" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
        {/* Fill */}
        <path
          d="M 20 80 A 60 60 0 0 1 140 80"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 188} 188`}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill={color} />
        {/* Score */}
        <text x={cx} y={cy + 18} textAnchor="middle" fill={color} fontSize="22" fontWeight="700" fontFamily="monospace">{score}</text>
        <text x={cx} y={cy + 30} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">/100</text>
      </svg>
      <span style={{ fontSize: '1.1rem', fontWeight: 700, color, letterSpacing: '1px' }}>{level}</span>
    </div>
  );
}

function ComponentBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
      <div style={{ flex: 1, height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          width: `${(value / max) * 100}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: '3px',
          transition: 'width 1s ease',
          boxShadow: `0 0 6px ${color}`,
        }} />
      </div>
      <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color, fontWeight: 700, minWidth: '28px', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export function RiskIntelligence() {
  const { activeInvestigation } = useInvestigation();

  if (!activeInvestigation) return null;

  const risk = activeInvestigation.risk;
  if (!risk) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Info size={40} style={{ opacity: 0.3, display: 'block', margin: '0 auto 1rem' }} />
        <p>No risk data available for this investigation.</p>
      </div>
    );
  }

  const score = risk.score ?? 0;
  const level = risk.level ?? 'LOW';
  const color = LEVEL_COLORS[level] ?? '#94a3b8';
  const components = risk.components ?? {};
  const signals = risk.signals ?? {};
  const factors = (risk as Record<string, unknown>).factors as unknown[] | undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '960px', margin: '0 auto', width: '100%' }}>

      {/* Score Header */}
      <div className="panel" style={{ padding: '2rem', display: 'flex', gap: '3rem', alignItems: 'center', backgroundColor: 'var(--surface-hover)', flexWrap: 'wrap' }}>
        <ScoreGauge score={score} level={level} />

        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <ShieldAlert size={22} color={color} />
            <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>AI/ML Risk Assessment</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: 1.6 }}>
            This wallet has been assessed as <strong style={{ color }}>{level} RISK</strong> with a composite score of <strong style={{ color }}>{score}/100</strong>.
            {score >= 80 && ' Immediate law enforcement action recommended.'}
            {score >= 55 && score < 80 && ' Further investigation and VASP coordination advised.'}
            {score < 55 && ' Monitor for further suspicious activity.'}
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Transactions', value: String(signals.event_count ?? 0) },
              { label: 'Counterparties', value: String(signals.counterparty_count ?? 0) },
              { label: 'Max Hop', value: String(signals.max_hop ?? 0) },
              { label: 'VASP State', value: String(signals.vasp_state ?? 'unknown').toUpperCase() },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--surface-card-border)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{value}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Components */}
      <div className="panel" style={{ padding: '1.5rem' }}>
        <h4 style={{ margin: '0 0 1.25rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={18} color="var(--primary)" /> Risk Component Breakdown
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Object.entries(COMPONENT_LABELS).map(([key, { label, icon, desc }]) => {
            const val = (components as Record<string, number>)[key] ?? 0;
            const cColor = val >= 70 ? '#ef4444' : val >= 40 ? '#f97316' : '#38bdf8';
            return (
              <div key={key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ color: cColor }}>{icon}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                  <ComponentBar value={val} color={cColor} />
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '1.5rem', lineHeight: 1.5 }}>{desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Risk Factors */}
      {factors && factors.length > 0 && (
        <div className="panel" style={{ padding: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1.25rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} color="var(--warning)" /> Detected Risk Factors
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {factors.map((factor, idx) => {
              const label = typeof factor === 'string' ? factor
                : typeof factor === 'object' && factor !== null ? String((factor as Record<string, unknown>).explanation ?? (factor as Record<string, unknown>).id ?? factor)
                : String(factor);
              return (
                <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.75rem', backgroundColor: 'rgba(239,68,68,0.05)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.75rem 1rem', backgroundColor: 'rgba(56,189,248,0.05)', borderRadius: '6px', border: '1px solid rgba(56,189,248,0.15)' }}>
        <CheckCircle size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {risk.disclaimer ?? 'This assessment is generated by automated AI/ML analysis and should be treated as investigative intelligence only, not as a legal conclusion.'}
        </p>
      </div>
    </div>
  );
}
