"use client";

import { useState } from 'react';
import { Server, Cpu, HardDrive, Wifi, AlertTriangle, Clock } from 'lucide-react';
import { useInfrastructure } from '@/hooks/use-infrastructure';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { formatPercentage } from '@/lib/utils';
import type { InfrastructureNode } from '@/types';

function InfraDetail({ node, open, onClose }: { node: InfrastructureNode; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={`${node.name} Details`}>
      <div className="space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className={`w-3 h-3 rounded-full ${node.status === 'operational' ? 'bg-emerald-400' : node.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'}`} />
          <span className={`text-sm font-medium capitalize ${node.status === 'operational' ? 'text-emerald-400' : node.status === 'degraded' ? 'text-amber-400' : 'text-red-400'}`}>{node.status}</span>
          <span className="text-xs text-gray-500">• {node.type} • {node.region}</span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'CPU Usage', value: formatPercentage(node.cpuAvg), icon: Cpu, warn: node.cpuAvg > 80 },
            { label: 'Memory Usage', value: formatPercentage(node.memoryAvg), icon: HardDrive, warn: node.memoryAvg > 80 },
            { label: 'Latency', value: `${node.latency}ms`, icon: Wifi, warn: node.latency > 100 },
            { label: 'Error Rate', value: formatPercentage(node.errorRate), icon: AlertTriangle, warn: node.errorRate > 1 },
            { label: 'Uptime', value: formatPercentage(node.uptime), icon: Clock, warn: node.uptime < 99.9 },
            { label: 'Active Nodes', value: `${node.nodes}/${node.totalNodes}`, icon: Server, warn: node.nodes < node.totalNodes },
          ].map(metric => (
            <div key={metric.label} className="bg-white/5 border border-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <metric.icon className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400">{metric.label}</span>
              </div>
              <p className={`text-lg font-bold ${metric.warn ? 'text-amber-400' : 'text-white'}`}>{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
          <div className="text-center">
            <p className="text-xl font-bold text-white">{node.activeIncidents}</p>
            <p className="text-xs text-gray-400">Active Incidents</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-white">{node.relatedDeployments}</p>
            <p className="text-xs text-gray-400">Related Deployments</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-white">{node.relatedAlerts}</p>
            <p className="text-xs text-gray-400">Related Alerts</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function InfrastructureTopology() {
  const { data, isLoading, error, refetch } = useInfrastructure();
  const [selectedNode, setSelectedNode] = useState<InfrastructureNode | null>(null);

  if (isLoading) return <div className="grid grid-cols-3 gap-6">{Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}</div>;
  if (error) return <ErrorState message="Failed to load infrastructure data" onRetry={() => refetch()} />;

  const nodes = data?.data || [];

  return (
    <>
      <div className="grid grid-cols-3 gap-6">
        {nodes.map(node => (
          <button key={node.id} onClick={() => setSelectedNode(node)} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-cyan-500/30 transition-all text-left group" suppressHydrationWarning>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-500/20"><Server className="w-5 h-5 text-blue-400" /></div>
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">{node.name}</h3>
                  <p className="text-xs text-gray-500">{node.type}</p>
                </div>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${node.status === 'operational' ? 'bg-emerald-400' : node.status === 'degraded' ? 'bg-amber-400 animate-pulse' : 'bg-red-400 animate-pulse'}`} />
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">CPU</span><span className={node.cpuAvg > 80 ? 'text-amber-400' : 'text-white'}>{node.cpuAvg}%</span></div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden"><div className={`h-full rounded-full ${node.cpuAvg > 80 ? 'bg-amber-400' : node.cpuAvg > 60 ? 'bg-cyan-400' : 'bg-emerald-400'}`} style={{ width: `${node.cpuAvg}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Memory</span><span className={node.memoryAvg > 80 ? 'text-amber-400' : 'text-white'}>{node.memoryAvg}%</span></div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden"><div className={`h-full rounded-full ${node.memoryAvg > 80 ? 'bg-amber-400' : node.memoryAvg > 60 ? 'bg-cyan-400' : 'bg-emerald-400'}`} style={{ width: `${node.memoryAvg}%` }} /></div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                <span className="text-gray-500">{node.region}</span>
                <span className="text-gray-400">{node.nodes}/{node.totalNodes} nodes</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedNode && <InfraDetail node={selectedNode} open={!!selectedNode} onClose={() => setSelectedNode(null)} />}
    </>
  );
}
