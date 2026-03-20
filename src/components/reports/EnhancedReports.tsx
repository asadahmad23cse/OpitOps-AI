"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Download,
  Plus,
  Trash2,
  Eye,
  Filter,
  ChevronDown,
  Shield,
  IndianRupee,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  BarChart3,
  Target,
  Star,
} from 'lucide-react';
import { useReports, useGenerateReport, useDeleteReport } from '@/hooks/use-reports';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn, formatTimeAgo, formatCurrency, downloadAsJson } from '@/lib/utils';
import { toast } from 'sonner';
import type { Report, ReportType, ReportStatus } from '@/types';

const typeConfig: Record<ReportType, { icon: typeof Shield; color: string; bg: string; border: string; label: string }> = {
  optimization: { icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', label: 'Optimization' },
  cost: { icon: IndianRupee, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Cost' },
  security: { icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Security' },
  performance: { icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', label: 'Performance' },
};

const statusConfig: Record<ReportStatus, { color: string; bg: string; border: string; label: string }> = {
  completed: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Completed' },
  generating: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', label: 'Generating' },
  failed: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Failed' },
};

const FILTER_OPTIONS: { label: string; value: ReportType | 'all' }[] = [
  { label: 'All Reports', value: 'all' },
  { label: 'Optimization', value: 'optimization' },
  { label: 'Cost', value: 'cost' },
  { label: 'Security', value: 'security' },
  { label: 'Performance', value: 'performance' },
];

export function EnhancedReports() {
  const searchParams = useSearchParams();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ReportType | 'all'>('all');

  const { data, isLoading, isError, refetch } = useReports();
  const generateReport = useGenerateReport();
  const deleteReport = useDeleteReport();

  const reports: Report[] = data?.data ?? [];
  const filteredReports = filterType === 'all'
    ? reports
    : reports.filter(r => r.type === filterType);

  useEffect(() => {
    if (searchParams.get('action') === 'generate' && !generateReport.isPending) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = useCallback(() => {
    generateReport.mutate(undefined, {
      onSuccess: () => toast.success('Report generated successfully'),
      onError: () => toast.error('Failed to generate report'),
    });
  }, [generateReport]);

  const handleDelete = useCallback((id: string) => {
    deleteReport.mutate(id, {
      onSuccess: () => {
        toast.success('Report deleted successfully');
        setDeleteConfirmId(null);
        if (selectedReport?.id === id) setSelectedReport(null);
      },
      onError: () => toast.error('Failed to delete report'),
    });
  }, [deleteReport, selectedReport]);

  const exportReport = useCallback((report: Report) => {
    downloadAsJson(report, `report-${report.type}-${report.id}`);
    toast.success('Report exported successfully');
  }, []);

  if (isError) {
    return <ErrorState message="Failed to load reports." onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-xl border border-cyan-500/20 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1">Reports</h2>
            <p className="text-sm text-gray-400">
              {reports.length} reports generated &middot; AI-powered infrastructure analysis
            </p>
          </div>
          <button
            suppressHydrationWarning
            onClick={handleGenerate}
            disabled={generateReport.isPending}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 rounded-lg text-black font-semibold shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-60"
          >
            {generateReport.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            {generateReport.isPending ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-500" />
        {FILTER_OPTIONS.map(opt => (
          <button
            suppressHydrationWarning
            key={opt.value}
            onClick={() => setFilterType(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
              filterType === opt.value
                ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Report List */}
      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredReports.length === 0 ? (
        <EmptyState
          title="No reports found"
          description={filterType !== 'all' ? 'Try a different filter or generate a new report.' : 'Generate your first report to get started.'}
          icon={<FileText className="w-8 h-8 text-gray-500" />}
          action={
            <button
              suppressHydrationWarning
              onClick={handleGenerate}
              disabled={generateReport.isPending}
              className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-sm text-cyan-400 font-medium hover:bg-cyan-500/30 transition-colors"
            >
              Generate Report
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredReports.map(report => {
            const tConfig = typeConfig[report.type];
            const sConfig = statusConfig[report.status];
            const TypeIcon = tConfig.icon;

            return (
              <div
                key={report.id}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className={cn('p-3 rounded-lg', tConfig.bg)}>
                    <TypeIcon className={cn('w-5 h-5', tConfig.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-1.5">
                          <h3 className="text-base font-semibold text-white">{report.title}</h3>
                          <span className={cn('text-xs px-2 py-0.5 rounded border font-medium', tConfig.bg, tConfig.border, tConfig.color)}>
                            {tConfig.label}
                          </span>
                          <span className={cn('text-xs px-2 py-0.5 rounded border font-medium', sConfig.bg, sConfig.border, sConfig.color)}>
                            {sConfig.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(report.generatedAt)}
                          </span>
                          <span>by {report.generatedBy}</span>
                        </div>
                      </div>
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-4 gap-4 mb-4 pb-4 border-b border-white/5">
                      <MetricCell
                        icon={Star}
                        label="Score"
                        value={`${report.score}/100`}
                        color={report.score >= 80 ? 'text-emerald-400' : report.score >= 60 ? 'text-amber-400' : 'text-red-400'}
                      />
                      <MetricCell
                        icon={IndianRupee}
                        label="Estimated Savings"
                        value={formatCurrency(report.savingsEstimate)}
                        color="text-emerald-400"
                      />
                      <MetricCell
                        icon={Target}
                        label="Recommendations"
                        value={String(report.recommendationCount)}
                        color="text-cyan-400"
                      />
                      <MetricCell
                        icon={AlertTriangle}
                        label="Top Risks"
                        value={String(report.topRisks.length)}
                        color="text-amber-400"
                      />
                    </div>

                    {/* Summary */}
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{report.summary}</p>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        suppressHydrationWarning
                        onClick={() => setSelectedReport(report)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded text-xs text-cyan-400 font-medium transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Details
                      </button>
                      <button
                        suppressHydrationWarning
                        onClick={() => exportReport(report)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-gray-300 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export JSON
                      </button>
                      <button
                        suppressHydrationWarning
                        onClick={() => setDeleteConfirmId(report.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-xs text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Detail Modal */}
      <Modal
        open={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={selectedReport?.title ?? 'Report Details'}
        maxWidth="max-w-4xl"
      >
        {selectedReport && <ReportDetail report={selectedReport} onExport={exportReport} />}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Delete Report"
        description="This action cannot be undone. The report and all its data will be permanently removed."
        confirmText="Delete Report"
        loading={deleteReport.isPending}
        destructive
      />
    </div>
  );
}

function MetricCell({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Star;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <Icon className="w-3 h-3 text-gray-500" />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={cn('text-lg font-bold', color)}>{value}</p>
    </div>
  );
}

function ReportDetail({ report, onExport }: { report: Report; onExport: (r: Report) => void }) {
  const tConfig = typeConfig[report.type];

  return (
    <div className="space-y-6">
      {/* Score Overview */}
      <div className="flex items-center gap-6 p-4 bg-white/5 rounded-xl border border-white/5">
        <div className="text-center">
          <div className={cn(
            'text-4xl font-bold',
            report.score >= 80 ? 'text-emerald-400' : report.score >= 60 ? 'text-amber-400' : 'text-red-400'
          )}>
            {report.score}
          </div>
          <span className="text-xs text-gray-500">Score</span>
        </div>
        <div className="h-12 w-px bg-white/10" />
        <div className="flex-1">
          <p className="text-sm text-gray-300 leading-relaxed">{report.summary}</p>
        </div>
        <button
          suppressHydrationWarning
          onClick={() => onExport(report)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-sm text-cyan-400 font-medium transition-colors flex-shrink-0"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Findings Grid */}
      <div className="grid grid-cols-2 gap-4">
        <FindingSection
          title="Top Risks"
          items={report.topRisks}
          icon={AlertTriangle}
          color="text-red-400"
          bg="bg-red-500/10"
          border="border-red-500/20"
        />
        <FindingSection
          title="Cost Opportunities"
          items={report.costOpportunities}
          icon={IndianRupee}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
          border="border-emerald-500/20"
        />
        <FindingSection
          title="Performance Bottlenecks"
          items={report.performanceBottlenecks}
          icon={Zap}
          color="text-amber-400"
          bg="bg-amber-500/10"
          border="border-amber-500/20"
        />
        <FindingSection
          title="Security Findings"
          items={report.securityFindings}
          icon={Shield}
          color="text-purple-400"
          bg="bg-purple-500/10"
          border="border-purple-500/20"
        />
      </div>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            Recommendations ({report.recommendations.length})
          </h4>
          <div className="space-y-2">
            {report.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-300">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FindingSection({
  title,
  items,
  icon: Icon,
  color,
  bg,
  border,
}: {
  title: string;
  items: string[];
  icon: typeof Shield;
  color: string;
  bg: string;
  border: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={cn('rounded-xl p-4 border', bg, border)}>
      <h4 className={cn('text-sm font-semibold mb-3 flex items-center gap-2', color)}>
        <Icon className="w-4 h-4" />
        {title} ({items.length})
      </h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
            <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0', color.replace('text-', 'bg-'))} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
