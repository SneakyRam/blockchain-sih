import React from 'react';
import { useInvestigation } from '../context/InvestigationContext';
import { FileText, Download, Lock, Search, Filter } from 'lucide-react';

export function EvidenceView() {
  const { activeInvestigation } = useInvestigation();

  // Mocking some evidence files since backend doesn't provide them directly yet
  const evidenceFiles = [
    { id: '1', name: 'trace_summary_report.pdf', type: 'PDF', size: '2.4 MB', date: new Date().toISOString(), status: 'SEALED' },
    { id: '2', name: 'raw_transaction_graph.json', type: 'JSON', size: '1.1 MB', date: new Date().toISOString(), status: 'AVAILABLE' },
    { id: '3', name: 'vasp_subpoena_draft.docx', type: 'DOCX', size: '45 KB', date: new Date().toISOString(), status: 'DRAFT' },
    { id: '4', name: 'risk_scoring_log.csv', type: 'CSV', size: '128 KB', date: new Date().toISOString(), status: 'AVAILABLE' },
  ];

  if (!activeInvestigation) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%' }}>
      {/* Header */}
      <div className="panel" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Cryptographically signed forensic artifacts and generated reports for legal and compliance teams.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '250px' }}>
            <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input 
              type="text" 
              placeholder="Search evidence vault..." 
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
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      {/* Evidence Table */}
      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--surface-card-border)', borderRadius: 'var(--border-radius-md)', backgroundColor: 'var(--surface-card)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface-hover)', zIndex: 10 }}>
            <tr>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid var(--surface-card-border)' }}>File Name</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid var(--surface-card-border)' }}>Type</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid var(--surface-card-border)' }}>Size</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid var(--surface-card-border)' }}>Date Generated</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid var(--surface-card-border)' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', borderBottom: '1px solid var(--surface-card-border)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {evidenceFiles.map((file) => (
              <tr key={file.id} style={{ borderBottom: '1px solid var(--surface-card-border)' }}>
                <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FileText size={18} color="var(--primary)" />
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{file.name}</span>
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{file.type}</td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{file.size}</td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{new Date(file.date).toLocaleString()}</td>
                <td style={{ padding: '1rem' }}>
                  {file.status === 'SEALED' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'rgba(255, 179, 71, 0.1)', color: 'var(--warning)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                      <Lock size={12} /> SEALED
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'var(--surface-hover)', color: 'var(--text-primary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {file.status}
                    </span>
                  )}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button className="btn-secondary" style={{ padding: '0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} title="Download Artifact">
                    <Download size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
