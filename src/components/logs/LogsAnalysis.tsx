"use client";

import { useState, useCallback } from 'react';
import {
  Search,
  Filter,
  Copy,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  X,
  FileText,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Clock,
  Server,
  Globe,
  Hash,
} from 'lucide-react';
import { useLogs } from '@/hooks/use-logs';
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { cn, formatDateTime, truncate, downloadAsJson } from '@/lib/utils';
import { toast } from 'sonner';
import type { LogEntry, LogsFilter, LogLevel } from '@/types';

const SERVICES = [
  'All',
  'API Gateway',
  'Auth Service',
  'Worker Service',
  'Payment Service',
  'Cache Layer',
  'Database Cluster',
] as const;

const ENVIRONMENTS = ['All', 'Production', 'Staging', 'Development'] as const;

const LEVELS: { label: string; value: LogLevel | 'all' }[] = [
  { label: 'All Levels', value: 'all' },
  { label: 'Info', value: 'info' },
  { label: 'Warning', value: 'warn' },
  { label: 'Error', value: 'error' },
  { label: 'Debug', value: 'debug' },
];

const levelConfig: Record<LogLevel, { icon: typeof Info; color: string; bg: string; border: string }> = {
  info: { icon: Info, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  warn: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  debug: { icon: Bug, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
};

export function LogsAnalysis() {
  const [filters, setFilters] = useState<LogsFilter>({});
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data, isLoading, isError, refetch } = useLogs(filters, page);

  const logs: LogEntry[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  const updateFilter = useCallback((key: keyof LogsFilter, value: string) => {
    setFilters(prev => {
      const next = { ...prev };
      if (!value || value === 'all' || value === 'All') {
        delete next[key];
      } else {
        (next as Record<string, string>)[key] = value;
      }
      return next;
    });
    setPage(1);
  }, []);

  const copyLog = useCallback((log: LogEntry) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    toast.success('Log entry copied to clipboard');
  }, []);

  const exportLogs = useCallback(() => {
    if (logs.length === 0) return;
    downloadAsJson(logs, 'optiops-logs');
    toast.success(`Exported ${logs.length} log entries`);
  }, [logs]);

  const loadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  if (isError) {
    return <ErrorState message="Failed to load logs. Please try again." onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">System Logs</h2>
          <p className="text-sm text-gray-400 mt-1">
            {total > 0 ? `${total} log entries found` : 'Real-time log viewer & analysis'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            suppressHydrationWarning
            onClick={() => setAutoRefresh(prev => !prev)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
              autoRefresh
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', autoRefresh && 'animate-spin')} />
            Auto-refresh
          </button>
          <button
            suppressHydrationWarning
            onClick={exportLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-sm text-cyan-400 font-medium transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              suppressHydrationWarning
              type="text"
              placeholder="Search logs by message, trace ID..."
              value={filters.search ?? ''}
              onChange={e => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 transition-colors"
            />
          </div>

          <div className="relative">
            <select
              suppressHydrationWarning
              value={filters.level ?? 'all'}
              onChange={e => updateFilter('level', e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              {LEVELS.map(l => (
                <option key={l.value} value={l.value} className="bg-gray-900">{l.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              suppressHydrationWarning
              value={filters.service ?? 'All'}
              onChange={e => updateFilter('service', e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              {SERVICES.map(s => (
                <option key={s} value={s} className="bg-gray-900">{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              suppressHydrationWarning
              value={filters.environment ?? 'All'}
              onChange={e => updateFilter('environment', e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
            >
              {ENVIRONMENTS.map(env => (
                <option key={env} value={env} className="bg-gray-900">{env}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          {Object.keys(filters).length > 0 && (
            <button
              suppressHydrationWarning
              onClick={() => { setFilters({}); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex gap-6">
        {/* Log List */}
        <div className={cn('flex-1 min-w-0', selectedLog && 'max-w-[60%]')}>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
            {isLoading ? (
              <div className="p-6">
                <TableSkeleton rows={8} />
              </div>
            ) : logs.length === 0 ? (
              <EmptyState
                title="No logs found"
                description="Try adjusting your filters or check back later."
                icon={<FileText className="w-8 h-8 text-gray-500" />}
              />
            ) : (
              <div className="divide-y divide-white/5">
                {logs.map(log => {
                  const config = levelConfig[log.level];
                  const Icon = config.icon;
                  const isSelected = selectedLog?.id === log.id;

                  return (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLog(isSelected ? null : log)}
                      className={cn(
                        'flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-all hover:bg-white/5',
                        isSelected && 'bg-white/5 border-l-2 border-l-cyan-400'
                      )}
                    >
                      <Icon className={cn('w-4 h-4 flex-shrink-0', config.color)} />

                      <span className="text-xs text-gray-500 font-mono w-[140px] flex-shrink-0">
                        {formatDateTime(log.timestamp)}
                      </span>

                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded border font-medium uppercase w-[60px] text-center flex-shrink-0',
                          config.bg,
                          config.border,
                          config.color
                        )}
                      >
                        {log.level}
                      </span>

                      <span className="text-xs text-gray-400 w-[120px] flex-shrink-0 truncate">
                        {log.service}
                      </span>

                      <p className="flex-1 text-sm text-white truncate min-w-0">
                        {truncate(log.message, 100)}
                      </p>

                      <span className="text-[10px] text-gray-600 font-mono flex-shrink-0">
                        {log.traceId.slice(0, 8)}
                      </span>

                      <button
                        suppressHydrationWarning
                        onClick={e => {
                          e.stopPropagation();
                          copyLog(log);
                        }}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors text-gray-500 hover:text-white flex-shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <ChevronRight
                        className={cn(
                          'w-4 h-4 text-gray-600 flex-shrink-0 transition-transform',
                          isSelected && 'rotate-90 text-cyan-400'
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Load More */}
            {hasMore && !isLoading && (
              <div className="p-4 border-t border-white/5 text-center">
                <button
                  suppressHydrationWarning
                  onClick={loadMore}
                  className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 font-medium transition-colors"
                >
                  Load More ({total - logs.length} remaining)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedLog && (
          <div className="w-[40%] flex-shrink-0">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl sticky top-6">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">Log Details</h3>
                <div className="flex items-center gap-2">
                  <button
                    suppressHydrationWarning
                    onClick={() => copyLog(selectedLog)}
                    className="p-1.5 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                    title="Copy JSON"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    suppressHydrationWarning
                    onClick={() => setSelectedLog(null)}
                    className="p-1.5 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Level Badge */}
                {(() => {
                  const config = levelConfig[selectedLog.level];
                  return (
                    <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border', config.bg, config.border)}>
                      {(() => { const Icon = config.icon; return <Icon className={cn('w-4 h-4', config.color)} />; })()}
                      <span className={cn('text-sm font-medium uppercase', config.color)}>
                        {selectedLog.level}
                      </span>
                    </div>
                  );
                })()}

                {/* Message */}
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Message</label>
                  <p className="text-sm text-white bg-white/5 rounded-lg p-3 border border-white/5 leading-relaxed">
                    {selectedLog.message}
                  </p>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <DetailField icon={Clock} label="Timestamp" value={formatDateTime(selectedLog.timestamp)} />
                  <DetailField icon={Server} label="Service" value={selectedLog.service} />
                  <DetailField icon={Globe} label="Environment" value={selectedLog.environment} />
                  <DetailField icon={Hash} label="Trace ID" value={selectedLog.traceId} mono />
                </div>

                {/* Metadata */}
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Metadata</label>
                    <div className="bg-black/30 rounded-lg p-3 border border-white/5 space-y-1">
                      {Object.entries(selectedLog.metadata).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">{key}</span>
                          <span className="text-cyan-400 font-mono">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailField({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-gray-500" />
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn('text-xs text-white truncate', mono && 'font-mono text-cyan-400')}>
        {value}
      </p>
    </div>
  );
}
