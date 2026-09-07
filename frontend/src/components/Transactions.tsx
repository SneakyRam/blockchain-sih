import React, { useState, useMemo } from 'react';
import { useInvestigation } from '../context/InvestigationContext';
import { ArrowUpRight, ArrowDownRight, Filter, Search } from 'lucide-react';

export function Transactions() {
  const { activeInvestigation } = useInvestigation();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'timestamp' | 'amount'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const transactions = useMemo(() => {
    let txs = activeInvestigation?.transactions || [];
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      txs = txs.filter(tx => 
        tx.tx_hash?.toLowerCase().includes(lower) ||
        tx.from_address?.toLowerCase().includes(lower) ||
        tx.to_address?.toLowerCase().includes(lower)
      );
    }

    return [...txs].sort((a, b) => {
      let valA, valB;
      if (sortField === 'timestamp') {
        valA = new Date(a.timestamp || 0).getTime();
        valB = new Date(b.timestamp || 0).getTime();
      } else {
        valA = parseFloat(a.amount || '0');
        valB = parseFloat(b.amount || '0');
      }
      
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [activeInvestigation, searchTerm, sortField, sortOrder]);

  if (!activeInvestigation?.transactions?.length) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <h3>No Transactions Available</h3>
      </div>
    );
  }

  const handleSort = (field: 'timestamp' | 'amount') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input 
            type="text" 
            placeholder="Search hash or address..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--surface-card-border)', borderRadius: 'var(--border-radius-md)', backgroundColor: 'var(--surface-card)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--surface-hover)', zIndex: 10 }}>
            <tr>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid var(--surface-card-border)' }}>Type</th>
              <th 
                style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid var(--surface-card-border)', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('timestamp')}
              >
                Date/Time {sortField === 'timestamp' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid var(--surface-card-border)' }}>Hash</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid var(--surface-card-border)' }}>From</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid var(--surface-card-border)' }}>To</th>
              <th 
                style={{ padding: '0.75rem 1rem', textAlign: 'right', borderBottom: '1px solid var(--surface-card-border)', cursor: 'pointer', userSelect: 'none' }}
                onClick={() => handleSort('amount')}
              >
                Amount {sortField === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, i) => {
              const isOutbound = tx.from_address === activeInvestigation.address;
              return (
                <tr key={tx.tx_hash || i} style={{ borderBottom: '1px solid var(--surface-card-border)', backgroundColor: 'var(--surface-card)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {isOutbound ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--warning)', backgroundColor: 'rgba(255, 179, 71, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        <ArrowUpRight size={14} /> OUT
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--emerald)', backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        <ArrowDownRight size={14} /> IN
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                    {new Date(tx.timestamp || '').toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                    {tx.tx_hash ? `${tx.tx_hash.slice(0, 8)}...${tx.tx_hash.slice(-6)}` : 'N/A'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)' }}>
                    {tx.from_address ? (
                      tx.from_address === activeInvestigation.address ? (
                        <span style={{ fontWeight: 600 }}>(Target)</span>
                      ) : (
                        `${tx.from_address.slice(0, 8)}...${tx.from_address.slice(-6)}`
                      )
                    ) : 'Unknown'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)' }}>
                    {tx.to_address ? (
                      tx.to_address === activeInvestigation.address ? (
                        <span style={{ fontWeight: 600 }}>(Target)</span>
                      ) : (
                        `${tx.to_address.slice(0, 8)}...${tx.to_address.slice(-6)}`
                      )
                    ) : 'Unknown'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {tx.amount} {tx.asset}
                  </td>
                </tr>
              );
            })}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No transactions match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
