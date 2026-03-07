import { NextRequest, NextResponse } from 'next/server';
import { searchIndex } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase() || '';
  if (!q) return NextResponse.json({ data: searchIndex.filter(s => s.category === 'page' || s.category === 'action'), success: true, timestamp: new Date().toISOString() });
  const results = searchIndex.filter(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  return NextResponse.json({ data: results.slice(0, 15), success: true, timestamp: new Date().toISOString() });
}
