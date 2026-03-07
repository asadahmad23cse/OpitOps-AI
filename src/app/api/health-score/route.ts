import { NextResponse } from 'next/server';
import { healthScore } from '@/lib/mock-data';

export async function GET() {
  return NextResponse.json({ data: healthScore, success: true, timestamp: new Date().toISOString() });
}
