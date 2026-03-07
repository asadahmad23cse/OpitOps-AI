"use client";

import { Globe, Shield, Server, Database, HardDrive } from 'lucide-react';
import type { TopologyNode, TopoNodeStatus } from '@/types';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, React.ElementType> = {
  load_balancer: Globe,
  gateway: Shield,
  service: Server,
  database: Database,
  cache: HardDrive,
};

const statusDot: Record<TopoNodeStatus, string> = {
  healthy: 'bg-emerald-400',
  warning: 'bg-amber-400 animate-pulse',
  critical: 'bg-red-400 animate-pulse',
};

const statusBorder: Record<TopoNodeStatus, string> = {
  healthy: 'border-white/10 hover:border-cyan-500/40',
  warning: 'border-amber-500/30 hover:border-amber-500/50',
  critical: 'border-red-500/30 hover:border-red-500/50',
};

interface Props {
  node: TopologyNode;
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
}

export function TopologyNodeCard({ node, selected, dimmed, onClick }: Props) {
  const Icon = typeIcons[node.type] || Server;
  const metricEntries = Object.entries(node.metrics).slice(0, 3);

  return (
    <button
      onClick={onClick}
      aria-label={`${node.label} — ${node.status}`}
      className={cn(
        'absolute w-[180px] bg-white/5 backdrop-blur-xl border rounded-xl p-3.5 text-left transition-all duration-300 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-cyan-500/50',
        statusBorder[node.status],
        selected && 'ring-2 ring-cyan-500/60 border-cyan-500/40 bg-cyan-500/5 scale-[1.03] z-20 shadow-lg shadow-cyan-500/10',
        dimmed && 'opacity-30 pointer-events-none',
      )}
      style={{ left: node.position.x, top: node.position.y, transform: 'translate(-50%, 0)' }}
      suppressHydrationWarning
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className={cn('p-1.5 rounded-lg', node.status === 'warning' ? 'bg-amber-500/20' : node.status === 'critical' ? 'bg-red-500/20' : 'bg-blue-500/20')}>
          <Icon className={cn('w-4 h-4', node.status === 'warning' ? 'text-amber-400' : node.status === 'critical' ? 'text-red-400' : 'text-blue-400')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">{node.label}</div>
          <div className="text-[10px] text-gray-500 truncate">{node.subtitle}</div>
        </div>
        <div className={cn('w-2 h-2 rounded-full shrink-0', statusDot[node.status])} />
      </div>
      <div className="space-y-1">
        {metricEntries.map(([key, val]) => (
          <div key={key} className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">{key}</span>
            <span className="text-gray-300 font-medium">{String(val)}</span>
          </div>
        ))}
      </div>
    </button>
  );
}
