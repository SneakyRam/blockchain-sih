import React from 'react';
import { useInvestigation } from '../context/InvestigationContext';
import { FileText, Download, Printer, Share2, FileBarChart } from 'lucide-react';

export function ReportsView() {
  const { activeInvestigation } = useInvestigation();

  if (!activeInvestigation) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <div className="panel" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Generate standardized investigation summaries suitable for internal reporting, legal hold, or law enforcement handover.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Printer size={16} /> Print
          </button>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Share2 size={16} /> Share
          </button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* Report Preview Document */}
      <div style={{ 
        flex: 1, 
        backgroundColor: '#FFFFFF', // Using pure white for document preview to contrast with dark mode 
        borderRadius: '8px', 
        padding: '3rem', 
        color: '#333333',
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        overflowY: 'auto'
      }}>
        
        {/* Document Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #EEEEEE', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.5rem 0', color: '#111111', fontSize: '1.75rem' }}>TraceX Investigation Summary</h1>
            <p style={{ margin: 0, color: '#666666', fontFamily: 'monospace' }}>CASE REF: {activeInvestigation.case_id || 'NOT_ASSIGNED'}</p>
          </div>
          <div style={{ textAlign: 'right', color: '#666666', fontSize: '0.875rem' }}>
            <p style={{ margin: '0 0 0.25rem 0' }}>Generated: {new Date().toLocaleString()}</p>
            <p style={{ margin: 0 }}>Status: <strong style={{ color: '#111111' }}>{activeInvestigation.status || 'OPEN'}</strong></p>
          </div>
        </div>

        {/* Target Profile Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#111111', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #EEEEEE', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            1. Target Profile
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <tbody>
              <tr>
                <td style={{ padding: '0.5rem 0', width: '200px', fontWeight: 600, color: '#555555' }}>Target Address</td>
                <td style={{ padding: '0.5rem 0', fontFamily: 'monospace', color: '#111111' }}>{activeInvestigation.address}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.5rem 0', width: '200px', fontWeight: 600, color: '#555555' }}>Blockchain Network</td>
                <td style={{ padding: '0.5rem 0', color: '#111111' }}>{activeInvestigation.chain || 'UNKNOWN'}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.5rem 0', width: '200px', fontWeight: 600, color: '#555555' }}>Investigation ID</td>
                <td style={{ padding: '0.5rem 0', fontFamily: 'monospace', color: '#111111' }}>{activeInvestigation.investigation_id}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Risk Assessment Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#111111', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #EEEEEE', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            2. Risk Assessment
          </h2>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', backgroundColor: '#F9F9F9', padding: '1.5rem', borderRadius: '4px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: activeInvestigation.risk?.level === 'CRITICAL' ? '#D32F2F' : '#333333' }}>
                {activeInvestigation.risk?.score || 'N/A'}
              </div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#666666', fontWeight: 600 }}>Risk Score</div>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#111111', marginBottom: '0.5rem' }}>
                Assessed Level: {activeInvestigation.risk?.level || 'UNKNOWN'}
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#555555', fontSize: '0.9rem' }}>
                {activeInvestigation.risk?.factors?.map((f, i) => (
                  <li key={i} style={{ marginBottom: '0.25rem' }}>{f}</li>
                )) || <li>No specific risk factors observed.</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* Graph Summary */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#111111', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #EEEEEE', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            3. Network Analysis Summary
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div style={{ border: '1px solid #E0E0E0', padding: '1rem', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111111', marginBottom: '0.25rem' }}>
                {activeInvestigation.graph?.nodes?.filter(n => n.type === 'wallet' || n.kind === 'wallet').length || 0}
              </div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#666666' }}>Wallets Identified</div>
            </div>
            <div style={{ border: '1px solid #E0E0E0', padding: '1rem', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111111', marginBottom: '0.25rem' }}>
                {activeInvestigation.graph?.nodes?.filter(n => n.type === 'transaction' || n.kind === 'transaction').length || 0}
              </div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#666666' }}>Transactions Mapped</div>
            </div>
            <div style={{ border: '1px solid #E0E0E0', padding: '1rem', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#111111', marginBottom: '0.25rem' }}>
                {activeInvestigation.graph?.nodes?.filter(n => n.type === 'entity' || n.kind === 'entity').length || 0}
              </div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#666666' }}>Entities Associated</div>
            </div>
          </div>
        </div>

        {/* Report Footer */}
        <div style={{ marginTop: '4rem', paddingTop: '1.5rem', borderTop: '2px solid #EEEEEE', color: '#888888', fontSize: '0.75rem', textAlign: 'center' }}>
          <FileBarChart size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
          <p style={{ margin: '0 0 0.25rem 0' }}>This report was automatically generated by TraceX Analytics Engine.</p>
          <p style={{ margin: 0 }}>CONFIDENTIAL AND PRIVILEGED INFORMATION</p>
        </div>

      </div>
    </div>
  );
}
