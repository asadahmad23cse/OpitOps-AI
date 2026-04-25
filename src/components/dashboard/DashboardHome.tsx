"use client";

import { useState } from 'react';
import { Sparkles, AlertCircle, Rocket, IndianRupee, TrendingUp, CheckCircle2, Server, ArrowRight, Download, ChevronRight, Zap } from 'lucide-react';
import Link from 'next/link';
import { useDashboard } from '@/hooks/use-dashboard';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatTimeAgo, statusColor } from '@/lib/utils';
import { toast } from 'sonner';
import { downloadAsJson, downloadAsCsv } from '@/lib/utils';
import type { HealthScore, Recommendation } from '@/types';

function HealthBreakdownModal({ healthScore, open, onClose }: { healthScore: HealthScore; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Health Score Breakdown">
      <div className="space-y-4">
        <div className="flex items-baseline gap-3 mb-6">
          <span className="text-5xl font-bold text-white">{healthScore.score}</span>
          <span className="text-xl text-gray-500">/100</span>
          <div className="flex items-center gap-1 ml-4 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">+{healthScore.trend} points</span>
          </div>
        </div>
        {healthScore.breakdown.map(cat => (
          <div key={cat.name} className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">{cat.name}</span>
              <span className={`text-sm font-bold ${cat.status === 'healthy' ? 'text-emerald-400' : cat.status === 'warning' ? 'text-amber-400' : 'text-red-400'}`}>
                {cat.score}/100
              </span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
              <div className={`h-full rounded-full ${cat.status === 'healthy' ? 'bg-emerald-400' : cat.status === 'warning' ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${cat.score}%` }} />
            </div>
            <p className="text-xs text-gray-400">{cat.details}</p>
            {cat.affectedResources > 0 && <p className="text-xs text-amber-400 mt-1">{cat.affectedResources} affected resource(s)</p>}
          </div>
        ))}
        <p className="text-xs text-gray-500">Last updated: {formatTimeAgo(healthScore.lastUpdated)}</p>
      </div>
    </Modal>
  );
}

export function DashboardHome() {
  const { data, isLoading, error, refetch } = useDashboard();
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorState message="Failed to load dashboard data" onRetry={() => refetch()} />;

  const d = data!.data;
  const hs = d.healthScore;
  const alertsSummary = d.alertsSummary;
  const depsSummary = d.deploymentsSummary;
  const cost = d.costSnapshot;
  const recs = d.recommendations;
  const infra = d.infrastructure;
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const costUpdated = new Date(cost.lastUpdated);
  const costPeriodText = Number.isNaN(costUpdated.getTime())
    ? 'Current Month MTD'
    : `${monthNames[costUpdated.getUTCMonth()]} ${costUpdated.getUTCFullYear()} MTD`;
  const nonOperationalInfra = infra.filter(node => node.status !== 'operational').length;
  const infraStatusText = nonOperationalInfra === 0
    ? 'All Systems Operational'
    : `${nonOperationalInfra} system${nonOperationalInfra > 1 ? 's' : ''} need attention`;
  const infraStatusClass = nonOperationalInfra === 0 ? 'text-emerald-400' : 'text-amber-400';
  const potentialPerfImprovement = Math.max(
    0,
    Math.round(
      recs.reduce((sum, rec) => {
        const match = rec.performanceImprovement.match(/-?\d+(\.\d+)?/);
        return sum + (match ? Number(match[0]) : 0);
      }, 0),
    ),
  );

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      await fetch('/api/reports', { method: 'POST' });
      toast.success('Optimization report generation started! Check Reports page.');
    } catch { toast.error('Failed to generate report'); }
    finally { setGeneratingReport(false); }
  };

  const handleExport = () => {
    const exportData = {
      healthScore: hs, alertsSummary, deploymentsSummary: depsSummary,
      costSnapshot: cost, infrastructure: infra, exportedAt: new Date().toISOString(),
    };
    downloadAsJson(exportData, 'optiops-dashboard');
    toast.success('Dashboard data exported');
  };

  return (
    <>
      <div className="space-y-6">
        {/* Hero Stats - EXACT SAME GRID AS DESIGN */}
        <div className="grid grid-cols-4 gap-6">
          {/* Overall Health Score */}
          <div className="col-span-2 bg-gradient-to-br from-cyan-500/10 via-emerald-500/10 to-blue-500/10 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-8 relative overflow-hidden shadow-2xl cursor-pointer hover:border-cyan-500/40 transition-all" onClick={() => setHealthModalOpen(true)}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-white/10"><Sparkles className="w-6 h-6 text-cyan-400" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Overall Health Score</h3>
                  <p className="text-sm text-gray-400">AI-powered analysis - Updated {formatTimeAgo(hs.lastUpdated)}</p>
                </div>
              </div>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="text-6xl font-bold text-white">{hs.score}</span>
                <span className="text-2xl text-gray-500">/100</span>
                <div className="flex items-center gap-1 ml-4 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">+{hs.trend} points</span>
                </div>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-400 rounded-full shadow-lg shadow-cyan-500/50" style={{ width: `${hs.score}%` }}></div>
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-emerald-400">{hs.checksPassed} checks passed</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-amber-400">{hs.warnings} warnings</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-red-500/30 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-red-500/20"><AlertCircle className="w-5 h-5 text-red-400" /></div>
              <div>
                <h3 className="text-sm font-medium text-white">Active Alerts</h3>
                <p className="text-xs text-gray-500">{alertsSummary.critical} critical</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-bold text-white">{alertsSummary.open + alertsSummary.acknowledged}</span>
              <span className="text-sm text-gray-500">active</span>
            </div>
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-xs"><span className="text-gray-400">High severity</span><span className="text-orange-400">{alertsSummary.high}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-400">Medium severity</span><span className="text-amber-400">{alertsSummary.medium}</span></div>
            </div>
            <Link href="/alerts" className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors">
              View All Alerts
            </Link>
          </div>

          {/* Active Deployments */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-cyan-500/30 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-cyan-500/20"><Rocket className="w-5 h-5 text-cyan-400" /></div>
              <div>
                <h3 className="text-sm font-medium text-white">Active Deployments</h3>
                <p className="text-xs text-gray-500">{depsSummary.running} running</p>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-bold text-white">{depsSummary.total}</span>
              <span className="text-sm text-gray-500">total</span>
            </div>
            <div className="space-y-1.5 mb-4">
              <div className="flex justify-between text-xs"><span className="text-gray-400">Completed today</span><span className="text-emerald-400">{depsSummary.completedToday}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-400">Success rate</span><span className="text-cyan-400">{depsSummary.total > 0 ? Math.round((depsSummary.success / depsSummary.total) * 100) : 0}%</span></div>
            </div>
            <Link href="/deployments" className="w-full flex items-center justify-center gap-2 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors">
              View Pipeline
            </Link>
          </div>
        </div>

        {/* Cost Snapshot + AI Recommendations */}
        <div className="grid grid-cols-2 gap-6">
          {/* Cost Snapshot */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/20"><IndianRupee className="w-5 h-5 text-emerald-400" /></div>
                <div>
                  <h3 className="text-sm font-medium text-white">Cost Snapshot</h3>
                  <p className="text-xs text-gray-500">{costPeriodText}</p>
                </div>
              </div>
              <Link href="/infrastructure" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">View Details -&gt;</Link>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-400 mb-1">Current Month</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(cost.currentMonth)}</p>
                <p className="text-xs text-emerald-400">{cost.trend >= 0 ? '+' : '-'} {Math.abs(cost.trend)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Projected</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(cost.projected)}</p>
                <p className="text-xs text-gray-500">by month end</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Potential Savings</p>
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(cost.potentialSavings)}</p>
                <p className="text-xs text-emerald-400">{cost.savingsPercentage}</p>
              </div>
            </div>
            <div className="space-y-3">
              {cost.services.map(svc => (
                <div key={svc.service} className="flex items-center justify-between py-2 border-t border-white/5">
                  <div className="flex items-center gap-2"><Server className="w-3.5 h-3.5 text-gray-400" /><span className="text-sm text-gray-300">{svc.service}</span></div>
                  <span className="text-sm font-medium text-white">{formatCurrency(svc.cost)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-500/20"><Zap className="w-5 h-5 text-purple-400" /></div>
                <div>
                  <h3 className="text-sm font-medium text-white">AI Recommendations</h3>
                  <p className="text-xs text-gray-500">High-impact optimizations</p>
                </div>
              </div>
            </div>
            <div className="space-y-4 mb-4">
              {recs.map((rec: Recommendation) => (
                <div key={rec.id} className="group">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">{rec.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded border ${rec.impact === 'high' ? 'bg-red-500/10 border-red-500/20 text-red-400' : rec.impact === 'medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                          {rec.impact} impact
                        </span>
                        {rec.estimatedSavings > 0 && <span className="text-xs text-emerald-400">{formatCurrency(rec.estimatedSavings)}/mo</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
            <Link href="/reports" className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/20 rounded-lg text-cyan-400 text-sm font-medium hover:from-cyan-500/30 hover:to-purple-500/30 transition-all">
              View All Recommendations
            </Link>
          </div>
        </div>

        {/* Infrastructure Status */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/20"><Server className="w-5 h-5 text-blue-400" /></div>
              <div>
                <h3 className="text-sm font-medium text-white">Infrastructure Status</h3>
                <p className="text-xs text-gray-500">Real-time system health</p>
              </div>
            </div>
            <span className={`text-xs ${infraStatusClass}`}>o {infraStatusText}</span>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {infra.map(node => (
              <Link key={node.id} href={`/infrastructure?id=${node.id}`} className="group bg-white/5 border border-white/10 rounded-xl p-4 hover:border-cyan-500/30 transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-white">{node.name}</span>
                  <div className={`w-2 h-2 rounded-full ${node.status === 'operational' ? 'bg-emerald-400' : node.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'}`} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-gray-400">Nodes</span><span className="text-white">{node.nodes}/{node.totalNodes}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">CPU Avg</span><span className={node.cpuAvg > 80 ? 'text-amber-400' : 'text-white'}>{node.cpuAvg}%</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-400">{node.region}</span></div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-emerald-500/10 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Ready to Optimize Your Infrastructure?</h3>
              <p className="text-gray-400 max-w-2xl">Generate a comprehensive AI-powered optimization report with actionable insights, cost savings, and performance improvements.</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <p className="text-2xl font-bold text-cyan-400">{formatCurrency(cost.potentialSavings)}</p>
                <p className="text-xs text-gray-400">Potential Monthly Savings</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-400">+{potentialPerfImprovement}%</p>
                <p className="text-xs text-gray-400">Performance Improvement</p>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-6">
            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 text-black font-medium rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              suppressHydrationWarning
            >
              <Sparkles className="w-4 h-4" />
              {generatingReport ? 'Generating...' : 'Generate Full Optimization Report'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-all"
              suppressHydrationWarning
            >
              <Download className="w-4 h-4" />
              Export Current Data
            </button>
          </div>
        </div>
      </div>

      <HealthBreakdownModal healthScore={hs} open={healthModalOpen} onClose={() => setHealthModalOpen(false)} />
    </>
  );
}
