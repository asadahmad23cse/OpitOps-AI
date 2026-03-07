import { NextRequest, NextResponse } from 'next/server';
import { activityEvents } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '8');

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginated = activityEvents.slice(start, end);

  return NextResponse.json({
    data: paginated,
    total: activityEvents.length,
    page,
    pageSize,
    hasMore: end < activityEvents.length,
  });
}
