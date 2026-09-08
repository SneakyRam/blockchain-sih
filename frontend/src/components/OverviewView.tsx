import React from 'react';
import { useInvestigation } from '../context/InvestigationContext';
import { Target, ShieldAlert, Activity, Building2, ArrowRightLeft, Hash, ShieldCheck, Download, Link as LinkIcon, FileText } from 'lucide-react';

const LEVEL_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#f59e0b',
  LOW:      '#22c55e',
};

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ padding: '0.75rem', backgroundColor: 'var(--surface-hover)', borderRadius: '8px', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{value}</div>
        {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{sub}</div>}
      </div>
    </div>
  );
}

export function OverviewView() {
  const { activeInvestigation, transactions, counterparties } = useInvestigation();

  if (!activeInvestigation) return null;

  const inv = activeInvestigation as Record<string, unknown>;
  const wallet = (inv.wallet ?? {}) as Record<string, unknown>;
  const risk = activeInvestigation.risk;
  const vasp = (inv.vasp ?? {}) as Record<string, unknown>;
  const vaspEntities = (vasp.vasp_entities as Array<Record<string, unknown>> | undefined) ?? [];
  const level = risk?.level ?? 'UNKNOWN';
  const color = LEVEL_COLORS[level] ?? '#94a3b8';

  const inbound  = transactions.filter(t => t.direction === 'in').length;
  const outbound = transactions.filter(t => t.direction === 'out').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        <StatCard
          icon={<Target size={20} color="var(--primary)" />}
          label="Wallet Balance"
          value={`${wallet.native_balance ?? '—'} ${wallet.native_currency ?? 'ETH'}`}
          sub={`Chain: ${String(wallet.chain ?? activeInvestigation.chain ?? 'unknown').toUpperCase()}`}
        />
        <StatCard
          icon={<ArrowRightLeft size={20} color="var(--primary)" />}
          label="Transactions"
          value={transactions.length}
          sub={`${inbound} inbound · ${outbound} outbound`}
        />
        <StatCard
          icon={<Hash size={20} color="var(--primary)" />}
          label="Counterparties"
          value={counterparties.length}
          sub="Distinct wallet addresses"
        />
        <StatCard
          icon={<Building2 size={20} color="var(--amber)" />}
          label="VASPs Identified"
          value={vaspEntities.length}
          sub="Exchanges & mixers"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        {/* Target Info */}
        <div className="panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <Target size={18} color="var(--primary)" />
            <h4 style={{ margin: 0 }}>Target Wallet Profile</h4>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <tbody>
              {[
                ['Address', activeInvestigation.address],
                ['Network', String(activeInvestigation.chain ?? 'Unknown').toUpperCase()],
                ['Balance', `${wallet.native_balance ?? '—'} ${wallet.native_currency ?? ''}`],
                ['Total Received', wallet.total_received ? `${wallet.total_received} ETH` : '—'],
                ['Total Sent', wallet.total_sent ? `${wallet.total_sent} ETH` : '—'],
                ['Investigation ID', activeInvestigation.investigation_id],
                ['Case ID', String(inv.case_id ?? inv.investigation_id ?? '—')],
                ['Queried At', new Date(String(activeInvestigation.queried_at ?? Date.now())).toLocaleString()],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid var(--surface-card-border)' }}>
                  <td style={{ padding: '0.5rem 0', color: 'var(--text-secondary)', width: '40%' }}>{k}</td>
                  <td style={{ padding: '0.5rem 0', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{v ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Risk Summary */}
        <div className="panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <ShieldAlert size={18} color={color} />
            <h4 style={{ margin: 0 }}>Risk Assessment</h4>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative', width: '80px', height: '80px' }}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#1e293b" strokeWidth="8" />
                <circle cx="40" cy="40" r="32" fill="none" stroke={color}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${((risk?.score ?? 0) / 100) * 201} 201`}
                  transform="rotate(-90 40 40)"
                  style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color, fontFamily: 'monospace' }}>{risk?.score ?? 0}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color, marginBottom: '0.25rem' }}>{level}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Composite Risk Score</div>
            </div>
          </div>

          {Object.entries(risk?.components ?? {}).map(([k, v]) => {
            const cColor = (v as number) >= 70 ? '#ef4444' : (v as number) >= 40 ? '#f97316' : '#38bdf8';
            const labels: Record<string, string> = {
              vasp_signal: 'VASP Signal', transaction_velocity: 'Velocity',
              counterparty_fanout: 'Fanout', layering_depth: 'Layering',
            };
            return (
              <div key={k} style={{ marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{labels[k] ?? k}</span>
                  <span style={{ color: cColor, fontFamily: 'monospace', fontWeight: 700 }}>{v as number}</span>
                </div>
                <div style={{ height: '4px', backgroundColor: '#1e293b', borderRadius: '2px' }}>
                  <div style={{ width: `${v as number}%`, height: '100%', backgroundColor: cColor, borderRadius: '2px', boxShadow: `0 0 4px ${cColor}` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* VASP Entities */}
      {vaspEntities.length > 0 && (
        <div className="panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <Building2 size={18} color="var(--amber)" />
            <h4 style={{ margin: 0 }}>Identified VASPs & Entities</h4>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {vaspEntities.map((e) => {
              const t = String(e.vasp_type ?? e.type ?? '').toLowerCase();
              const ec = t === 'mixer' ? '#ef4444' : t === 'exchange' ? '#f59e0b' : '#64748b';
              return (
                <div key={String(e.address)} style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: `1px solid ${ec}33` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{String(e.name ?? 'Unknown')}</span>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: `${ec}22`, color: ec, border: `1px solid ${ec}44`, fontWeight: 600, textTransform: 'uppercase' }}>
                      {String(e.type ?? e.vasp_type ?? 'Unknown')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)', marginBottom: '0.5rem', wordBreak: 'break-all' }}>
                    {String(e.address)}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{String(e.description ?? '')}</div>
                  {e.sanctioned && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>⚠ OFAC SANCTIONED</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity Summary */}
      <div className="panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <Activity size={18} color="var(--primary)" />
          <h4 style={{ margin: 0 }}>Transaction Activity Summary</h4>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-card-border)' }}>
                {['Time', 'Direction', 'Asset', 'Amount', 'From', 'To'].map(h => (
                  <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 8).map((tx, idx) => {
                const d = String(tx.direction ?? '');
                const dc = d === 'in' ? '#22c55e' : '#ef4444';
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--surface-card-border)' }}>
                    <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {tx.timestamp ? new Date(Number(tx.timestamp) * 1000).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <span style={{ color: dc, fontWeight: 600, fontSize: '0.75rem' }}>{d === 'in' ? '▼ IN' : '▲ OUT'}</span>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-primary)' }}>{tx.asset ?? 'ETH'}</td>
                    <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontWeight: 700, color: dc }}>{tx.amount ?? '—'}</td>
                    <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                      {tx.from_address ? `${String(tx.from_address).slice(0, 10)}...` : '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                      {tx.to_address ? `${String(tx.to_address).slice(0, 10)}...` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {transactions.length > 8 && (
            <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              + {transactions.length - 8} more transactions — see Transactions tab for full list
            </p>
          )}
        </div>
      </div>

      {/* SAHYOG / NCRP Integration Panel */}
      <div className="panel" style={{ padding: '1.5rem', marginTop: '0.5rem', borderLeft: '4px solid #3b82f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={20} color="var(--primary)" />
            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Law Enforcement Integrations</h4>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Download size={14} /> Download Evidence PDF
            </button>
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#059669', borderColor: '#059669' }}>
              <FileText size={14} /> Export to SAHYOG
            </button>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--surface-card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>NCRP Alert Status</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
              Automated alert generation for National Cyber Crime Reporting Portal.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#10b981', backgroundColor: '#10b98122', padding: '0.4rem 0.75rem', borderRadius: '4px', width: 'fit-content' }}>
              <ShieldCheck size={14} /> Ready for Dispatch
            </div>
          </div>
          
          <div style={{ padding: '1rem', backgroundColor: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--surface-card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: level === 'CRITICAL' || level === 'HIGH' ? '#ef4444' : '#f59e0b', boxShadow: level === 'CRITICAL' ? '0 0 8px #ef4444' : '' }} className={level === 'CRITICAL' ? 'animate-pulse-critical' : ''} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>SAHYOG Actionable Intelligence</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
              {vaspEntities.length > 0 
                ? `Identified ${vaspEntities.length} VASP(s) for immediate asset freezing requests.`
                : 'No immediate VASP deposit points identified yet.'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--primary)', backgroundColor: 'var(--primary)22', padding: '0.4rem 0.75rem', borderRadius: '4px', width: 'fit-content' }}>
              <LinkIcon size={14} /> Link Case Reference
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
