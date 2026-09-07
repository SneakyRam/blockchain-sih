import { type ElementDefinition } from 'cytoscape';
import type { GraphPayload, GraphNode, GraphEdge } from '../types';

function key(value: string | undefined): string {
  return value ?? '';
}

function short(value: string): string {
  if (!value) return '';
  return value.length > 20 ? `${value.slice(0, 8)}..${value.slice(-6)}` : value;
}

export function toElements(graph: GraphPayload): ElementDefinition[] {
  const nodes = graph.nodes ?? [];
  const ids = new Set(nodes.flatMap((node) => [key(node.id), key(node.identity)]));
  
  const elements: ElementDefinition[] = nodes.map((node, index) => {
    const id = key(node.identity) || key(node.id) || `node-${index}`;
    const kind = String(node.type ?? 'unknown').toLowerCase();
    const rawLabel = String(node.label ?? node.address ?? node.name ?? node.tx_hash ?? id);
    
    // Format label based on node type
    let label = short(rawLabel);
    if (kind === 'transaction') {
      label = `${node.asset ?? 'TX'} ${node.amount ?? ''}`.trim();
    } else if (kind === 'entity' && node.name) {
      label = String(node.name);
    }
    
    return { 
      data: { 
        ...node, 
        id, 
        kind, 
        label, 
        is_target: String(node.is_target ?? '') 
      } 
    };
  });

  for (const edge of graph.edges ?? []) {
    const source = ids.has(edge.source) ? edge.source : edge.source.replace(/^address:/, '');
    const target = ids.has(edge.target) ? edge.target : edge.target.replace(/^address:/, '');
    
    if (source && target && ids.has(source) && ids.has(target)) {
      elements.push({ 
        data: { 
          ...edge, 
          id: `${source}-${target}-${elements.length}`, 
          source, 
          target, 
          label: edge.type ?? '' 
        } 
      });
    }
  }

  return elements;
}
