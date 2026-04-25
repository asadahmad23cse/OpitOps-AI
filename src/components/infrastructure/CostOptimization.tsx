"use client";

import { useState } from 'react';
import { IndianRupee, TrendingDown, TrendingUp, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useCost } from '@/hooks/use-infrastructure';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatCurrency, formatTimeAgo, downloadAsJson } from '@/lib/utils';
import { toast } from 'sonner';

export function CostOptimization() {
  const [timeRange, setTimeRange] = useState('monthly');
  const { data, isLoading, error, refetch } = useCost(timeRange);

  if (isLoading) return <div className="grid grid-cols-3 gap-6"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>;
  if (error) return <ErrorState message="Failed to load cost data" onRetry={() => refetch()} />;

  const cost = data?.data;
  if (!cost) return null;

  const chartData = cost.dailyCosts.slice(-14).map(d => ({
    date: new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    cost: Math.round(d.cost),
  }));

  const handleExport = () => {
    downloadAsJson(cost, 'cost-report');
    toast.success('Cost report exported');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {['daily', 'weekly', 'monthly'].map(range => (
            <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${timeRange === range ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`} suppressHydrationWarning>
              {range}
            </button>
          ))}
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors" suppressHydrationWarning>
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3"><IndianRupee className="w-4 h-4 text-gray-400" /><span className="text-xs text-gray-400">Current Month</span></div>
          <p className="text-3xl font-bold text-white">{formatCurrency(cost.currentMonth)}</p>
          <div className="flex items-center gap-1 mt-2 text-xs"><TrendingDown className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">{Math.abs(cost.trend)}% vs last month</span></div>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-gray-400" /><span className="text-xs text-gray-400">Projected</span></div>
          <p className="text-3xl font-bold text-white">{formatCurrency(cost.projected)}</p>
          <p className="text-xs text-gray-500 mt-2">by month end</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3"><IndianRupee className="w-4 h-4 text-emerald-400" /><span className="text-xs text-gray-400">Potential Savings</span></div>
          <p className="text-3xl font-bold text-emerald-400">{formatCurrency(cost.potentialSavings)}</p>
          <p className="text-xs text-emerald-400 mt-2">{cost.savingsPercentage}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h4 className="text-sm font-medium text-white mb-4">Daily Cost Trend</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={52} tickFormatter={v => formatCurrency(Number(v))} />
              <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} formatter={(v) => [formatCurrency(Number(v)), 'Cost']} />
              <Bar dataKey="cost" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
          <h4 className="text-sm font-medium text-white mb-4">Service Breakdown</h4>
          <div className="space-y-4">
            {cost.services.map(svc => (
              <div key={svc.service} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-sm text-gray-300">{svc.service}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">{formatCurrency(svc.cost)}</span>
                  <span className={`text-xs ${svc.trend < 0 ? 'text-emerald-400' : 'text-red-400'}`}>{svc.trend > 0 ? '+' : ''}{svc.trend}%</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">Last updated: {formatTimeAgo(cost.lastUpdated)}</p>
        </div>
      </div>
    </div>
  );
}
