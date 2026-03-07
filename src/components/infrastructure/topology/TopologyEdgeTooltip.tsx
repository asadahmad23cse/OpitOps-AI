"use client";

import type { TopologyEdge, TopologyNode } from '@/types';

interface Props {
  edge: TopologyEdge;
  nodes: TopologyNode[];
  position: { x: number; y: number };
}

export function TopologyEdgeTooltip({ edge, nodes, position }: Props) {
  const source = nodes.find(n => n.id === edge.source);
  const target = nodes.find(n => n.id === edge.target);
  if (!source || !target) return null;

  const statusColor = edge.status === 'healthy' ? 'text-emerald-400' : edge.status === 'warning' ? 'text-amber-400' : 'text-red-400';

  return (
    <div
      className="absolute z-30 w-56 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl p-3.5 shadow-2xl pointer-events-none"
      style={{ left: position.x, top: position.y, transform: 'translate(-50%, -110%)' }}
    >
      <div className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
        <span>{source.label}</span>
        <span className="text-gray-500">→</span>
        <span>{target.label}</span>
      </div>
      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between"><span className="text-gray-500">Traffic</span><span className="text-gray-300">{edge.traffic}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Latency P95</span><span className="text-gray-300">{edge.latencyP95}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Error Rate</span><span className="text-gray-300">{edge.errorRate}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Protocol</span><span className="text-gray-300">{edge.protocol}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={`font-medium capitalize ${statusColor}`}>{edge.status}</span></div>
      </div>
    </div>
  );
}
