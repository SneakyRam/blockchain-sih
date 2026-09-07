import React, { useMemo } from 'react';
import { useInvestigation } from '../context/InvestigationContext';
import { Clock, ArrowRight, Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'transaction' | 'risk_flag' | 'entity_association' | 'investigation_start';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  details?: any;
}

export function Timeline() {
  const { activeInvestigation } = useInvestigation();

  const events = useMemo(() => {
    if (!activeInvestigation) return [];

    const timeline: TimelineEvent[] = [];

    // Investigation Start
    timeline.push({
      id: 'inv_start',
      timestamp: new Date(activeInvestigation.created_at || Date.now()),
      type: 'investigation_start',
      title: 'Investigation Initiated',
      description: `Trace started on target address ${activeInvestigation.address.slice(0, 8)}...`,
      severity: 'info'
    });

    // Risk Flag (Mocking based on risk level)
    if (activeInvestigation.risk?.level === 'CRITICAL' || activeInvestigation.risk?.level === 'HIGH') {
      timeline.push({
        id: 'risk_flag',
        timestamp: new Date(new Date(activeInvestigation.created_at || Date.now()).getTime() + 1000 * 60 * 5), // +5 mins
        type: 'risk_flag',
        title: `${activeInvestigation.risk.level} Risk Detected`,
        description: `Score: ${activeInvestigation.risk.score}/100. Factors: ${activeInvestigation.risk.factors?.join(', ') || 'Unknown'}`,
        severity: 'critical'
      });
    }

    // Transactions
    activeInvestigation.transactions?.forEach(tx => {
      if (!tx.timestamp) return;
      const isOutbound = tx.from_address === activeInvestigation.address;
      
      timeline.push({
        id: tx.tx_hash || Math.random().toString(),
        // Check if timestamp is likely a unix timestamp (number) or ISO string
        timestamp: new Date(typeof tx.timestamp === 'number' ? tx.timestamp * 1000 : tx.timestamp),
        type: 'transaction',
        title: isOutbound ? 'Outbound Transfer' : 'Inbound Transfer',
        description: `${tx.amount} ${tx.asset} ${isOutbound ? 'sent to' : 'received from'} ${isOutbound ? tx.to_address?.slice(0, 8) : tx.from_address?.slice(0, 8)}...`,
        severity: 'info',
        details: tx
      });
    });

    // Sort chronologically
    return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [activeInvestigation]);

  if (events.length === 0) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Clock size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
        <h3>No Event History</h3>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div className="panel" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-hover)' }}>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Chronological sequence of on-chain activities and intelligence correlations.
        </p>
      </div>

      <div style={{ position: 'relative', paddingLeft: '2rem' }}>
        {/* Vertical Line */}
        <div style={{ position: 'absolute', left: '7px', top: '10px', bottom: '0', width: '2px', backgroundColor: 'var(--surface-card-border)' }} />
        
        {events.map((event, idx) => {
          
          let Icon = Activity;
          let iconColor = 'var(--text-secondary)';
          let bgColor = 'var(--surface)';
          let borderColor = 'var(--surface-card-border)';
          
          if (event.type === 'investigation_start') {
            Icon = CheckCircle2;
            iconColor = 'var(--primary)';
          } else if (event.type === 'risk_flag') {
            Icon = ShieldAlert;
            iconColor = 'var(--critical)';
            bgColor = 'rgba(255, 68, 68, 0.05)';
            borderColor = 'rgba(255, 68, 68, 0.2)';
          } else if (event.type === 'transaction') {
            Icon = ArrowRight;
            iconColor = 'var(--text-primary)';
          }

          return (
            <div key={event.id} style={{ position: 'relative', marginBottom: '2rem' }}>
              {/* Timeline Dot */}
              <div style={{ 
                position: 'absolute', 
                left: '-2.15rem', 
                top: '0.25rem', 
                width: '16px', 
                height: '16px', 
                borderRadius: '50%', 
                backgroundColor: 'var(--bg-primary)', 
                border: `2px solid ${iconColor}`,
                zIndex: 2
              }} />
              
              <div className="panel" style={{ 
                padding: '1.25rem', 
                backgroundColor: bgColor, 
                borderColor: borderColor 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon size={16} color={iconColor} />
                    <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>{event.title}</h4>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {event.timestamp.toLocaleString()}
                  </span>
                </div>
                
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {event.description}
                </p>

                {event.details && event.type === 'transaction' && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--surface-card-border)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>TX HASH</span>
                      <span style={{ color: 'var(--primary)' }}>{event.details.tx_hash}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
