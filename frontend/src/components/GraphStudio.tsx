import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { type Core } from 'cytoscape';
import { useInvestigation } from '../context/InvestigationContext';
import { toElements } from '../graph/adapter';
import { graphLayouts, type LayoutName } from '../graph/layouts';
import { applyFilters, defaultFilters, type GraphFilters } from '../graph/filters';
import { Settings, ZoomIn, ZoomOut, Maximize, Filter, Network } from 'lucide-react';

export function GraphStudio() {
  const { activeGraph } = useInvestigation();
  const container = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  
  const [layoutName, setLayoutName] = useState<LayoutName>('cose');
  const [filters, setFilters] = useState<GraphFilters>(defaultFilters);
  const [showControls, setShowControls] = useState(true);

  // Initialize cytoscape
  useEffect(() => {
    if (!container.current || !activeGraph) return;

    // Clean up previous instance
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const elements = toElements(activeGraph);

    cyRef.current = cytoscape({
      container: container.current,
      elements,
      layout: graphLayouts[layoutName],
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'background-color': 'var(--surface-card)',
            'color': 'var(--text-primary)',
            'border-width': 2,
            'border-color': 'var(--surface-card-border)',
            'font-size': '11px',
            'font-family': 'var(--font-mono)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 6,
            'width': 36,
            'height': 36,
          },
        },
        {
          selector: 'node[kind = "wallet"]',
          style: {
            'shape': 'ellipse',
            'background-color': 'var(--surface-hover)',
            'border-color': 'var(--primary)',
          },
        },
        {
          selector: 'node[kind = "transaction"]',
          style: {
            'shape': 'round-rectangle',
            'background-color': 'var(--surface)',
            'border-color': 'var(--secondary)',
            'width': 64,
            'height': 24,
            'text-valign': 'center',
            'text-margin-y': 0,
            'font-size': '10px',
            'color': 'var(--text-primary)'
          },
        },
        {
          selector: 'node[kind = "entity"]',
          style: {
            'shape': 'hexagon',
            'background-color': 'var(--surface-hover)',
            'border-color': 'var(--amber)',
          },
        },
        {
          selector: 'node[is_target = "true"]',
          style: {
            'border-color': 'var(--critical)',
            'border-width': 4,
            'width': 44,
            'height': 44,
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': 'var(--surface-card-hover-border)',
            'target-arrow-color': 'var(--surface-card-hover-border)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.8,
            'font-size': '9px',
            'color': 'var(--text-secondary)',
            'text-background-opacity': 1,
            'text-background-color': 'var(--bg-primary)',
            'text-background-padding': 2,
          },
        },
        {
          selector: 'edge[label]',
          style: {
            'label': 'data(label)',
          }
        },
        {
          selector: ':selected',
          style: {
            'background-color': 'var(--primary)',
            'line-color': 'var(--primary)',
            'target-arrow-color': 'var(--primary)',
            'source-arrow-color': 'var(--primary)',
          }
        }
      ],
    });

    cyRef.current.on('tap', 'node', (evt) => {
      // Optional: trigger contextual actions here. 
      // For now, we'll log it or hook it up to a detail panel.
      console.log('Selected node:', evt.target.data());
    });

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [activeGraph]); // Re-init on data change

  // Apply layout changes without re-initializing
  useEffect(() => {
    if (cyRef.current) {
      cyRef.current.layout(graphLayouts[layoutName]).run();
    }
  }, [layoutName]);

  // Apply filter changes
  useEffect(() => {
    if (cyRef.current) {
      applyFilters(cyRef.current, filters);
    }
  }, [filters]);

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.2);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit();

  if (!activeGraph || !activeGraph.nodes || activeGraph.nodes.length === 0) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Network size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
        <h3>Graph Unavailable</h3>
        <p>No graph data returned from the backend for this investigation.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      
      {/* Main Canvas */}
      <div 
        ref={container} 
        style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--surface-card-border)' }}
      />

      {/* Floating Toolbar */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        gap: '0.5rem',
        backgroundColor: 'var(--surface-card)',
        padding: '0.5rem',
        borderRadius: 'var(--border-radius-md)',
        border: '1px solid var(--surface-card-border)',
        boxShadow: 'var(--card-shadow)'
      }}>
        <button onClick={handleZoomIn} className="btn-secondary" title="Zoom In" style={{ padding: '0.5rem' }}><ZoomIn size={16} /></button>
        <button onClick={handleZoomOut} className="btn-secondary" title="Zoom Out" style={{ padding: '0.5rem' }}><ZoomOut size={16} /></button>
        <button onClick={handleFit} className="btn-secondary" title="Fit to Screen" style={{ padding: '0.5rem' }}><Maximize size={16} /></button>
        <div style={{ width: '1px', backgroundColor: 'var(--surface-card-border)', margin: '0 0.5rem' }} />
        <button onClick={() => setShowControls(!showControls)} className={showControls ? 'btn-primary' : 'btn-secondary'} title="Toggle Filters" style={{ padding: '0.5rem' }}>
          <Settings size={16} />
        </button>
      </div>

      {/* Side Panel: Controls */}
      {showControls && (
        <div className="panel" style={{ width: '320px', marginLeft: '1rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--surface-card-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} color="var(--text-secondary)" />
            <h4 style={{ margin: 0 }}>Graph Controls</h4>
          </div>
          
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
            
            {/* Layout Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Layout Algorithm
              </label>
              <select 
                value={layoutName} 
                onChange={(e) => setLayoutName(e.target.value as LayoutName)}
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--surface-card-border)', borderRadius: 'var(--border-radius-sm)', outline: 'none' }}
              >
                <option value="cose">Force Directed (CoSE)</option>
                <option value="concentric">Concentric</option>
                <option value="breadthfirst">Hierarchical</option>
                <option value="grid">Grid</option>
                <option value="circle">Circle</option>
              </select>
            </div>

            {/* Entity Filters */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Visibility Filters
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={filters.showWallets} onChange={(e) => setFilters(f => ({ ...f, showWallets: e.target.checked }))} />
                Show Wallets
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={filters.showTransactions} onChange={(e) => setFilters(f => ({ ...f, showTransactions: e.target.checked }))} />
                Show Transactions
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={filters.showEntities} onChange={(e) => setFilters(f => ({ ...f, showEntities: e.target.checked }))} />
                Show Entities (VASPs)
              </label>
            </div>
            
            {/* Value Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Min Value Filter (USD)
              </label>
              <input 
                type="number"
                placeholder="e.g. 5000"
                value={filters.minAmount || ''}
                onChange={(e) => setFilters(f => ({ ...f, minAmount: e.target.value ? Number(e.target.value) : null }))}
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--surface-card-border)', borderRadius: 'var(--border-radius-sm)', outline: 'none' }}
              />
            </div>

            {/* Search */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Search Node
              </label>
              <input 
                type="text"
                placeholder="Address or label..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(f => ({ ...f, searchTerm: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--surface-card-border)', borderRadius: 'var(--border-radius-sm)', outline: 'none' }}
              />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
