import { NextRequest, NextResponse } from 'next/server';
import { notifications } from '@/lib/mock-data';

const store = [...notifications];

export async function GET() {
  return NextResponse.json({ data: store, success: true, timestamp: new Date().toISOString() });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as { id: string };
  const idx = store.findIndex(n => n.id === body.id);
  if (idx !== -1) store[idx].read = true;
  return NextResponse.json({ data: null, success: true, timestamp: new Date().toISOString() });
}

export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  if (searchParams.get('action') === 'read-all') {
    store.forEach(n => (n.read = true));
  }
  return NextResponse.json({ data: null, success: true, timestamp: new Date().toISOString() });
}
