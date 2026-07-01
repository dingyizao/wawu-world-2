import { NextResponse } from "next/server";

import { inspectHealth } from "../../../server/health";

export function GET() {
  const health = inspectHealth();
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
