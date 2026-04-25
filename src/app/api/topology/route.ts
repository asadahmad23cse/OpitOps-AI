import { NextRequest, NextResponse } from 'next/server';
import { getLiveTopology, getLiveTopologyNodeDetail } from '@/lib/live-data';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const nodeId = searchParams.get('nodeId');

  if (nodeId) {
    const detail = await getLiveTopologyNodeDetail(nodeId);
    if (!detail) return NextResponse.json({ error: 'Node not found', success: false }, { status: 404 });
    return NextResponse.json({ data: detail, success: true, timestamp: new Date().toISOString() });
  }

  const data = await getLiveTopology();
  return NextResponse.json({
    data,
    success: true,
    timestamp: new Date().toISOString(),
  });
}

