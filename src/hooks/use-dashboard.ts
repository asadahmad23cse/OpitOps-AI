"use client";

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
    refetchInterval: 30000,
  });
}

export function useHealthScore() {
  return useQuery({
    queryKey: ['health-score'],
    queryFn: () => api.getHealthScore(),
    refetchInterval: 60000,
  });
}
