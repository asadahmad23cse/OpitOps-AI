"use client";

import { useMutation } from '@tanstack/react-query';
import type { IncidentPostMortem } from '@/types';

export interface GeneratePostMortemInput {
  alertId: string;
  resolvedAt: string;
}

async function createPostMortem(payload: GeneratePostMortemInput): Promise<IncidentPostMortem> {
  const response = await fetch('/api/incidents/postmortem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : 'Failed to generate incident post-mortem.';
    throw new Error(message);
  }

  return body as IncidentPostMortem;
}

export function usePostMortem() {
  return useMutation<IncidentPostMortem, Error, GeneratePostMortemInput>({
    mutationFn: createPostMortem,
  });
}
