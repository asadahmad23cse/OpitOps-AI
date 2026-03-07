"use client";

import { useQuery } from '@tanstack/react-query';
import { Clock, Activity, AlertTriangle, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

const iconMap: Record<string, React.ElementType> = {
  clock: Clock, activity: Activity, 'alert-triangle': AlertTriangle, users: Users,
};

export function TopKPIBar() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then(r => r.json()),
    select: (res) => {
      const d = res.data;
      return [
        { label: 'Avg Response Time', value: '145ms', change: -12, status: 'down' as const, icon: 'clock' },
        { label: 'Request Rate', value: '2.4k/s', change: 8, status: 'up' as const, icon: 'activity' },
        { label: 'Error Rate', value: `${(d.alertsSummary.critical * 0.04).toFixed(2)}%`, change: d.alertsSummary.critical > 0 ? 5 : -23, status: d.alertsSummary.critical > 0 ? 'up' as const : 'down' as const, icon: 'alert-triangle' },
        { label: 'Active Connections', value: '1,247', change: 5, status: 'up' as const, icon: 'users' },
      ];
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  const kpis = data || [];

  return (
    <div className="grid grid-cols-4 gap-4">
      {kpis.map(kpi => {
        const Icon = iconMap[kpi.icon] || Activity;
        const isPositiveGood = kpi.label === 'Request Rate' || kpi.label === 'Active Connections';
        const isGood = isPositiveGood ? kpi.status === 'up' : kpi.status === 'down';
        return (
          <div key={kpi.label} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:border-white/20 transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-white/5"><Icon className="w-4 h-4 text-gray-400" /></div>
              <div className={`flex items-center gap-1 text-xs ${isGood ? 'text-emerald-400' : 'text-red-400'}`}>
                {kpi.status === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(kpi.change)}%
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-1">{kpi.label}</p>
          </div>
        );
      })}
    </div>
  );
}
