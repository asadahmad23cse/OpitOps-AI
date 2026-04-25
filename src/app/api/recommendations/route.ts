import { NextRequest, NextResponse } from 'next/server';
import { getLiveRecommendations, updateLiveRecommendation } from '@/lib/live-data';

export async function GET() {
  const data = await getLiveRecommendations();
  return NextResponse.json({ data, success: true, timestamp: new Date().toISOString() });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as { id: string; status: import('@/types').RecommendationStatus };
  const updated = await updateLiveRecommendation(body.id, body.status);
  if (!updated) return NextResponse.json({ error: 'Not found', success: false }, { status: 404 });
  return NextResponse.json({ data: updated, success: true, timestamp: new Date().toISOString() });
}
