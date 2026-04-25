import { NextRequest, NextResponse } from 'next/server';
import { getLiveActivity } from '@/lib/live-data';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '8');
  const data = await getLiveActivity(page, pageSize);

  return NextResponse.json({
    data: data.data,
    total: data.total,
    page: data.page,
    pageSize: data.pageSize,
    hasMore: data.hasMore,
  });
}
