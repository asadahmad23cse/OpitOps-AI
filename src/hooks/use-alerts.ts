"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Alert, AlertsFilter } from '@/types';

export function useAlerts(filters?: AlertsFilter) {
  const params: Record<string, string> = {};
  if (filters?.severity) params.severity = filters.severity;
  if (filters?.status) params.status = filters.status;
  if (filters?.service) params.service = filters.service;
  if (filters?.search) params.search = filters.search;

  return useQuery({
    queryKey: ['alerts', params],
    queryFn: () => api.getAlerts(Object.keys(params).length ? params : undefined),
    refetchInterval: 30000,
  });
}

export function useUpdateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Alert>) =>
      fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...data }) }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
