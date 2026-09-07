import React, { useRef } from 'react';
import { useInvestigation } from '../context/InvestigationContext';
import { FileText, Printer, Download, Shield, AlertTriangle, CheckCircle, Building2, ArrowRightLeft } from 'lucide-react';

const LEVEL_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH:     '#ea580c',
  MEDIUM:   '#d97706',
  LOW:      '#16a34a',
};

export function ReportsView() {
  const { activeInvestigation, transactions, counterparties } = useInvestigation();
  const reportRef = useRef<HTMLDivElement>(null);

  if (!activeInvestigation) return null;

  const inv = activeInvestigation as Record<string, unknown>;
  const risk = activeInvestigation.risk;
  const wallet = (inv.wallet ?? {}) as Record<string, unknown>;
  const vasp = (inv.vasp ?? {}) as Record<string, unknown>;
  const vaspEntities = (vasp.vasp_entities as Array<Record<string, unknown>> | undefined) ?? [];
  const factors = (risk as Record<string, unknown> | undefined)?.factors as unknown[] | undefined;
  const level = risk?.level ?? 'UNKNOWN';
  const levelColor = LEVEL_COLORS[level] ?? '#6b7280';

  const generatedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const caseId = String(inv.case_id ?? inv.investigation_id ?? 'N/A');
  const fraudType = String(inv.fraud_type ?? 'Cyber Financial Fraud');

  const handlePrint = () => {
    const printContent = reportRef.current?.innerHTML;
    if (!printContent) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head>
        <title>TraceX Investigation Report — ${caseId}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Arial', sans-serif; color: #1a1a1a; padding: 40px; font-size: 13px; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          h2 { font-size: 15px; text-transform: uppercase; letter-spacing: 0.05em; color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin: 24px 0 12px; }
          h3 { font-size: 13px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          td, th { padding: 6px 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background: #f9fafb; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #6b7280; }
          .badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-weight: 700; font-size: 12px; }
          .mono { font-family: monospace; font-size: 12px; }
          .warn { color: #dc2626; font-weight: 700; }
          .section { margin-bottom: 20px; }
          .footer { margin-top: 40px; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 12px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 6px; }
          @media print { body { padding: 20px; } }
        </style>
      </head><body>${printContent}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '960px', margin: '0 auto', width: '100%' }}>

      {/* Action Bar */}
      <div className="panel" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--surface-hover)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FileText size={20} color="var(--primary)" />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Standardized Investigation Report</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Suitable for LEA handover · NCRP/SAHYOG compatible</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handlePrint}>
            <Printer size={15} /> Print
          </button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handlePrint}>
            <Download size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* Printable Report Document */}
      <div
        ref={reportRef}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '3rem',
          color: '#111827',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          lineHeight: 1.6,
        }}
      >
        {/* Document Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #111827', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
              Indian Cyber Crime Coordination Centre (I4C) · MHA
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
              Crypto Fraud Attribution Report
            </h1>
            <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#374151' }}>
              CASE REF: {caseId}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Generated: {generatedAt}</div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>System: TraceX v7.0.0</div>
            <div style={{
              marginTop: '8px',
              display: 'inline-block',
              padding: '4px 14px',
              backgroundColor: levelColor,
              color: '#fff',
              borderRadius: '4px',
              fontWeight: 700,
              fontSize: '0.9rem',
              letterSpacing: '0.5px'
            }}>
              {level} RISK — {risk?.score ?? 0}/100
            </div>
          </div>
        </div>

        {/* 1. Target Profile */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={15} /> 1. Target Wallet Profile
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <tbody>
              {[
                ['Wallet Address', activeInvestigation.address],
                ['Blockchain Network', String(activeInvestigation.chain ?? '').toUpperCase()],
                ['Native Balance', `${wallet.native_balance ?? '—'} ${wallet.native_currency ?? 'ETH'}`],
                ['Total Received', wallet.total_received ? `${wallet.total_received} ETH` : '—'],
                ['Total Sent', wallet.total_sent ? `${wallet.total_sent} ETH` : '—'],
                ['Transaction Count', String(transactions.length)],
                ['Fraud Type Reported', fraudType],
                ['Victim Reference', String(inv.victim_reference ?? '—')],
                ['Investigation ID', activeInvestigation.investigation_id],
                ['Case Reference', caseId],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.5rem 0', color: '#6b7280', width: '35%', fontSize: '0.8rem', fontWeight: 600 }}>{k}</td>
                  <td style={{ padding: '0.5rem 0', fontFamily: 'monospace', fontSize: '0.82rem', color: '#111827', wordBreak: 'break-all' }}>{v ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* 2. Risk Assessment */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={15} /> 2. AI/ML Risk Assessment
          </h2>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ backgroundColor: '#f9fafb', padding: '1rem 1.5rem', borderRadius: '8px', border: `2px solid ${levelColor}`, textAlign: 'center', minWidth: '140px' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: levelColor, fontFamily: 'monospace' }}>{risk?.score ?? 0}</div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>out of 100</div>
              <div style={{ fontWeight: 700, color: levelColor, marginTop: '4px' }}>{level} RISK</div>
            </div>
            <div style={{ flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: '0.75rem' }}>Component</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: '#6b7280', fontWeight: 600, fontSize: '0.75rem' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(risk?.components ?? {}).map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.4rem 0.75rem', color: '#374151', textTransform: 'capitalize' }}>
                        {k.replace(/_/g, ' ')}
                      </td>
                      <td style={{ padding: '0.4rem 0.75rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: (v as number) >= 70 ? '#dc2626' : (v as number) >= 40 ? '#ea580c' : '#374151' }}>
                        {v as number}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {factors && factors.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <strong style={{ fontSize: '0.82rem', color: '#374151' }}>Detected Risk Factors:</strong>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', fontSize: '0.82rem', color: '#374151' }}>
                {factors.map((f, i) => {
                  const label = typeof f === 'string' ? f : String((f as Record<string, unknown>)?.explanation ?? (f as Record<string, unknown>)?.id ?? f);
                  return <li key={i} style={{ marginBottom: '0.25rem' }}>{label}</li>;
                })}
              </ul>
            </div>
          )}
        </section>

        {/* 3. VASP Identification */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={15} /> 3. VASP & Exchange Identification
          </h2>
          {vaspEntities.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  {['Entity Name', 'Type', 'Address', 'Risk Score', 'Status'].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: '0.75rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vaspEntities.map((e, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#111827' }}>{String(e.name ?? 'Unknown')}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#374151' }}>{String(e.type ?? '—')}</td>
                    <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontSize: '0.72rem', color: '#6b7280', wordBreak: 'break-all' }}>{String(e.address ?? '—')}</td>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: (e.risk_score as number) >= 80 ? '#dc2626' : '#374151' }}>{String(e.risk_score ?? '—')}/100</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: e.sanctioned ? '#dc2626' : '#374151', fontWeight: e.sanctioned ? 700 : 400 }}>
                      {e.sanctioned ? '⚠ SANCTIONED' : 'Known Entity'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>No VASPs were identified in this investigation.</p>
          )}
        </section>

        {/* 4. Transaction Summary */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowRightLeft size={15} /> 4. Transaction Flow Summary
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['#', 'Date', 'Direction', 'Asset', 'Amount', 'From Address', 'To Address'].map(h => (
                  <th key={h} style={{ padding: '0.4rem 0.5rem', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: '0.72rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 10).map((tx, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.4rem 0.5rem', color: '#6b7280' }}>{i + 1}</td>
                  <td style={{ padding: '0.4rem 0.5rem', fontFamily: 'monospace', fontSize: '0.72rem', color: '#374151' }}>
                    {tx.timestamp ? new Date(Number(tx.timestamp) * 1000).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td style={{ padding: '0.4rem 0.5rem', fontWeight: 700, color: tx.direction === 'in' ? '#16a34a' : '#dc2626' }}>
                    {tx.direction === 'in' ? '▼ IN' : '▲ OUT'}
                  </td>
                  <td style={{ padding: '0.4rem 0.5rem', color: '#374151' }}>{tx.asset ?? 'ETH'}</td>
                  <td style={{ padding: '0.4rem 0.5rem', fontFamily: 'monospace', fontWeight: 700, color: '#111827' }}>{tx.amount ?? '—'}</td>
                  <td style={{ padding: '0.4rem 0.5rem', fontFamily: 'monospace', fontSize: '0.7rem', color: '#6b7280' }}>
                    {tx.from_address ? `${String(tx.from_address).slice(0, 14)}...` : '—'}
                  </td>
                  <td style={{ padding: '0.4rem 0.5rem', fontFamily: 'monospace', fontSize: '0.7rem', color: '#6b7280' }}>
                    {tx.to_address ? `${String(tx.to_address).slice(0, 14)}...` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length > 10 && (
            <p style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: '0.5rem' }}>
              ... and {transactions.length - 10} more transactions (full data available in system).
            </p>
          )}
        </section>

        {/* 5. Recommendations */}
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={15} /> 5. Recommended Investigative Actions
          </h2>
          <ul style={{ paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#374151', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {level === 'CRITICAL' || level === 'HIGH' ? (
              <>
                <li>Issue LEA notice to identified VASPs ({vaspEntities.map(e => e.name).join(', ') || 'all identified exchanges'}) requesting KYC/AML records under PMLA Section 12.</li>
                <li>Initiate freeze proceedings for all identified exchange accounts linked to this wallet under PMLA Section 17.</li>
                <li>Trace mixer outputs via chain analysis and coordinate with international FIUs through Egmont Group channels.</li>
                <li>File an FIR and preserve digital evidence — blockchain records are immutable and admissible.</li>
                <li>Cross-reference NCRP portal for related complaints and identify potential victim cluster.</li>
              </>
            ) : (
              <>
                <li>Monitor wallet for further outbound activity and flag for periodic re-assessment.</li>
                <li>Request voluntary KYC disclosure from associated exchanges under FIU reporting obligations.</li>
                <li>Verify victim complaint details and cross-reference with NCRP records.</li>
              </>
            )}
          </ul>
        </section>

        {/* Disclaimer Footer */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginTop: '1.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
          <strong>DISCLAIMER:</strong> This report is generated by TraceX automated blockchain intelligence and is intended for law enforcement investigative use only.
          It does not constitute legal evidence without further validation. Risk scores are probabilistic assessments — not legal conclusions.
          Investigation ID: {activeInvestigation.investigation_id} | Generated: {generatedAt} | TraceX v7.0.0 — SIH 2026 PS-183
        </div>
      </div>
    </div>
  );
}
