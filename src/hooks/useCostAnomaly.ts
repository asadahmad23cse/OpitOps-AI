"use client";

import { useQuery } from '@tanstack/react-query';
import type { CostAnomalyExplainResponse } from '@/types';

async function getCostAnomalyExplanation(): Promise<CostAnomalyExplainResponse> {
  const response = await fetch('/api/cost/explain', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : 'Failed to load cost anomaly insights.';
    throw new Error(message);
  }

  return payload as CostAnomalyExplainResponse;
}

export function useCostAnomaly() {
  return useQuery({
    queryKey: ['cost-anomaly-explain'],
    queryFn: getCostAnomalyExplanation,
    refetchInterval: 300_000,
  });
}
