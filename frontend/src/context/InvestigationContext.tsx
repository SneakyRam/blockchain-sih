import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { InvestigationResult, GraphPayload } from '../types';

interface InvestigationContextState {
  activeInvestigation: InvestigationResult | null;
  activeGraph: GraphPayload | null;
  isLoading: boolean;
  
  // Computed helpers
  caseId: string | null;
  investigationId: string | null;
  targetAddress: string | null;
  chain: string | null;
  riskScore: number | null;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
  investigationStatus: string | null;

  // Actions
  setInvestigation: (result: InvestigationResult | null, graph?: GraphPayload | null) => void;
  setGraph: (graph: GraphPayload | null) => void;
  setLoading: (isLoading: boolean) => void;
}

const InvestigationContext = createContext<InvestigationContextState | undefined>(undefined);

export const InvestigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeInvestigation, setActiveInvestigation] = useState<InvestigationResult | null>(null);
  const [activeGraph, setActiveGraph] = useState<GraphPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setInvestigation = useCallback((result: InvestigationResult | null, graph?: GraphPayload | null) => {
    setActiveInvestigation(result);
    if (graph !== undefined) {
      setActiveGraph(graph);
    }
  }, []);

  const setGraph = useCallback((graph: GraphPayload | null) => {
    setActiveGraph(graph);
  }, []);

  const value: InvestigationContextState = {
    activeInvestigation,
    activeGraph,
    isLoading,
    
    // Computed from activeInvestigation
    caseId: activeInvestigation?.investigation_id || null, // The API doesn't return case_id directly in InvestigationResult, but we could infer from context or just use investigation_id
    investigationId: activeInvestigation?.investigation_id || null,
    targetAddress: activeInvestigation?.address || null,
    chain: activeInvestigation?.chain || null,
    riskScore: activeInvestigation?.risk?.score ?? null,
    riskLevel: activeInvestigation?.risk?.level ?? null,
    investigationStatus: activeInvestigation ? 'Completed' : null,
    
    setInvestigation,
    setGraph,
    setLoading: setIsLoading,
  };

  return (
    <InvestigationContext.Provider value={value}>
      {children}
    </InvestigationContext.Provider>
  );
};

export function useInvestigation() {
  const context = useContext(InvestigationContext);
  if (context === undefined) {
    throw new Error('useInvestigation must be used within an InvestigationProvider');
  }
  return context;
}
