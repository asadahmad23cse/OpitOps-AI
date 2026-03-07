import { NextRequest, NextResponse } from 'next/server';
import { appSettings } from '@/lib/mock-data';

let store = { ...appSettings };

export async function GET() {
  return NextResponse.json({ data: store, success: true, timestamp: new Date().toISOString() });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  store = { ...store, ...body };
  return NextResponse.json({ data: store, success: true, timestamp: new Date().toISOString() });
}
