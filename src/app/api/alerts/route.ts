import { NextRequest, NextResponse } from 'next/server';
import { alerts, getAlertsSummary } from '@/lib/mock-data';
import type { Alert } from '@/types';

const alertsStore = [...alerts];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const severity = searchParams.get('severity');
  const status = searchParams.get('status');
  const service = searchParams.get('service');
  const search = searchParams.get('search');

  let filtered = [...alertsStore];
  if (severity) filtered = filtered.filter(a => a.severity === severity);
  if (status) filtered = filtered.filter(a => a.status === status);
  if (service) filtered = filtered.filter(a => a.service === service);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(a => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.service.toLowerCase().includes(q));
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const summary = getAlertsSummary();
  return NextResponse.json({ data: { alerts: filtered, summary }, success: true, timestamp: new Date().toISOString() });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as { id: string } & Partial<Alert>;
  const idx = alertsStore.findIndex(a => a.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'Alert not found', success: false }, { status: 404 });

  const historyEntry = {
    id: `h-${Date.now()}`,
    action: body.status === 'acknowledged' ? 'Acknowledged' : body.status === 'resolved' ? 'Resolved' : body.assignee ? `Assigned to ${body.assignee}` : 'Updated',
    user: 'Alex Chen',
    timestamp: new Date().toISOString(),
    details: '',
  };

  alertsStore[idx] = { ...alertsStore[idx], ...body, updatedAt: new Date().toISOString(), history: [...alertsStore[idx].history, historyEntry] };
  return NextResponse.json({ data: alertsStore[idx], success: true, timestamp: new Date().toISOString() });
}
