import { type ElementDefinition } from 'cytoscape';
import type { GraphPayload, GraphNode } from '../types';

function key(value: string | undefined): string {
  return value ?? '';
}

function short(value: string): string {
  if (!value) return '';
  return value.length > 20 ? `${value.slice(0, 8)}..${value.slice(-6)}` : value;
}

/** Normalize backend type string to canonical kind understood by GraphStudio */
function resolveKind(node: GraphNode): string {
  const raw = String(node.type ?? node.kind ?? 'unknown').toLowerCase();
  // in-memory graph uses "address"; Neo4j uses "Wallet"
  if (raw === 'address' || raw === 'wallet') return 'wallet';
  if (raw === 'transaction') return 'transaction';
  if (raw === 'entity' || raw === 'protocol' || raw === 'chain' || raw === 'investigation') return 'entity';
  return 'wallet'; // fallback
}

/** Resolve a display label for the node */
function resolveLabel(node: GraphNode, kind: string): string {
  if (kind === 'transaction') {
    const asset = String(node.asset ?? 'TX');
    const amount = node.amount ? ` ${node.amount}` : '';
    return `${asset}${amount}`.trim();
  }
  if (kind === 'entity' && node.name) return String(node.name);
  const raw = String(node.label ?? node.address ?? node.name ?? (node.tx_hash as string) ?? '');
  return short(raw);
}

export function toElements(graph: GraphPayload): ElementDefinition[] {
  const nodes = graph.nodes ?? [];
  const ids = new Set(nodes.flatMap((node) => [key(node.id), key(node.identity)]));

  const elements: ElementDefinition[] = nodes.map((node, index) => {
    const id = key(node.identity) || key(node.id) || `node-${index}`;
    const kind = resolveKind(node);
    const label = resolveLabel(node, kind);

    return {
      data: {
        ...node,
        id,
        kind,
        label,
        is_target: String(node.is_target ?? ''),
        vasp_type: String(node.vasp_type ?? ''),
      }
    };
  });

  for (const edge of graph.edges ?? []) {
    let source = edge.source;
    let target = edge.target;
    if (!ids.has(source)) source = source.replace(/^address:/, '');
    if (!ids.has(target)) target = target.replace(/^address:/, '');

    if (source && target && ids.has(source) && ids.has(target)) {
      const props = (edge.properties ?? {}) as Record<string, unknown>;
      const amount = props.amount ?? (edge as Record<string, unknown>).amount;
      const asset  = props.asset  ?? (edge as Record<string, unknown>).asset ?? '';
      const edgeLabel = amount ? `${asset} ${amount}`.trim() : (edge.type ?? '');
      elements.push({
        data: {
          ...edge,
          id: `${source}-${target}-${elements.length}`,
          source,
          target,
          label: edgeLabel,
        }
      });
    }
  }

  return elements;
}
