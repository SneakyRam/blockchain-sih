import cytoscape, { Core } from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { toElements } from './adapter';
import { graphLayouts } from './layouts';
import type { GraphPayload } from '../types';

cytoscape.use(fcose);

export function renderGraph(
  container: HTMLDivElement,
  graph: GraphPayload,
  onSelect: (data: Record<string, unknown>) => void
): Core {
  const elements = toElements(graph);

  const cy = cytoscape({
    container,
    elements,
    style: [
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'background-color': '#3b82f6',
          'color': '#fff',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': '10px',
          'text-outline-width': 2,
          'text-outline-color': '#3b82f6',
          'width': 40,
          'height': 40
        }
      },
      {
        selector: 'node[kind="entity"]',
        style: {
          'shape': 'hexagon',
          'background-color': '#e11d48',
          'text-outline-color': '#e11d48',
          'width': 50,
          'height': 50
        }
      },
      {
        selector: 'node[is_target="true"]',
        style: {
          'border-width': 4,
          'border-color': '#facc15'
        }
      },
      {
        selector: 'edge',
        style: {
          'label': 'data(label)',
          'width': 2,
          'line-color': '#64748b',
          'target-arrow-color': '#64748b',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'font-size': '10px',
          'color': '#fff',
          'text-background-opacity': 1,
          'text-background-color': '#334155',
          'text-background-padding': '2px',
          'text-background-shape': 'roundrectangle'
        }
      }
    ],
    layout: graphLayouts.cose
  });

  cy.on('tap', 'node', (e) => {
    onSelect(e.target.data());
  });

  cy.on('tap', 'edge', (e) => {
    onSelect(e.target.data());
  });

  return cy;
}

export * from './adapter';
export * from './layouts';
export * from './filters';
