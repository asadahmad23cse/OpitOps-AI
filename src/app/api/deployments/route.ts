import { NextRequest, NextResponse } from 'next/server';
import { deployments, getDeploymentsSummary } from '@/lib/mock-data';
import type { CreateDeploymentInput, Deployment } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const deploymentsStore = [...deployments];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const environment = searchParams.get('environment');
  const status = searchParams.get('status');

  let filtered = [...deploymentsStore];
  if (environment) filtered = filtered.filter(d => d.environment === environment);
  if (status) filtered = filtered.filter(d => d.status === status);

  filtered.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  return NextResponse.json({ data: { deployments: filtered, summary: getDeploymentsSummary() }, success: true, timestamp: new Date().toISOString() });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as CreateDeploymentInput;
  const newDeployment: Deployment = {
    id: `DEP-${uuidv4().slice(0, 6).toUpperCase()}`,
    service: body.service,
    version: body.version,
    commitHash: body.commitHash,
    environment: body.environment,
    status: 'running',
    duration: null,
    triggeredBy: 'Alex Chen',
    startedAt: new Date().toISOString(),
    completedAt: null,
    progress: 0,
    logs: [{ id: `l-${Date.now()}`, timestamp: new Date().toISOString(), level: 'info', message: `Starting deployment of ${body.service} ${body.version} to ${body.environment}...` }],
  };
  deploymentsStore.unshift(newDeployment);

  // Simulate progress
  let progress = 0;
  const interval = setInterval(() => {
    progress += 20;
    const dep = deploymentsStore.find(d => d.id === newDeployment.id);
    if (dep) {
      dep.progress = Math.min(progress, 100);
      if (progress >= 100) {
        dep.status = 'success';
        dep.completedAt = new Date().toISOString();
        dep.duration = Date.now() - new Date(dep.startedAt).getTime();
        dep.logs.push({ id: `l-${Date.now()}`, timestamp: new Date().toISOString(), level: 'info', message: 'Deployment completed successfully. All health checks passing.' });
        clearInterval(interval);
      } else {
        const messages = ['Building Docker image...', 'Running tests...', 'Pushing to registry...', 'Rolling out to pods...'];
        dep.logs.push({ id: `l-${Date.now()}`, timestamp: new Date().toISOString(), level: 'info', message: messages[Math.floor(progress / 25)] || 'Processing...' });
      }
    }
  }, 3000);

  return NextResponse.json({ data: newDeployment, success: true, timestamp: new Date().toISOString() }, { status: 201 });
}
