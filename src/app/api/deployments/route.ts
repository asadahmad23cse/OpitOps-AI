import { NextRequest, NextResponse } from "next/server";
import { createLiveDeployment, getLiveDeployments } from "@/lib/live-data";
import type { CreateDeploymentInput, Deployment } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const { deployments, summary } = await getLiveDeployments({
    environment: searchParams.get("environment"),
    status: searchParams.get("status"),
  });

  return NextResponse.json({
    data: { deployments, summary },
    success: true,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateDeploymentInput;
  const newDeployment: Deployment = await createLiveDeployment(body);

  return NextResponse.json(
    { data: newDeployment, success: true, timestamp: new Date().toISOString() },
    { status: 201 },
  );
}
