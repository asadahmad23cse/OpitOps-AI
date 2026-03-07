"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: () => api.getReports(),
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.generateReport(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/reports?id=${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });
}
