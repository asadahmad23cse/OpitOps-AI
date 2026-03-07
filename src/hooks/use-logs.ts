"use client";

import { useQuery } from '@tanstack/react-query';
import type { LogsFilter } from '@/types';

export function useLogs(filters?: LogsFilter, page = 1) {
  const params: Record<string, string> = { page: String(page), pageSize: '20' };
  if (filters?.search) params.search = filters.search;
  if (filters?.level) params.level = filters.level;
  if (filters?.service) params.service = filters.service;
  if (filters?.environment) params.environment = filters.environment;

  return useQuery({
    queryKey: ['logs', params],
    queryFn: () =>
      fetch(`/api/logs?${new URLSearchParams(params)}`).then(r => r.json()),
    refetchInterval: 15000,
  });
}
