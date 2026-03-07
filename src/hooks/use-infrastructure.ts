"use client";

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useInfrastructure() {
  return useQuery({
    queryKey: ['infrastructure'],
    queryFn: () => api.getInfrastructure(),
    refetchInterval: 30000,
  });
}

export function useCost(timeRange?: string) {
  return useQuery({
    queryKey: ['cost', timeRange],
    queryFn: () => api.getCost(timeRange),
  });
}
