import { NextRequest, NextResponse } from 'next/server';
import { getLiveAlerts, updateLiveAlert } from '@/lib/live-data';
import type { Alert } from '@/types';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const data = await getLiveAlerts({
    severity: searchParams.get('severity'),
    status: searchParams.get('status'),
    service: searchParams.get('service'),
    search: searchParams.get('search'),
  });
  return NextResponse.json({ data, success: true, timestamp: new Date().toISOString() });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as { id: string } & Partial<Alert>;
  const updated = await updateLiveAlert(body);
  if (!updated) {
    return NextResponse.json({ error: 'Alert not found', success: false }, { status: 404 });
  }
  return NextResponse.json({ data: updated, success: true, timestamp: new Date().toISOString() });
}
