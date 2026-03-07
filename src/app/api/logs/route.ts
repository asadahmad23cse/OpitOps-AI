import { NextRequest, NextResponse } from 'next/server';
import { logEntries } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get('search');
  const level = searchParams.get('level');
  const service = searchParams.get('service');
  const environment = searchParams.get('environment');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  let filtered = [...logEntries];
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(l => l.message.toLowerCase().includes(q) || l.service.toLowerCase().includes(q) || l.traceId.toLowerCase().includes(q));
  }
  if (level) filtered = filtered.filter(l => l.level === level);
  if (service) filtered = filtered.filter(l => l.service === service);
  if (environment) filtered = filtered.filter(l => l.environment === environment);

  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return NextResponse.json({
    data: filtered.slice(start, end),
    total: filtered.length,
    page,
    pageSize,
    hasMore: end < filtered.length,
  });
}
