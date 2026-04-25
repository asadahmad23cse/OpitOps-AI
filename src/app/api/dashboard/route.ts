import { NextResponse } from 'next/server';
import { getLiveDashboardData } from '@/lib/live-data';

export async function GET() {
  const data = await getLiveDashboardData();
  return NextResponse.json({ data, success: true, timestamp: new Date().toISOString() });
}
