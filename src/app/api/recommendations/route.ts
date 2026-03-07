import { NextRequest, NextResponse } from 'next/server';
import { recommendations } from '@/lib/mock-data';

const store = [...recommendations];

export async function GET() {
  return NextResponse.json({ data: store, success: true, timestamp: new Date().toISOString() });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as { id: string; status: import('@/types').RecommendationStatus };
  const idx = store.findIndex(r => r.id === body.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found', success: false }, { status: 404 });
  store[idx] = { ...store[idx], status: body.status };
  return NextResponse.json({ data: store[idx], success: true, timestamp: new Date().toISOString() });
}
