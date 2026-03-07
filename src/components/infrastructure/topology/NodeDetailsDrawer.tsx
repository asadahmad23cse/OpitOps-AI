"use client";

import { useEffect, useCallback } from 'react';
import { X, ScrollText, AlertCircle, Rocket, Bot, Activity } from 'lucide-react';
import Link from 'next/link';
import { useTopologyNodeDetail } from '@/hooks/use-topology';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatTimeAgo, cn } from '@/lib/utils';

interface Props {
  nodeId: string | null;
  onClose: () => void;
}

const severityColor: Record<string, string> = { critical: 'text-red-400 bg-red-500/10', high: 'text-orange-400 bg-orange-500/10', medium: 'text-amber-400 bg-amber-500/10', low: 'text-blue-400 bg-blue-500/10' };
const logLevelColor: Record<string, string> = { error: 'text-red-400', warn: 'text-amber-400', info: 'text-cyan-400', debug: 'text-gray-400' };
const depStatusColor: Record<string, string> = { success: 'text-emerald-400', running: 'text-cyan-400', failed: 'text-red-400', rolled_back: 'text-orange-400' };

export function NodeDetailsDrawer({ nodeId, onClose }: Props) {
  const { data, isLoading } = useTopologyNodeDetail(nodeId);

  const handleEscape = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    if (nodeId) { document.addEventListener('keydown', handleEscape); document.body.style.overflow = 'hidden'; }
    return () => { document.removeEventListener('keydown', handleEscape); document.body.style.overflow = ''; };
  }, [nodeId, handleEscape]);

  if (!nodeId) return null;

  const detail = data?.data;
  const node = detail?.node;
  const statusDot = node?.status === 'healthy' ? 'bg-emerald-400' : node?.status === 'warning' ? 'bg-amber-400' : 'bg-red-400';
  const statusText = node?.status === 'healthy' ? 'text-emerald-400' : node?.status === 'warning' ? 'text-amber-400' : 'text-red-400';

  const aiPrompt = node ? encodeURIComponent(`Analyze the ${node.label} (${node.status}) from the Infrastructure Architecture Map. Current metrics: ${Object.entries(node.metrics).map(([k,v]) => `${k}: ${v}`).join(', ')}. Explain likely causes and recommended actions.`) : '';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md bg-gray-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'slideInRight 0.25s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {node && <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', statusDot)} />}
            <h3 className="text-base font-semibold text-white truncate">{isLoading ? 'Loading...' : node?.label}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors" suppressHydrationWarning>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            <div className="space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : detail && node ? (
            <>
              {/* Status bar */}
              <div className="flex items-center gap-4 flex-wrap text-xs">
                <span className={cn('capitalize font-medium', statusText)}>{node.status}</span>
                <span className="text-gray-500">{node.type.replace('_', ' ')}</span>
                <span className="text-gray-500">{node.environment}</span>
                <span className="text-gray-500">{node.region}</span>
              </div>

              {/* Health */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Health Score</span>
                  <span className={cn('text-lg font-bold', detail.health.score >= 90 ? 'text-emerald-400' : detail.health.score >= 70 ? 'text-amber-400' : 'text-red-400')}>{detail.health.score}/100</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', detail.health.score >= 90 ? 'bg-emerald-400' : detail.health.score >= 70 ? 'bg-amber-400' : 'bg-red-400')} style={{ width: `${detail.health.score}%` }} />
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5">{detail.health.passed}/{detail.health.checks} checks passed</p>
              </div>

              {/* Metrics */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Metrics</h4>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(node.metrics).map(([key, val]) => (
                    <div key={key} className="bg-white/5 border border-white/10 rounded-lg p-2.5 text-center">
                      <p className="text-xs text-gray-500 mb-0.5">{key}</p>
                      <p className="text-sm font-bold text-white">{String(val)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Alerts */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Recent Alerts</h4>
                {detail.recentAlerts.length === 0 ? (
                  <p className="text-xs text-gray-600 italic">No recent alerts</p>
                ) : (
                  <div className="space-y-2">
                    {detail.recentAlerts.map(a => (
                      <div key={a.id} className="flex items-start gap-2.5 p-2.5 bg-white/5 border border-white/10 rounded-lg">
                        <AlertCircle className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', severityColor[a.severity]?.split(' ')[0] || 'text-gray-400')} />
                        <div className="min-w-0">
                          <p className="text-xs text-white truncate">{a.title}</p>
                          <p className="text-[10px] text-gray-500">{formatTimeAgo(a.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Logs */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Recent Logs</h4>
                <div className="space-y-1.5">
                  {detail.recentLogs.slice(0, 3).map(l => (
                    <div key={l.id} className="flex items-start gap-2 p-2 bg-white/5 border border-white/10 rounded-lg">
                      <span className={cn('text-[10px] font-mono uppercase font-bold mt-0.5 shrink-0', logLevelColor[l.level] || 'text-gray-400')}>{l.level}</span>
                      <p className="text-[11px] text-gray-300 leading-relaxed">{l.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Deployments */}
              {detail.recentDeployments.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Recent Deployments</h4>
                  <div className="space-y-1.5">
                    {detail.recentDeployments.map(d => (
                      <div key={d.id} className="flex items-center justify-between p-2.5 bg-white/5 border border-white/10 rounded-lg text-xs">
                        <span className="text-white font-medium">{d.version}</span>
                        <span className={cn('capitalize', depStatusColor[d.status] || 'text-gray-400')}>{d.status.replace('_', ' ')}</span>
                        <span className="text-gray-500">{formatTimeAgo(d.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dependencies */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Upstream</h4>
                  {detail.upstreamDeps.length === 0 ? <p className="text-[10px] text-gray-600 italic">None</p> : detail.upstreamDeps.map(d => <p key={d} className="text-xs text-cyan-400">{d}</p>)}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Downstream</h4>
                  {detail.downstreamDeps.length === 0 ? <p className="text-[10px] text-gray-600 italic">None</p> : detail.downstreamDeps.map(d => <p key={d} className="text-xs text-cyan-400">{d}</p>)}
                </div>
              </div>

              {/* Recommended Actions */}
              {detail.recommendedActions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Recommended Actions</h4>
                  <ul className="space-y-1.5">
                    {detail.recommendedActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                        <Activity className="w-3 h-3 text-cyan-400 mt-0.5 shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quick Actions */}
              <div className="border-t border-white/10 pt-4 space-y-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/logs" className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                    <ScrollText className="w-3.5 h-3.5" /> View Logs
                  </Link>
                  <Link href="/alerts" className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                    <AlertCircle className="w-3.5 h-3.5" /> View Alerts
                  </Link>
                  <Link href="/deployments" className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                    <Rocket className="w-3.5 h-3.5" /> Deployments
                  </Link>
                  <Link href={`/ai-assistant?prompt=${aiPrompt}`} className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs text-cyan-400 hover:bg-cyan-500/20 transition-colors">
                    <Bot className="w-3.5 h-3.5" /> AI Analyze
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">Could not load node details.</p>
          )}
        </div>
      </div>
    </div>
  );
}
