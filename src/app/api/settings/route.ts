import { NextRequest, NextResponse } from 'next/server';
import { getLiveSettings, updateLiveSettings } from '@/lib/live-data';

export async function GET() {
  const data = await getLiveSettings();
  return NextResponse.json({ data, success: true, timestamp: new Date().toISOString() });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const data = await updateLiveSettings(body);
  return NextResponse.json({ data, success: true, timestamp: new Date().toISOString() });
}
