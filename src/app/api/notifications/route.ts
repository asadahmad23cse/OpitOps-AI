import { NextRequest, NextResponse } from 'next/server';
import { getLiveNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/live-data';

export async function GET() {
  const data = await getLiveNotifications();
  return NextResponse.json({ data, success: true, timestamp: new Date().toISOString() });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as { id: string };
  await markNotificationRead(body.id);
  return NextResponse.json({ data: null, success: true, timestamp: new Date().toISOString() });
}

export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  if (searchParams.get('action') === 'read-all') {
    await markAllNotificationsRead();
  }
  return NextResponse.json({ data: null, success: true, timestamp: new Date().toISOString() });
}
