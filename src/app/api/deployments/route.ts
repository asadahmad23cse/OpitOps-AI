import { NextRequest, NextResponse } from "next/server";
import {
  deployments as mockDeployments,
  computeDeploymentsSummary,
} from "@/lib/mock-data";
import { fetchGitHubDeploymentsAsDeployments } from "@/lib/github-deployments";
import type { CreateDeploymentInput, Deployment } from "@/types";
import { v4 as uuidv4 } from "uuid";

/** User-created deployments from POST (in-memory for this server process). */
const postDeploymentBuffer: Deployment[] = [];

function isGithubConfigured(): boolean {
  const token = process.env.GITHUB_TOKEN?.trim();
  const owner = process.env.GITHUB_OWNER?.trim();
  return !!(
    token &&
    owner &&
    token !== "your_github_token_here" &&
    owner !== "your_github_username_here"
  );
}

async function loadDeploymentsList(): Promise<Deployment[]> {
  if (!isGithubConfigured()) {
    return [...postDeploymentBuffer, ...mockDeployments];
  }
  try {
    const token = process.env.GITHUB_TOKEN!.trim();
    const owner = process.env.GITHUB_OWNER!.trim();
    const fromGitHub = await fetchGitHubDeploymentsAsDeployments(owner, token);
    return [...postDeploymentBuffer, ...fromGitHub];
  } catch (e) {
    console.warn("[deployments] GitHub fetch failed, using mock data:", e);
    return [...postDeploymentBuffer, ...mockDeployments];
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const environment = searchParams.get("environment");
  const status = searchParams.get("status");

  let list = await loadDeploymentsList();

  if (environment) {
    list = list.filter((d) => d.environment.toLowerCase() === environment.toLowerCase());
  }
  if (status) {
    list = list.filter((d) => d.status === status);
  }

  list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const summary = computeDeploymentsSummary(list);

  return NextResponse.json({
    data: { deployments: list, summary },
    success: true,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateDeploymentInput;
  const newDeployment: Deployment = {
    id: `DEP-${uuidv4().slice(0, 6).toUpperCase()}`,
    service: body.service,
    version: body.version,
    commitHash: body.commitHash,
    environment: body.environment,
    status: "running",
    duration: null,
    triggeredBy: "Alex Chen",
    startedAt: new Date().toISOString(),
    completedAt: null,
    progress: 0,
    logs: [
      {
        id: `l-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: "info",
        message: `Starting deployment of ${body.service} ${body.version} to ${body.environment}...`,
      },
    ],
  };
  postDeploymentBuffer.unshift(newDeployment);

  let progress = 0;
  const interval = setInterval(() => {
    progress += 20;
    const dep = postDeploymentBuffer.find((d) => d.id === newDeployment.id);
    if (dep) {
      dep.progress = Math.min(progress, 100);
      if (progress >= 100) {
        dep.status = "success";
        dep.completedAt = new Date().toISOString();
        dep.duration = Date.now() - new Date(dep.startedAt).getTime();
        dep.logs.push({
          id: `l-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: "info",
          message: "Deployment completed successfully. All health checks passing.",
        });
        clearInterval(interval);
      } else {
        const messages = [
          "Building Docker image...",
          "Running tests...",
          "Pushing to registry...",
          "Rolling out to pods...",
        ];
        dep.logs.push({
          id: `l-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: "info",
          message: messages[Math.floor(progress / 25)] || "Processing...",
        });
      }
    }
  }, 3000);

  return NextResponse.json(
    { data: newDeployment, success: true, timestamp: new Date().toISOString() },
    { status: 201 },
  );
}
