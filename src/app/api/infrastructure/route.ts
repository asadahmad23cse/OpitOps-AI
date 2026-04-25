import { NextResponse } from 'next/server';
import { getLiveInfrastructure } from '@/lib/live-data';

export async function GET() {
  const data = await getLiveInfrastructure();
  return NextResponse.json({ data, success: true, timestamp: new Date().toISOString() });
}
