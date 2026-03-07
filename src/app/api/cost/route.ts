import { NextResponse } from 'next/server';
import { costSnapshot } from '@/lib/mock-data';

export async function GET() {
  return NextResponse.json({ data: costSnapshot, success: true, timestamp: new Date().toISOString() });
}
