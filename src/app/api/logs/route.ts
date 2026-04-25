import { NextRequest, NextResponse } from 'next/server';
import { getLiveLogs } from '@/lib/live-data';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const data = await getLiveLogs(
    {
      search: searchParams.get('search'),
      level: searchParams.get('level'),
      service: searchParams.get('service'),
      environment: searchParams.get('environment'),
    },
    page,
    pageSize,
  );

  return NextResponse.json({
    data: data.data,
    total: data.total,
    page: data.page,
    pageSize: data.pageSize,
    hasMore: data.hasMore,
  });
}
