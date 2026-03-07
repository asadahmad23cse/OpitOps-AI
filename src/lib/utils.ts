import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyDetailed(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy');
}

export function formatDateTime(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy HH:mm');
}

export function formatTimeAgo(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function severityColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: 'text-red-400',
    high: 'text-orange-400',
    medium: 'text-amber-400',
    low: 'text-blue-400',
  };
  return colors[severity] || 'text-gray-400';
}

export function severityBgColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: 'bg-red-500/20 border-red-500/30',
    high: 'bg-orange-500/20 border-orange-500/30',
    medium: 'bg-amber-500/20 border-amber-500/30',
    low: 'bg-blue-500/20 border-blue-500/30',
  };
  return colors[severity] || 'bg-gray-500/20 border-gray-500/30';
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    open: 'text-red-400',
    acknowledged: 'text-amber-400',
    resolved: 'text-emerald-400',
    running: 'text-cyan-400',
    success: 'text-emerald-400',
    failed: 'text-red-400',
    rolled_back: 'text-orange-400',
    queued: 'text-gray-400',
    operational: 'text-emerald-400',
    degraded: 'text-amber-400',
    outage: 'text-red-400',
    healthy: 'text-emerald-400',
    warning: 'text-amber-400',
    critical: 'text-red-400',
    pending: 'text-gray-400',
    in_progress: 'text-cyan-400',
    applied: 'text-emerald-400',
    dismissed: 'text-gray-500',
  };
  return colors[status] || 'text-gray-400';
}

export function statusBgColor(status: string): string {
  const colors: Record<string, string> = {
    open: 'bg-red-500/10 border border-red-500/20',
    acknowledged: 'bg-amber-500/10 border border-amber-500/20',
    resolved: 'bg-emerald-500/10 border border-emerald-500/20',
    running: 'bg-cyan-500/10 border border-cyan-500/20',
    success: 'bg-emerald-500/10 border border-emerald-500/20',
    failed: 'bg-red-500/10 border border-red-500/20',
    rolled_back: 'bg-orange-500/10 border border-orange-500/20',
    queued: 'bg-gray-500/10 border border-gray-500/20',
    operational: 'bg-emerald-500/10 border border-emerald-500/20',
    degraded: 'bg-amber-500/10 border border-amber-500/20',
    outage: 'bg-red-500/10 border border-red-500/20',
  };
  return colors[status] || 'bg-gray-500/10 border border-gray-500/20';
}

export function activityTypeColor(type: string): string {
  const colors: Record<string, string> = {
    deployment: 'bg-cyan-500',
    alert: 'bg-red-500',
    config_change: 'bg-purple-500',
    recommendation: 'bg-emerald-500',
    report: 'bg-blue-500',
    security_scan: 'bg-amber-500',
    incident_resolved: 'bg-green-500',
  };
  return colors[type] || 'bg-gray-500';
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function downloadAsJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadAsCsv(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = typeof val === 'string' ? val : JSON.stringify(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')
    ),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
