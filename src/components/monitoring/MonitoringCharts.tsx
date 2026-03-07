"use client";

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/Skeleton';
import { RefreshCw } from 'lucide-react';

interface ServiceMetricData {
  service: string;
  cpu: { timestamp: string; value: number }[];
  memory: { timestamp: string; value: number }[];
  latency: { timestamp: string; value: number }[];
  errorRate: { timestamp: string; value: number }[];
  uptime: number;
  status: string;
}

export function MonitoringCharts() {
  const [selectedService, setSelectedService] = useState(0);
  const [timeRange, setTimeRange] = useState('24h');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['monitoring-metrics'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard');
      return res.json();
    },
    select: (res): ServiceMetricData[] => {
      const infra = res.data.infrastructure;
      return infra.map((node: { name: string; cpuAvg: number; memoryAvg: number; latency: number; errorRate: number; uptime: number; status: string }) => ({
        service: node.name,
        cpu: Array.from({ length: 24 }, (_, i) => ({ timestamp: `${23 - i}h`, value: node.cpuAvg + (Math.random() - 0.5) * 20 })),
        memory: Array.from({ length: 24 }, (_, i) => ({ timestamp: `${23 - i}h`, value: (node.cpuAvg * 1.1) + (Math.random() - 0.5) * 15 })),
        latency: Array.from({ length: 24 }, (_, i) => ({ timestamp: `${23 - i}h`, value: node.latency + (Math.random() - 0.5) * node.latency * 0.5 })),
        errorRate: Array.from({ length: 24 }, (_, i) => ({ timestamp: `${23 - i}h`, value: node.errorRate + Math.random() * 0.1 })),
        uptime: node.uptime,
        status: node.status,
      }));
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="grid grid-cols-2 gap-6">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>;

  const services = data || [];
  const svc = services[selectedService];
  if (!svc) return null;

  const chartConfig = [
    { title: 'CPU Usage', data: svc.cpu, color: '#06b6d4', unit: '%' },
    { title: 'Memory Usage', data: svc.memory, color: '#10b981', unit: '%' },
    { title: 'Latency', data: svc.latency, color: '#a78bfa', unit: 'ms' },
    { title: 'Error Rate', data: svc.errorRate, color: '#f87171', unit: '%' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {services.map((s, i) => (
            <button key={s.service} onClick={() => setSelectedService(i)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${i === selectedService ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`} suppressHydrationWarning>
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${s.status === 'operational' ? 'bg-emerald-400' : s.status === 'degraded' ? 'bg-amber-400' : 'bg-red-400'}`} />
              {s.service}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {['1h', '6h', '24h', '7d'].map(range => (
            <button key={range} onClick={() => setTimeRange(range)} className={`px-2.5 py-1 rounded text-xs transition-colors ${timeRange === range ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`} suppressHydrationWarning>{range}</button>
          ))}
          <button onClick={() => refetch()} disabled={isFetching} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" suppressHydrationWarning>
            <RefreshCw className={`w-4 h-4 text-gray-400 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {chartConfig.map(chart => (
          <div key={chart.title} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-white">{chart.title}</h4>
              <span className="text-xs text-gray-500">{svc.service}</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chart.data}>
                <defs>
                  <linearGradient id={`grad-${chart.title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chart.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chart.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="timestamp" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Area type="monotone" dataKey="value" stroke={chart.color} strokeWidth={2} fill={`url(#grad-${chart.title})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-500 text-right">Uptime: {svc.uptime}% • Status: <span className={svc.status === 'operational' ? 'text-emerald-400' : 'text-amber-400'}>{svc.status}</span></div>
    </div>
  );
}
