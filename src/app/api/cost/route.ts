import { NextResponse } from 'next/server';
import { getLiveCostSnapshot } from '@/lib/live-data';

export async function GET() {
  const data = await getLiveCostSnapshot();
  return NextResponse.json({ data, success: true, timestamp: new Date().toISOString() });
}
