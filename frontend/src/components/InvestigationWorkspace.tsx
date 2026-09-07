import React, { useState } from 'react';
import { useInvestigation } from '../context/InvestigationContext';
import { GraphStudio } from './GraphStudio';
import { FundFlow } from './FundFlow';
import { Transactions } from './Transactions';
import { Timeline } from './Timeline';
import { RiskIntelligence } from './RiskIntelligence';
import { EntitiesView } from './EntitiesView';
import { EvidenceView } from './EvidenceView';
import { ReportsView } from './ReportsView';
import { OverviewView } from './OverviewView';
import { TopologyView } from './TopologyView';
import { LayoutDashboard, Network, Activity, GitCommit, List, Building, Clock, AlertTriangle, FileText, Download } from 'lucide-react';

type TabId = 'overview' | 'graph' | 'fund-flow' | 'topology' | 'transactions' | 'entities' | 'timeline' | 'risk' | 'evidence' | 'report';

interface TabDefinition {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const tabs: TabDefinition[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'graph', label: 'Graph Studio', icon: Network },
  { id: 'fund-flow', label: 'Fund Flow', icon: GitCommit },
  { id: 'topology', label: 'Topology', icon: Activity },
  { id: 'transactions', label: 'Transactions', icon: List },
  { id: 'entities', label: 'Entities', icon: Building },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'risk', label: 'Risk Intelligence', icon: AlertTriangle },
  { id: 'evidence', label: 'Evidence', icon: FileText },
  { id: 'report', label: 'Report', icon: Download },
];

export function InvestigationWorkspace() {
  const { activeInvestigation, caseId, investigationId, targetAddress, riskLevel } = useInvestigation();
  const [activeTab, setActiveTab] = useState<TabId>('graph');

  if (!activeInvestigation) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <h3>No active investigation selected.</h3>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, backgroundColor: 'var(--bg-primary)' }}>
      {/* Workspace Header Context */}
      <div style={{
        padding: '1rem 2rem',
        backgroundColor: 'var(--surface-card)',
        borderBottom: '1px solid var(--surface-card-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>Case {caseId || 'UNKNOWN'}</h2>
            <span className={`badge badge-${riskLevel?.toLowerCase() || 'neutral'}`}>
              RISK: {riskLevel || 'UNKNOWN'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <span>Target: <span className="font-mono">{targetAddress}</span></span>
            <span>Investigation ID: <span className="font-mono">{investigationId}</span></span>
          </div>
        </div>
        <div>
          {/* Action buttons could go here */}
        </div>
      </div>

      {/* Secondary Navigation (Tabs) */}
      <div style={{
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--surface-card-border)',
        padding: '0 2rem',
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Workspace Content Area */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {activeTab === 'overview' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1rem' }}>Overview</h3>
            <OverviewView />
          </div>
        )}
        {activeTab === 'graph' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1rem' }}>Graph Studio</h3>
            <div style={{ flex: 1, minHeight: '500px' }}>
              <GraphStudio />
            </div>
          </div>
        )}
        {activeTab === 'fund-flow' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1rem' }}>Fund Flow</h3>
            <FundFlow />
          </div>
        )}
        {activeTab === 'topology' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1rem' }}>Topology</h3>
            <TopologyView />
          </div>
        )}        {activeTab === 'transactions' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1rem' }}>Transactions</h3>
            <Transactions />
          </div>
        )}
        {activeTab === 'entities' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1rem' }}>Entities</h3>
            <EntitiesView />
          </div>
        )}
        {activeTab === 'timeline' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1rem' }}>Timeline</h3>
            <Timeline />
          </div>
        )}
        {activeTab === 'risk' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1rem' }}>Risk Intelligence</h3>
            <RiskIntelligence />
          </div>
        )}
        {activeTab === 'evidence' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1rem' }}>Evidence Vault</h3>
            <EvidenceView />
          </div>
        )}        {activeTab === 'report' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '1rem' }}>Report</h3>
            <ReportsView />
          </div>
        )}
      </div>
    </div>
  );
}
