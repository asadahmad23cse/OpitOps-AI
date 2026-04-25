import { NextResponse } from 'next/server';
import { getLiveHealthScore } from '@/lib/live-data';

export async function GET() {
  const data = await getLiveHealthScore();
  return NextResponse.json({ data, success: true, timestamp: new Date().toISOString() });
}
