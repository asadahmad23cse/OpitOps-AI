import { NextRequest, NextResponse } from 'next/server';
import { getLiveSearchResults } from '@/lib/live-data';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  const data = await getLiveSearchResults(q);
  return NextResponse.json({ data, success: true, timestamp: new Date().toISOString() });
}
