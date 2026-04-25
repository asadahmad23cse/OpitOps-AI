import Groq from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getLiveAlerts, getLiveDashboardData } from '@/lib/live-data';
import type { IncidentPostMortem } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MODEL = 'llama3-70b-8192';

const requestSchema = z.object({
  alertId: z.string().min(1, 'alertId is required'),
  resolvedAt: z.string().min(1, 'resolvedAt is required'),
});

const postMortemSchema = z.object({
  title: z.string().min(1),
  severity: z.enum(['P1', 'P2', 'P3']),
  timeline: z.array(z.object({ time: z.string().min(1), event: z.string().min(1) })),
  rootCause: z.string().min(1),
  impactedServices: z.array(z.string().min(1)),
  resolutionSteps: z.array(z.string().min(1)),
  followUpActions: z.array(
    z.object({
      action: z.string().min(1),
      owner: z.string().min(1),
      dueDate: z.string().min(1),
    }),
  ),
  lessonsLearned: z.string().min(1),
});

const OUTPUT_SCHEMA_DESCRIPTION = {
  title: 'string',
  severity: 'P1 | P2 | P3',
  timeline: [{ time: 'string', event: 'string' }],
  rootCause: 'string',
  impactedServices: ['string'],
  resolutionSteps: ['string'],
  followUpActions: [{ action: 'string', owner: 'string', dueDate: 'string' }],
  lessonsLearned: 'string',
} as const;

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_groq_key_here') {
    return NextResponse.json(
      { error: 'missing_api_key', message: 'GROQ_API_KEY is missing in environment.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Request body must be valid JSON.' },
      { status: 400 },
    );
  }

  const parsedRequest = requestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(
      { error: 'invalid_request', message: parsedRequest.error.issues[0]?.message ?? 'Invalid request body.' },
      { status: 400 },
    );
  }

  const { alertId, resolvedAt } = parsedRequest.data;
  const resolvedAtDate = new Date(resolvedAt);
  if (Number.isNaN(resolvedAtDate.getTime())) {
    return NextResponse.json(
      { error: 'invalid_resolved_at', message: 'resolvedAt must be a valid date string.' },
      { status: 400 },
    );
  }

  try {
    const [snapshot, alertsData] = await Promise.all([
      getLiveDashboardData(),
      getLiveAlerts({}),
    ]);

    const incidentAlert = alertsData.alerts.find((alert) => alert.id === alertId) ?? null;

    const contextPayload = {
      alertId,
      resolvedAt: resolvedAtDate.toISOString(),
      incidentAlert,
      snapshot,
      outputSchema: OUTPUT_SCHEMA_DESCRIPTION,
    };

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are a senior SRE incident commander. Generate concise, realistic production incident post-mortems. Return ONLY valid JSON, no markdown or prose outside JSON.',
        },
        {
          role: 'user',
          content: [
            'Generate an incident post-mortem using the provided live system snapshot.',
            'Use this exact JSON schema and key names:',
            JSON.stringify(OUTPUT_SCHEMA_DESCRIPTION, null, 2),
            '',
            'Rules:',
            '- Keep timeline in chronological order',
            '- Include concrete technical root cause',
            '- Impacted services must be service names, not generic words',
            '- Follow-up dueDate should be ISO date (YYYY-MM-DD)',
            '- Output only JSON object',
            '',
            'Context:',
            JSON.stringify(contextPayload, null, 2),
          ].join('\n'),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      return NextResponse.json(
        { error: 'empty_model_response', message: 'Groq did not return post-mortem content.' },
        { status: 502 },
      );
    }

    const extracted = extractJsonObject(raw);
    const parsedJson = JSON.parse(extracted) as unknown;
    const validated = postMortemSchema.parse(parsedJson) as IncidentPostMortem;

    return NextResponse.json(validated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate post-mortem.';
    return NextResponse.json(
      { error: 'postmortem_generation_failed', message },
      { status: 502 },
    );
  }
}
