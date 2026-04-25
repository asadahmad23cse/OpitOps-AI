import { NextRequest, NextResponse } from 'next/server';
import { deleteLiveReport, generateLiveReport, getLiveReports } from '@/lib/live-data';

export async function GET() {
  const data = await getLiveReports();
  return NextResponse.json({ data, success: true, timestamp: new Date().toISOString() });
}

export async function POST() {
  const data = await generateLiveReport();
  return NextResponse.json({ data, success: true, timestamp: new Date().toISOString() }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required', success: false }, { status: 400 });
  const ok = await deleteLiveReport(id);
  if (!ok) return NextResponse.json({ error: 'Not found', success: false }, { status: 404 });
  return NextResponse.json({ data: null, success: true, timestamp: new Date().toISOString() });
}

