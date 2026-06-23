import React, { useState, useEffect, useRef } from 'react';
import { Search, ZoomIn, ZoomOut, Maximize2, Layers, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { BuildTarget, BuildSession } from '../types';

interface InteractiveDAGProps {
  targets: BuildTarget[];
  topoBatches: string[][];
  activeBuild: BuildSession | null;
  cyclePath: string[] | null;
}

interface NodeCoords {
  [key: string]: { x: number; y: number; layer: number };
}

export default function InteractiveDAG({
  targets,
  topoBatches,
  activeBuild,
  cyclePath
}: InteractiveDAGProps) {
  const [zoom, setZoom] = useState<number>(0.9);
  const [pan, setPan] = useState({ x: 50, y: 30 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Custom interactive node positions
  const [nodeCoords, setNodeCoords] = useState<NodeCoords>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute positions dynamically whenever targets or topobatches change
  useEffect(() => {
    if (topoBatches.length === 0) return;

    const coords: NodeCoords = {};
    const colWidth = 220;
    const rowHeight = 100;

    topoBatches.forEach((batch, colIndex) => {
      const numInBatch = batch.length;
      const startY = 160 - ((numInBatch - 1) * rowHeight) / 2;
      
      batch.forEach((nodeName, rowIndex) => {
        coords[nodeName] = {
          x: colIndex * colWidth + 80,
          y: startY + rowIndex * rowHeight,
          layer: colIndex
        };
      });
    });

    setNodeCoords(coords);
  }, [targets, topoBatches]);

  // Handle Dragging Workspace (Pan)
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('.interactive-node')) {
      return;
    }
    setIsDraggingPan(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingPan) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDraggingPan(false);
  };

  const handleZoom = (factor: number) => {
    setZoom(prev => Math.min(Math.max(prev + factor, 0.4), 1.8));
  };

  const handleResetView = () => {
    setZoom(0.9);
    setPan({ x: 50, y: 30 });
    setSelectedNode(null);
  };

  const toggleCollapse = (nodeName: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeName)) {
        next.delete(nodeName);
      } else {
        next.add(nodeName);
      }
      return next;
    });
  };

  // Helper arrays for highlighting dependencies & reverse dependencies
  const getDependencyChains = (node: string): { deps: Set<string>; revDeps: Set<string> } => {
    const deps = new Set<string>();
    const revDeps = new Set<string>();

    const findDeps = (curr: string) => {
      const target = targets.find(t => t.name === curr);
      if (!target) return;
      target.deps.forEach(d => {
        if (!deps.has(d)) {
          deps.add(d);
          findDeps(d);
        }
      });
    };

    const findRevDeps = (curr: string) => {
      targets.forEach(t => {
        if (t.deps.includes(curr)) {
          if (!revDeps.has(t.name)) {
            revDeps.add(t.name);
            findRevDeps(t.name);
          }
        }
      });
    };

    if (node) {
      findDeps(node);
      findRevDeps(node);
    }

    return { deps, revDeps };
  };

  const { deps: activeDeps, revDeps: activeRevDeps } = selectedNode
    ? getDependencyChains(selectedNode)
    : { deps: new Set<string>(), revDeps: new Set<string>() };

  // Calculate connected edges
  const edges: { from: string; to: string; active: boolean; compiling: boolean }[] = [];
  targets.forEach(target => {
    target.deps.forEach(dep => {
      // Don't show edge if source or destination side is collapsed
      const isCollapsed = collapsedNodes.has(dep);
      if (!isCollapsed) {
        const toState = activeBuild?.targets[target.name]?.status;
        const fromState = activeBuild?.targets[dep]?.status;
        edges.push({
          from: dep,
          to: target.name,
          active: selectedNode === dep || selectedNode === target.name || (activeDeps.has(dep) && activeDeps.has(target.name)) || (activeRevDeps.has(dep) && activeRevDeps.has(target.name)),
          compiling: toState === 'RUNNING' && fromState === 'SUCCEEDED'
        });
      }
    });
  });

  return (
    <div className="bg-[#0D0E11] border border-white/10 rounded-lg p-4 flex flex-col h-[520px] relative select-none overflow-hidden" id="dag_visualizer">
      {/* Search and control overlay */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#050506]/90 p-2 rounded border border-white/5 relative z-20 shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-status-blue" />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">Dynamic Topology DAG Canvas</span>
        </div>

        {/* Node search input */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
            <input
              type="text"
              placeholder="Search target node..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-2.5 py-1 text-[11px] font-mono bg-black text-white hover:border-white/10 focus:border-status-blue rounded border border-white/5 outline-none w-44"
            />
          </div>

          <div className="flex items-center bg-black rounded border border-white/5 p-0.5">
            <button
              onClick={() => handleZoom(0.1)}
              title="Zoom In"
              className="p-1 hover:bg-white/15 text-zinc-300 hover:text-white rounded transition"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom(-0.1)}
              title="Zoom Out"
              className="p-1 hover:bg-white/15 text-zinc-300 hover:text-white rounded transition"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              title="Reset View"
              className="p-1 hover:bg-white/15 text-zinc-300 hover:text-white rounded transition"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {cyclePath && (
        <div className="absolute top-16 left-4 right-4 z-20 bg-red-950/80 border border-red-500/20 p-3 rounded flex items-center gap-2 text-xs font-mono text-red-300 shadow-md">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>Deadlock layout suspended. Clean BUILD graph source to restore topological DAG coordinates.</span>
        </div>
      )}

      {/* SVG Pan/Zoom Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 w-full bg-[#050506]/35 relative cursor-grab active:cursor-grabbing overflow-hidden ${
          isDraggingPan ? 'cursor-grabbing' : ''
        }`}
      >
        {/* Dynamic Grid Background following pan and zoom */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.2]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)',
            backgroundSize: `${30 * zoom}px ${30 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
        ></div>

        <svg
          className="w-full h-full absolute inset-0 pointer-events-none"
          style={{ transform: 'none' }}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Draw connectors (Edges) */}
            {edges.map((edge, index) => {
              const start = nodeCoords[edge.from];
              const end = nodeCoords[edge.to];
              if (!start || !end) return null;

              // Draw bezier curves for professional visuals
              const x1 = start.x + 130;
              const y1 = start.y + 20;
              const x2 = end.x;
              const y2 = end.y + 20;
              const cp1x = x1 + 60;
              const cp1y = y1;
              const cp2x = x2 - 60;
              const cp2y = y2;

              let strokeColor = 'rgba(255, 255, 255, 0.1)';
              let strokeWidth = '1.5';
              let dashArray = '';

              if (edge.active && selectedNode === edge.from) {
                // Going down stream - highlighted dependency
                strokeColor = '#60A5FA';
                strokeWidth = '2';
              } else if (edge.active && selectedNode === edge.to) {
                // Upstream - dependency driving this node
                strokeColor = '#34D399';
                strokeWidth = '2';
              } else if (edge.active) {
                strokeColor = '#818CF8';
                strokeWidth = '2';
              }

              if (edge.compiling) {
                dashArray = '5,5';
              }

              return (
                <g key={index} className="pointer-events-none">
                  <path
                    d={`M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    className="transition-all duration-300"
                  />
                  {edge.compiling && (
                    <circle r="4" fill="#FBBF24">
                      <animateMotion
                        path={`M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`}
                        dur="1.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* DOM elements for interactive nodes centered inside zoom element */}
        <div
          className="absolute inset-0 origin-top-left pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
          }}
        >
          {Object.entries(nodeCoords).map(([nodeName, coordsVal]) => {
            const coords = coordsVal as any;
            const state = activeBuild?.targets[nodeName]?.status || 'QUEUED';
            const isSelected = selectedNode === nodeName;
            const isSearchMatch = searchTerm && nodeName.toLowerCase().includes(searchTerm.toLowerCase());
            const hasDepHighlight = selectedNode && (activeDeps.has(nodeName) || activeRevDeps.has(nodeName));
            
            const isCollapsed = collapsedNodes.has(nodeName);

            // Determine border & neon glowing styles depending on state
            let cardStyle = 'border-white/10 bg-[#0D0E11]/90 text-zinc-400';
            let dotColor = 'bg-zinc-500';
            
            if (state === 'RUNNING') {
              cardStyle = 'border-amber-500/80 bg-amber-950/15 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.15)] animate-pulse';
              dotColor = 'bg-amber-400';
            } else if (state === 'SUCCEEDED') {
              cardStyle = 'border-[#4ADE80]/50 bg-emerald-950/10 text-[#4ADE80]';
              dotColor = 'bg-[#4ADE80]';
            } else if (state === 'CACHED') {
              cardStyle = 'border-[#60A5FA]/50 bg-blue-950/10 text-status-blue';
              dotColor = 'bg-status-blue';
            } else if (state === 'FAILED') {
              cardStyle = 'border-red-500/70 bg-red-950/10 text-red-300';
              dotColor = 'bg-red-500';
            }

            if (isSelected) {
              cardStyle += ' ring-2 ring-white/10 border-white text-white scale-[1.03]';
            } else if (isSearchMatch) {
              cardStyle += ' ring-2 ring-status-blue border-status-blue shadow-[0_0_15px_rgba(96,165,250,0.4)] animate-bounce';
            } else if (hasDepHighlight) {
              if (activeDeps.has(nodeName)) {
                cardStyle += ' border-status-blue text-blue-200';
              } else {
                cardStyle += ' border-[#4ADE80] text-emerald-200';
              }
            }

            // Simple responsive interaction
            return (
              <div
                key={nodeName}
                className="absolute pointer-events-auto transition-transform duration-350 interactive-node select-none"
                style={{
                  top: coords.y,
                  left: coords.x,
                  transform: 'translate(-50%, -50%)',
                  width: '150px'
                }}
              >
                <div
                  onClick={() => setSelectedNode(isSelected ? null : nodeName)}
                  className={`border px-3 py-2 rounded text-left cursor-pointer flex flex-col justify-between h-14 relative group justify-center ${cardStyle}`}
                >
                  <p className="font-mono text-[9px] text-zinc-500 font-bold tracking-widest leading-none mb-1">
                    {targets.find(t => t.name === nodeName)?.ruleType || 'cc_library'}
                  </p>
                  <p className="font-mono text-xs font-bold tracking-tight truncate leading-tight">
                    {nodeName.replace('//:', ':')}
                  </p>

                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                    
                    {/* Expand/Collapse sub-elements trigger */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(nodeName);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 bg-black/40 rounded hover:bg-black text-zinc-400 hover:text-white transition cursor-pointer"
                      title={isCollapsed ? "Expand target descendants" : "Collapse target descendants"}
                    >
                      {isCollapsed ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Collapse tracker badge */}
                  {isCollapsed && (
                    <span className="absolute -bottom-1.5 -right-1.5 text-[8px] px-1 bg-zinc-800 text-zinc-300 font-mono rounded border border-white/5 select-none font-bold">
                      COLLAPSED
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live active key guide overlay in corner */}
      <div className="absolute bottom-4 left-4 z-20 bg-[#050506]/95 border border-white/10 px-3 py-2 rounded flex gap-4 text-[10px] font-mono text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded bg-zinc-500"></span>
          <span>QUEUED</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded bg-amber-400 animate-pulse"></span>
          <span>BUILDING</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded bg-[#4ADE80]"></span>
          <span>SUCCESS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded bg-status-blue"></span>
          <span>CACHED</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-white/10 pl-4 text-zinc-500">
          <span>Click Node to Inspect Transitive Chains</span>
        </div>
      </div>
    </div>
  );
}
