import { NextRequest, NextResponse } from 'next/server';
import { reports } from '@/lib/mock-data';
import type { Report } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const store = [...reports];

export async function GET() {
  return NextResponse.json({ data: store.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()), success: true, timestamp: new Date().toISOString() });
}

export async function POST() {
  const newReport: Report = {
    id: `RPT-${uuidv4().slice(0, 3).toUpperCase()}`,
    title: 'Full Optimization Report',
    type: 'optimization',
    status: 'generating',
    generatedAt: new Date().toISOString(),
    generatedBy: 'Alex Chen',
    score: 0, savingsEstimate: 0, recommendationCount: 0,
    summary: '', topRisks: [], costOpportunities: [], performanceBottlenecks: [], securityFindings: [], recommendations: [],
  };
  store.unshift(newReport);

  // Simulate generation
  setTimeout(() => {
    const idx = store.findIndex(r => r.id === newReport.id);
    if (idx !== -1) {
      store[idx] = {
        ...store[idx],
        status: 'completed',
        score: 94,
        savingsEstimate: 839,
        recommendationCount: 5,
        summary: 'Comprehensive analysis complete. Infrastructure health score: 94/100. Total potential monthly savings: $839.',
        topRisks: ['Database connection pool nearing capacity', 'SSL certificate expiring in 14 days', 'Memory utilization trending high on worker nodes'],
        costOpportunities: ['Right-size 3 EC2 instances (-$156/mo)', 'Convert to reserved instances (-$72/mo)', 'Enable auto-scaling (-$340/mo)'],
        performanceBottlenecks: ['API Gateway P99 latency trending upward', 'Cache hit rate below target'],
        securityFindings: ['2 medium-severity compliance findings'],
        recommendations: ['Enable auto-scaling', 'Right-size EC2 instances', 'Renew SSL certificates', 'Optimize connection pooling', 'Update TLS configuration'],
      };
    }
  }, 5000);

  return NextResponse.json({ data: newReport, success: true, timestamp: new Date().toISOString() }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required', success: false }, { status: 400 });
  const idx = store.findIndex(r => r.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found', success: false }, { status: 404 });
  store.splice(idx, 1);
  return NextResponse.json({ data: null, success: true, timestamp: new Date().toISOString() });
}
