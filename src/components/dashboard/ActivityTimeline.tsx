"use client";

import { useState } from 'react';
import { Rocket, AlertCircle, Settings, Sparkles, FileText, Shield, CheckCircle, Filter, Download, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatTimeAgo, activityTypeColor, downloadAsJson } from '@/lib/utils';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from 'sonner';
import type { ActivityEvent, ActivityType } from '@/types';

const typeIcons: Record<string, React.ElementType> = {
  deployment: Rocket, alert: AlertCircle, config_change: Settings,
  recommendation: Sparkles, report: FileText, security_scan: Shield,
  incident_resolved: CheckCircle,
};

const typeLabels: Record<string, string> = {
  deployment: 'Deployment', alert: 'Alert', config_change: 'Config Change',
  recommendation: 'Recommendation', report: 'Report', security_scan: 'Security',
  incident_resolved: 'Resolved',
};

export function ActivityTimeline() {
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<ActivityType | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['activity', page],
    queryFn: () => fetch(`/api/activity?page=${page}&pageSize=8`).then(r => r.json()),
  });

  const allEvents: ActivityEvent[] = data?.data || [];
  const hasMore = data?.hasMore || false;
  const events = filterType ? allEvents.filter(e => e.type === filterType) : allEvents;

  const handleExport = () => {
    downloadAsJson(events, 'activity-timeline');
    toast.success('Activity timeline exported');
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Activity & Audit Timeline</h3>
          <p className="text-sm text-gray-400">Recent actions and system events</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors" suppressHydrationWarning>
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-sm text-cyan-400 hover:bg-cyan-500/20 transition-colors" suppressHydrationWarning>
            <Download className="w-4 h-4" /> Export Logs
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-white/5">
          <button onClick={() => setFilterType('')} className={`px-3 py-1 rounded-lg text-xs transition-colors ${!filterType ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`} suppressHydrationWarning>All</button>
          {Object.entries(typeLabels).map(([key, label]) => (
            <button key={key} onClick={() => setFilterType(key as ActivityType)} className={`px-3 py-1 rounded-lg text-xs transition-colors ${filterType === key ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`} suppressHydrationWarning>
              {label}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : events.length === 0 ? (
        <EmptyState title="No activity found" description="No events match the current filter." />
      ) : (
        <div className="space-y-1">
          {events.map(event => {
            const Icon = typeIcons[event.type] || FileText;
            const dotColor = activityTypeColor(event.type);
            const isExpanded = expandedId === event.id;
            return (
              <div key={event.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  className="w-full flex items-start gap-4 px-4 py-3 hover:bg-white/5 rounded-lg transition-colors text-left"
                  suppressHydrationWarning
                >
                  <div className="relative mt-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-sm font-medium text-white truncate">{event.title}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{event.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500">{formatTimeAgo(event.timestamp)}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {isExpanded && (
                  <div className="ml-10 mb-2 p-3 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400 space-y-1">
                    <div><span className="text-gray-500">User:</span> {event.user}</div>
                    <div><span className="text-gray-500">Time:</span> {new Date(event.timestamp).toLocaleString()}</div>
                    {Object.entries(event.metadata).map(([k, v]) => (
                      <div key={k}><span className="text-gray-500">{k}:</span> {v}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <button onClick={() => setPage(p => p + 1)} className="w-full mt-4 py-3 text-sm text-cyan-400 hover:text-cyan-300 hover:bg-white/5 rounded-lg transition-colors" suppressHydrationWarning>
          Load More Activities
        </button>
      )}
    </div>
  );
}
