"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CreateDeploymentInput } from '@/types';

export function useDeployments(filters?: { environment?: string; status?: string }) {
  const params: Record<string, string> = {};
  if (filters?.environment) params.environment = filters.environment;
  if (filters?.status) params.status = filters.status;

  return useQuery({
    queryKey: ['deployments', params],
    queryFn: () => api.getDeployments(Object.keys(params).length ? params : undefined),
    refetchInterval: 10000,
  });
}

export function useCreateDeployment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDeploymentInput) => api.createDeployment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
