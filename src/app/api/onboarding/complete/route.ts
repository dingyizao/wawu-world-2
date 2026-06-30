import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { completeOnboarding } from "../../../../server/api";
import { getGameRepository } from "../../../../server/storage";

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_INPUT" },
      { status: 400 },
    );
  }

  const result = await completeOnboarding(
    getGameRepository(),
    await cookies(),
    input,
  );
  return NextResponse.json(result.body, { status: result.status });
}
