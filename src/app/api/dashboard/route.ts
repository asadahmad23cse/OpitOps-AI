import { NextResponse } from 'next/server';
import { healthScore, getAlertsSummary, getDeploymentsSummary, costSnapshot, recommendations, infrastructure, activityEvents } from '@/lib/mock-data';

export async function GET() {
  const data = {
    healthScore,
    alertsSummary: getAlertsSummary(),
    deploymentsSummary: getDeploymentsSummary(),
    costSnapshot,
    recommendations: recommendations.filter(r => r.status !== 'dismissed').slice(0, 3),
    infrastructure,
    recentActivity: activityEvents.slice(0, 5),
    lastUpdated: new Date().toISOString(),
  };
  return NextResponse.json({ data, success: true, timestamp: new Date().toISOString() });
}
