import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { InvestigationResult, GraphPayload, Transaction } from '../types';

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

  // Shortcut data accessors
  transactions: Transaction[];
  counterparties: Array<{ address: string; count: number }>;

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

  const inv = activeInvestigation as (InvestigationResult & Record<string, unknown>) | null;

  // Pull transactions from wherever the backend puts them
  const transactions: Transaction[] = (
    inv?.transactions ??
    (inv?.normalized as Record<string, unknown> | undefined)?.transactions ??
    []
  ) as Transaction[];

  const counterparties: Array<{ address: string; count: number }> = (
    inv?.counterparties ??
    (inv?.normalized as Record<string, unknown> | undefined)?.counterparties ??
    []
  ) as Array<{ address: string; count: number }>;

  const value: InvestigationContextState = {
    activeInvestigation,
    activeGraph,
    isLoading,

    // Computed from activeInvestigation
    caseId: (inv?.case_id as string | null) ?? inv?.investigation_id ?? null,
    investigationId: inv?.investigation_id ?? null,
    targetAddress: inv?.address ?? null,
    chain: inv?.chain ?? null,
    riskScore: inv?.risk?.score ?? null,
    riskLevel: inv?.risk?.level ?? null,
    investigationStatus: (inv?.status as string | null) ?? (inv ? 'Completed' : null),

    transactions,
    counterparties,

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
