"use client";

import { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  ChevronDown,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Filter,
  Bell,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAlerts, useUpdateAlert } from '@/hooks/use-alerts';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PostMortemPanel } from '@/components/PostMortemPanel';
import { formatTimeAgo, cn, severityColor, severityBgColor } from '@/lib/utils';
import type { Alert, AlertSeverity, AlertStatus, AlertsFilter, AlertsSummary } from '@/types';

const SEVERITY_OPTIONS: { label: string; value: AlertSeverity | '' }[] = [
  { label: 'All Severities', value: '' },
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

const STATUS_OPTIONS: { label: string; value: AlertStatus | '' }[] = [
  { label: 'All Statuses', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'Acknowledged', value: 'acknowledged' },
  { label: 'Resolved', value: 'resolved' },
];

const SEVERITY_ICON_MAP: Record<AlertSeverity, typeof AlertCircle> = {
  critical: AlertCircle,
  high: ShieldAlert,
  medium: AlertTriangle,
  low: Activity,
};

export function AlertsIncidentCenter() {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | ''>('');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | ''>('');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [assignAlert, setAssignAlert] = useState<Alert | null>(null);
  const [assigneeName, setAssigneeName] = useState('');

  const filters: AlertsFilter = useMemo(() => {
    const f: AlertsFilter = {};
    if (severityFilter) f.severity = severityFilter;
    if (statusFilter) f.status = statusFilter;
    if (search.trim()) f.search = search.trim();
    return f;
  }, [severityFilter, statusFilter, search]);

  const { data, isLoading, error, refetch } = useAlerts(filters);
  const updateAlert = useUpdateAlert();

  const alerts: Alert[] = data?.data?.alerts ?? [];
  const summary: AlertsSummary | undefined = data?.data?.summary;

  async function handleAcknowledge(alert: Alert) {
    try {
      await updateAlert.mutateAsync({ id: alert.id, status: 'acknowledged' });
      toast.success(`Alert "${alert.title}" acknowledged`);
    } catch {
      toast.error('Failed to acknowledge alert');
    }
  }

  async function handleResolve(alert: Alert) {
    try {
      await updateAlert.mutateAsync({ id: alert.id, status: 'resolved' });
      toast.success(`Alert "${alert.title}" resolved`);
    } catch {
      toast.error('Failed to resolve alert');
    }
  }

  async function handleAssign() {
    if (!assignAlert || !assigneeName.trim()) return;
    try {
      await updateAlert.mutateAsync({ id: assignAlert.id, assignee: assigneeName.trim() });
      toast.success(`Alert assigned to ${assigneeName.trim()}`);
      setAssignAlert(null);
      setAssigneeName('');
    } catch {
      toast.error('Failed to assign alert');
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ──────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon={<AlertCircle className="w-5 h-5 text-red-400" />}
            label="Critical"
            value={summary.critical}
            sub="Critical open alerts"
            accentBg="bg-red-500/10"
            accentBorder="border-red-500/30"
            badgeBg="bg-red-500/20"
            badgeText="text-red-400"
          />
          <SummaryCard
            icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
            label="Open"
            value={summary.open}
            sub="Total open alerts"
            accentBg="bg-amber-500/10"
            accentBorder="border-amber-500/30"
            badgeBg="bg-amber-500/20"
            badgeText="text-amber-400"
          />
          <SummaryCard
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            label="Resolved"
            value={summary.resolved}
            sub="Total resolved"
            accentBg="bg-emerald-500/10"
            accentBorder="border-emerald-500/30"
            badgeBg="bg-emerald-500/20"
            badgeText="text-emerald-400"
          />
          <SummaryCard
            icon={<Bell className="w-5 h-5 text-cyan-400" />}
            label="Total"
            value={summary.total}
            sub="All alerts tracked"
            accentBg="bg-cyan-500/10"
            accentBorder="border-cyan-500/30"
            badgeBg="bg-cyan-500/20"
            badgeText="text-cyan-400"
          />
        </div>
      )}

      <PostMortemPanel />

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              suppressHydrationWarning
              type="text"
              placeholder="Search alerts by title, description, or service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-colors"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <select
                suppressHydrationWarning
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | '')}
                className="appearance-none pl-9 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 cursor-pointer"
              >
                {SEVERITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-gray-900 text-white">
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <select
                suppressHydrationWarning
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AlertStatus | '')}
                className="appearance-none pl-9 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500/50 cursor-pointer"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-gray-900 text-white">
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Alert List ─────────────────────────────────────── */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">Alerts &amp; Incidents</h2>
            <p className="text-sm text-gray-400">
              {alerts.length} alert{alerts.length !== 1 ? 's' : ''} matching current filters
            </p>
          </div>
        </div>

        {isLoading && <TableSkeleton rows={6} />}

        {!isLoading && error && (
          <ErrorState message="Failed to load alerts. Please try again." onRetry={refetch} />
        )}

        {!isLoading && !error && alerts.length === 0 && (
          <EmptyState
            title="No alerts found"
            description="No alerts match your current filters. Try broadening your search or check back later."
            icon={<CheckCircle2 className="w-8 h-8 text-emerald-400" />}
          />
        )}

        {!isLoading && !error && alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const SevIcon = SEVERITY_ICON_MAP[alert.severity];
              return (
                <div
                  key={alert.id}
                  className={cn(
                    'group relative border rounded-xl p-5 transition-all duration-200 hover:scale-[1.005] cursor-pointer',
                    severityBgColor(alert.severity),
                  )}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 p-2.5 rounded-lg bg-white/10">
                      <SevIcon className={cn('w-5 h-5', severityColor(alert.severity))} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-base font-semibold text-white truncate">{alert.title}</h3>
                        <Badge variant="severity" value={alert.severity}>
                          {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                        </Badge>
                        <Badge variant="status" value={alert.status}>
                          {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-300 mb-3 line-clamp-1">{alert.description}</p>

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-gray-400">
                        <span>
                          <span className="text-gray-500 font-medium">Code:</span>{' '}
                          <span className="text-cyan-400 font-mono">{alert.incidentCode}</span>
                        </span>
                        <span>
                          <span className="text-gray-500 font-medium">Service:</span> {alert.service}
                        </span>
                        <span>
                          <span className="text-gray-500 font-medium">Env:</span> {alert.environment}
                        </span>
                        <span>
                          <span className="text-gray-500 font-medium">Assignee:</span>{' '}
                          {alert.assignee || <span className="italic text-gray-600">Unassigned</span>}
                        </span>
                        <span>
                          <span className="text-gray-500 font-medium">Created:</span>{' '}
                          {formatTimeAgo(alert.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {alert.status === 'open' && (
                        <button
                          suppressHydrationWarning
                          onClick={() => handleAcknowledge(alert)}
                          disabled={updateAlert.isPending}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                        >
                          Acknowledge
                        </button>
                      )}
                      {alert.status !== 'resolved' && (
                        <button
                          suppressHydrationWarning
                          onClick={() => handleResolve(alert)}
                          disabled={updateAlert.isPending}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                        >
                          Resolve
                        </button>
                      )}
                      <button
                        suppressHydrationWarning
                        onClick={() => {
                          setAssignAlert(alert);
                          setAssigneeName(alert.assignee ?? '');
                        }}
                        disabled={updateAlert.isPending}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
                      >
                        <UserPlus className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                        Assign
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Alert Detail Modal ─────────────────────────────── */}
      <Modal
        open={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title="Alert Details"
        maxWidth="max-w-3xl"
      >
        {selectedAlert && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-start gap-3">
              <div className={cn('p-3 rounded-xl', severityBgColor(selectedAlert.severity))}>
                {(() => {
                  const Icon = SEVERITY_ICON_MAP[selectedAlert.severity];
                  return <Icon className={cn('w-6 h-6', severityColor(selectedAlert.severity))} />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white mb-1">{selectedAlert.title}</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="severity" value={selectedAlert.severity}>
                    {selectedAlert.severity.charAt(0).toUpperCase() + selectedAlert.severity.slice(1)}
                  </Badge>
                  <Badge variant="status" value={selectedAlert.status}>
                    {selectedAlert.status.charAt(0).toUpperCase() + selectedAlert.status.slice(1)}
                  </Badge>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono bg-white/5 border border-white/10 text-cyan-400">
                    {selectedAlert.incidentCode}
                  </span>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Description" value={selectedAlert.description} fullWidth />
              <InfoRow label="Service" value={selectedAlert.service} />
              <InfoRow label="Environment" value={selectedAlert.environment} />
              <InfoRow label="Assignee" value={selectedAlert.assignee || 'Unassigned'} />
              <InfoRow label="Created" value={formatTimeAgo(selectedAlert.createdAt)} />
              <InfoRow label="Last Updated" value={formatTimeAgo(selectedAlert.updatedAt)} />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
              {selectedAlert.status === 'open' && (
                <button
                  suppressHydrationWarning
                  onClick={() => {
                    handleAcknowledge(selectedAlert);
                    setSelectedAlert(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Acknowledge
                </button>
              )}
              {selectedAlert.status !== 'resolved' && (
                <button
                  suppressHydrationWarning
                  onClick={() => {
                    handleResolve(selectedAlert);
                    setSelectedAlert(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Resolve
                </button>
              )}
              <button
                suppressHydrationWarning
                onClick={() => {
                  setAssignAlert(selectedAlert);
                  setAssigneeName(selectedAlert.assignee ?? '');
                  setSelectedAlert(null);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Assign
              </button>
            </div>

            {/* History Timeline */}
            {selectedAlert.history.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-4 h-4 text-gray-400" />
                  <h4 className="text-sm font-semibold text-white">Activity Timeline</h4>
                </div>
                <div className="relative pl-6">
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/10" />
                  <div className="space-y-4">
                    {selectedAlert.history.map((entry) => (
                      <div key={entry.id} className="relative flex items-start gap-3">
                        <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-gray-800 border-2 border-cyan-500/60 z-10" />
                        <div className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white">{entry.action}</span>
                            <span className="text-xs text-gray-500">{formatTimeAgo(entry.timestamp)}</span>
                          </div>
                          <p className="text-xs text-gray-400">
                            by <span className="text-cyan-400">{entry.user}</span>
                            {entry.details && <> &mdash; {entry.details}</>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Assign Modal ───────────────────────────────────── */}
      <Modal
        open={!!assignAlert}
        onClose={() => {
          setAssignAlert(null);
          setAssigneeName('');
        }}
        title="Assign Alert"
        maxWidth="max-w-md"
      >
        {assignAlert && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Assign <span className="text-white font-medium">&ldquo;{assignAlert.title}&rdquo;</span> to a team member.
            </p>
            <input
              suppressHydrationWarning
              type="text"
              placeholder="Enter assignee name..."
              value={assigneeName}
              onChange={(e) => setAssigneeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAssign()}
              autoFocus
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-colors"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                suppressHydrationWarning
                onClick={() => {
                  setAssignAlert(null);
                  setAssigneeName('');
                }}
                className="px-4 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                suppressHydrationWarning
                onClick={handleAssign}
                disabled={!assigneeName.trim() || updateAlert.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateAlert.isPending ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function SummaryCard({
  icon,
  label,
  value,
  sub,
  accentBg,
  accentBorder,
  badgeBg,
  badgeText,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  accentBg: string;
  accentBorder: string;
  badgeBg: string;
  badgeText: string;
}) {
  return (
    <div className={cn(accentBg, 'backdrop-blur-xl border', accentBorder, 'rounded-xl p-5')}>
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className={cn('text-xs px-2 py-1 rounded-full font-medium', badgeBg, badgeText)}>
          {label}
        </span>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function InfoRow({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div className={cn('bg-white/5 border border-white/10 rounded-lg p-3', fullWidth && 'col-span-2')}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}


