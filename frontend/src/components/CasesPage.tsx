import React from 'react';
import { Search, Filter, FolderOpen, AlertCircle, CheckCircle2, Clock, Activity } from 'lucide-react';

export function CasesPage() {
  const cases = [
    { id: 'CAS-2026-089', title: 'Operation Silk Route', target: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', status: 'ACTIVE', priority: 'HIGH', updated: '2 hours ago' },
    { id: 'CAS-2026-088', title: 'Lazarus Group Suspicion', target: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', status: 'ACTIVE', priority: 'CRITICAL', updated: '5 hours ago' },
    { id: 'CAS-2026-085', title: 'Local Exchange Hack', target: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', status: 'CLOSED', priority: 'MEDIUM', updated: '2 days ago' },
    { id: 'CAS-2026-081', title: 'Ransomware Affiliate Tracking', target: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', status: 'PENDING_REVIEW', priority: 'HIGH', updated: '1 week ago' },
  ];

  return (
    <div style={{ padding: '2rem 4rem', maxWidth: '1440px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>Case Management</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Active and historical investigations across all teams.</p>
        </div>
        <button className="btn-primary">
          + New Case
        </button>
      </div>

      <div className="panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '400px' }}>
          <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input 
            type="text" 
            placeholder="Search by ID, title, or target address..." 
            style={{ 
              width: '100%', 
              padding: '0.6rem 1rem 0.6rem 2.5rem', 
              backgroundColor: 'var(--bg-primary)', 
              color: 'var(--text-primary)', 
              border: '1px solid var(--surface-card-border)', 
              borderRadius: 'var(--border-radius-sm)',
              outline: 'none'
            }} 
          />
        </div>
        <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} /> Filters
        </button>
      </div>

      <div className="panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead style={{ backgroundColor: 'var(--surface-hover)' }}>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--surface-card-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Case ID</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--surface-card-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Title</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--surface-card-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Target / Lead</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--surface-card-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Priority</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--surface-card-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--surface-card-border)', color: 'var(--text-secondary)', fontWeight: 600 }}>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--surface-card-border)', transition: 'background-color 0.2s cursor-pointer', cursor: 'pointer' }}>
                <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 600 }}>{c.id}</td>
                <td style={{ padding: '1rem', fontWeight: 500 }}>{c.title}</td>
                <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {c.target.slice(0, 10)}...{c.target.slice(-8)}
                </td>
                <td style={{ padding: '1rem' }}>
                  <span className={`badge ${c.priority === 'CRITICAL' ? 'badge-critical' : c.priority === 'HIGH' ? 'badge-warning' : 'badge-neutral'}`}>
                    {c.priority}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 600, color: c.status === 'ACTIVE' ? 'var(--emerald)' : 'var(--text-secondary)' }}>
                    {c.status === 'ACTIVE' && <Activity size={14} />}
                    {c.status === 'CLOSED' && <CheckCircle2 size={14} />}
                    {c.status === 'PENDING_REVIEW' && <Clock size={14} />}
                    {c.status.replace('_', ' ')}
                  </div>
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{c.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
