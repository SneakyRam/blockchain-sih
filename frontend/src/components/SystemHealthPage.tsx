import React from 'react';
import { Activity, Database, Server, Shield, Globe, Cpu } from 'lucide-react';

export function SystemHealthPage() {
  const metrics = [
    { label: 'API Gateway', status: 'Healthy', latency: '42ms', icon: Globe },
    { label: 'Neo4j Graph Database', status: 'Healthy', latency: '115ms', icon: Database },
    { label: 'Redis Cache', status: 'Healthy', latency: '12ms', icon: Server },
    { label: 'Blockchain Connectors', status: 'Degraded', latency: '850ms', icon: Activity, color: 'var(--warning)' },
    { label: 'AI Risk Engine', status: 'Healthy', latency: '230ms', icon: Cpu },
  ];

  return (
    <div style={{ padding: '2rem 4rem', maxWidth: '1440px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div>
        <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>System Health & Alerts</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Monitor TraceX infrastructure and backend service status.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Alerts Feed */}
        <div className="panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', gridColumn: '1 / -1' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} color="var(--primary)" />
            Recent System Alerts
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(255, 179, 71, 0.1)', border: '1px solid rgba(255, 179, 71, 0.3)', borderRadius: 'var(--border-radius-sm)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ color: 'var(--warning)', display: 'block', marginBottom: '0.25rem' }}>Rate Limit Approaching</strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Etherscan API connector is at 85% of daily quota.</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>10 mins ago</span>
            </div>
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--surface-card-border)', borderRadius: 'var(--border-radius-sm)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>New OFAC Sanction List Imported</strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Successfully synced 142 new entities from OFAC SDN.</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>3 hours ago</span>
            </div>
          </div>
        </div>

        {/* Service Metrics */}
        {metrics.map((m, i) => {
          const Icon = m.icon;
          const statusColor = m.color || 'var(--emerald)';
          
          return (
            <div key={i} className="panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--border-radius-md)' }}>
                <Icon size={24} color="var(--primary)" />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>{m.label}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: statusColor }}>{m.status}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.latency}</span>
                </div>
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
