"use client";

import { useQuery } from '@tanstack/react-query';
import type { ApiResponse, TopologyResponse, TopologyNodeDetail } from '@/types';

export function useTopology() {
  return useQuery<ApiResponse<TopologyResponse>>({
    queryKey: ['topology'],
    queryFn: () => fetch('/api/topology').then(r => r.json()),
    refetchInterval: 30000,
  });
}

export function useTopologyNodeDetail(nodeId: string | null) {
  return useQuery<ApiResponse<TopologyNodeDetail>>({
    queryKey: ['topology-node', nodeId],
    queryFn: () => fetch(`/api/topology?nodeId=${nodeId}`).then(r => r.json()),
    enabled: !!nodeId,
  });
}
