import { type Core } from 'cytoscape';

export type NodeKind = 'wallet' | 'transaction' | 'entity' | 'protocol' | 'chain';

export interface GraphFilters {
  showWallets: boolean;
  showTransactions: boolean;
  showEntities: boolean;
  minAmount: number | null;
  searchTerm: string;
}

export const defaultFilters: GraphFilters = {
  showWallets: true,
  showTransactions: true,
  showEntities: true,
  minAmount: null,
  searchTerm: '',
};

export function applyFilters(cy: Core, filters: GraphFilters): void {
  cy.batch(() => {
    // Show all first
    cy.elements().style('display', 'element');

    // Filter by kind
    if (!filters.showWallets) {
      cy.nodes('[kind = "wallet"]').style('display', 'none');
    }
    if (!filters.showTransactions) {
      cy.nodes('[kind = "transaction"]').style('display', 'none');
    }
    if (!filters.showEntities) {
      cy.nodes('[kind = "entity"]').style('display', 'none');
    }

    // Filter by amount (only applies to transactions)
    if (filters.minAmount !== null && filters.minAmount > 0) {
      cy.nodes('[kind = "transaction"]').forEach((node) => {
        const amtStr = node.data('amount') || node.data('amount_raw');
        const amt = parseFloat(String(amtStr).replace(/[^0-9.]/g, ''));
        if (!isNaN(amt) && amt < filters.minAmount!) {
          node.style('display', 'none');
        }
      });
    }

    // Filter by search term
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      cy.nodes().forEach((node) => {
        const label = String(node.data('label') || '').toLowerCase();
        const address = String(node.data('address') || '').toLowerCase();
        const txHash = String(node.data('tx_hash') || '').toLowerCase();
        
        if (!label.includes(term) && !address.includes(term) && !txHash.includes(term)) {
          node.style('display', 'none');
        }
      });
    }
  });
}
