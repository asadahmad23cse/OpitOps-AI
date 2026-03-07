"use client";

import { useState, useMemo, useCallback, useRef } from 'react';
import { Network, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { useTopology } from '@/hooks/use-topology';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatTimeAgo, cn } from '@/lib/utils';
import { TopologyNodeCard } from './TopologyNodeCard';
import { TopologyEdgeTooltip } from './TopologyEdgeTooltip';
import { NodeDetailsDrawer } from './NodeDetailsDrawer';
import type { TopologyNode, TopologyEdge, TopoNodeStatus } from '@/types';

const NODE_WIDTH = 180;
const NODE_HEIGHT_EST = 110;

function getNodeCenter(node: TopologyNode) {
  return { x: node.position.x, y: node.position.y + NODE_HEIGHT_EST / 2 };
}

function getEdgePath(source: TopologyNode, target: TopologyNode): string {
  const s = getNodeCenter(source);
  const t = getNodeCenter(target);
  const dy = t.y - s.y;
  const dx = t.x - s.x;
  if (Math.abs(dy) > 40) {
    const cp1y = s.y + dy * 0.4;
    const cp2y = s.y + dy * 0.6;
    return `M ${s.x} ${s.y + NODE_HEIGHT_EST / 2 - 5} C ${s.x} ${cp1y}, ${t.x} ${cp2y}, ${t.x} ${t.y - NODE_HEIGHT_EST / 2 + 5}`;
  }
  return `M ${s.x + NODE_WIDTH / 2 * Math.sign(dx)} ${s.y} L ${t.x - NODE_WIDTH / 2 * Math.sign(dx)} ${t.y}`;
}

const edgeStatusColor: Record<TopoNodeStatus, string> = {
  healthy: 'rgba(52,211,153,0.4)',
  warning: 'rgba(251,191,36,0.5)',
  critical: 'rgba(248,113,113,0.6)',
};
const edgeStatusColorActive: Record<TopoNodeStatus, string> = {
  healthy: 'rgba(52,211,153,0.8)',
  warning: 'rgba(251,191,36,0.9)',
  critical: 'rgba(248,113,113,1)',
};

const legendItems: { status: TopoNodeStatus; label: string; color: string }[] = [
  { status: 'healthy', label: 'Healthy', color: 'bg-emerald-400' },
  { status: 'warning', label: 'Warning', color: 'bg-amber-400' },
  { status: 'critical', label: 'Critical', color: 'bg-red-400' },
];

export function InfrastructureArchitectureMap() {
  const { data, isLoading, error, refetch, isFetching } = useTopology();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [drawerNodeId, setDrawerNodeId] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<{ edge: TopologyEdge; pos: { x: number; y: number } } | null>(null);
  const [envFilter, setEnvFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const topo = data?.data;
  const allNodes = topo?.nodes || [];
  const allEdges = topo?.edges || [];

  const filteredNodes = useMemo(() => {
    return allNodes.filter(n => {
      if (envFilter !== 'all' && n.environment.toLowerCase() !== envFilter) return false;
      if (statusFilter !== 'all' && n.status !== statusFilter) return false;
      return true;
    });
  }, [allNodes, envFilter, statusFilter]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return allEdges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [allEdges, filteredNodeIds]);

  const connectedIds = useMemo(() => {
    if (!selectedNodeId) return null;
    const ids = new Set<string>([selectedNodeId]);
    for (const e of filteredEdges) {
      if (e.source === selectedNodeId || e.target === selectedNodeId) {
        ids.add(e.source);
        ids.add(e.target);
      }
    }
    return ids;
  }, [selectedNodeId, filteredEdges]);

  const isEdgeHighlighted = useCallback((e: TopologyEdge) => {
    if (!selectedNodeId) return false;
    return e.source === selectedNodeId || e.target === selectedNodeId;
  }, [selectedNodeId]);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (selectedNodeId === nodeId) {
      setDrawerNodeId(nodeId);
    } else {
      setSelectedNodeId(nodeId);
    }
  }, [selectedNodeId]);

  const handleCanvasClick = useCallback(() => {
    setSelectedNodeId(null);
    setHoveredEdge(null);
  }, []);

  // Clear selection if node filtered out
  if (selectedNodeId && !filteredNodeIds.has(selectedNodeId)) {
    setSelectedNodeId(null);
  }

  const toggleFullscreen = () => {
    if (!fullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  const canvasHeight = Math.max(...allNodes.map(n => n.position.y + NODE_HEIGHT_EST + 40), 560);
  const canvasWidth = Math.max(...allNodes.map(n => n.position.x + NODE_WIDTH / 2 + 20), 860);

  return (
    <>
      <div ref={containerRef} className={cn('bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden', fullscreen && 'fixed inset-0 z-40 rounded-none')}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/20">
              <Network className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Infrastructure Architecture Map</h3>
              <p className="text-xs text-gray-500">Real-time topology and service connections</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="hidden lg:flex items-center gap-3 mr-2">
              {legendItems.map(l => (
                <div key={l.status} className="flex items-center gap-1.5">
                  <div className={cn('w-2 h-2 rounded-full', l.color)} />
                  <span className="text-[10px] text-gray-400">{l.label}</span>
                </div>
              ))}
            </div>
            {/* Filters */}
            <select
              value={envFilter}
              onChange={e => setEnvFilter(e.target.value)}
              className="text-xs bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-gray-300 focus:outline-none focus:border-cyan-500/50"
              suppressHydrationWarning
            >
              <option value="all">All Envs</option>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="development">Development</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-gray-300 focus:outline-none focus:border-cyan-500/50"
              suppressHydrationWarning
            >
              <option value="all">All Status</option>
              <option value="healthy">Healthy</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
            {/* Last updated */}
            {topo?.lastUpdated && (
              <span className="text-[10px] text-gray-500 hidden xl:block">Updated {formatTimeAgo(topo.lastUpdated)}</span>
            )}
            {/* Refresh */}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              aria-label="Refresh topology"
              suppressHydrationWarning
            >
              <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
            </button>
            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
              aria-label="Toggle fullscreen"
              suppressHydrationWarning
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative overflow-auto" style={{ minHeight: fullscreen ? 'calc(100vh - 64px)' : `${canvasHeight}px` }}>
          {isLoading ? (
            <div className="p-6 space-y-4">
              <div className="flex justify-center"><Skeleton className="w-44 h-24 rounded-xl" /></div>
              <div className="flex justify-center"><Skeleton className="w-44 h-24 rounded-xl" /></div>
              <div className="flex justify-center gap-8"><Skeleton className="w-44 h-24 rounded-xl" /><Skeleton className="w-44 h-24 rounded-xl" /><Skeleton className="w-44 h-24 rounded-xl" /></div>
              <div className="flex justify-center gap-8"><Skeleton className="w-44 h-24 rounded-xl" /><Skeleton className="w-44 h-24 rounded-xl" /><Skeleton className="w-44 h-24 rounded-xl" /></div>
            </div>
          ) : error ? (
            <div className="p-6"><ErrorState message="Failed to load architecture topology" onRetry={() => refetch()} /></div>
          ) : filteredNodes.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-sm text-gray-500">No nodes match the current filters</div>
          ) : (
            <div
              className="relative"
              style={{ width: canvasWidth, height: canvasHeight, margin: '0 auto' }}
              onClick={handleCanvasClick}
            >
              {/* SVG Edges */}
              <svg
                className="absolute inset-0 pointer-events-none"
                width={canvasWidth}
                height={canvasHeight}
                style={{ overflow: 'visible' }}
              >
                <defs>
                  <filter id="edgeGlow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                {filteredEdges.map(edge => {
                  const sourceNode = allNodes.find(n => n.id === edge.source);
                  const targetNode = allNodes.find(n => n.id === edge.target);
                  if (!sourceNode || !targetNode) return null;
                  const pathD = getEdgePath(sourceNode, targetNode);
                  const highlighted = isEdgeHighlighted(edge);
                  const dimmed = selectedNodeId !== null && !highlighted;
                  const color = highlighted ? edgeStatusColorActive[edge.status] : edgeStatusColor[edge.status];

                  return (
                    <g key={edge.id}>
                      {/* Hover target (wider invisible line) */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={16}
                        className="pointer-events-auto cursor-pointer"
                        onMouseEnter={(ev) => {
                          const rect = (ev.target as SVGElement).closest('svg')!.getBoundingClientRect();
                          setHoveredEdge({ edge, pos: { x: ev.clientX - rect.left, y: ev.clientY - rect.top } });
                        }}
                        onMouseLeave={() => setHoveredEdge(null)}
                        onClick={(ev) => ev.stopPropagation()}
                      />
                      <path
                        d={pathD}
                        fill="none"
                        stroke={color}
                        strokeWidth={highlighted ? 2.5 : 1.5}
                        strokeDasharray={dimmed ? '4 4' : 'none'}
                        opacity={dimmed ? 0.2 : 1}
                        filter={highlighted ? 'url(#edgeGlow)' : undefined}
                        className="transition-all duration-300 pointer-events-none"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Edge Tooltip */}
              {hoveredEdge && (
                <TopologyEdgeTooltip edge={hoveredEdge.edge} nodes={allNodes} position={hoveredEdge.pos} />
              )}

              {/* Nodes */}
              {filteredNodes.map(node => (
                <TopologyNodeCard
                  key={node.id}
                  node={node}
                  selected={selectedNodeId === node.id}
                  dimmed={connectedIds !== null && !connectedIds.has(node.id)}
                  onClick={() => { handleNodeClick(node.id); }}
                />
              ))}

              {/* Selection hint */}
              {selectedNodeId && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 bg-gray-900/80 px-3 py-1 rounded-full border border-white/5">
                  Click again to open details · Click canvas to deselect
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      <NodeDetailsDrawer nodeId={drawerNodeId} onClose={() => setDrawerNodeId(null)} />
    </>
  );
}
