"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { AppSettings } from '@/types';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.getSettings(),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AppSettings>) => api.updateSettings(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });
}
