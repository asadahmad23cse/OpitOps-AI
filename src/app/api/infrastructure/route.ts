import { NextResponse } from 'next/server';
import { infrastructure } from '@/lib/mock-data';

export async function GET() {
  return NextResponse.json({ data: infrastructure, success: true, timestamp: new Date().toISOString() });
}
