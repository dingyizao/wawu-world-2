import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getStateResponse } from "../../../server/api";
import { getGameRepository } from "../../../server/storage";

export async function GET() {
  const result = await getStateResponse(
    getGameRepository(),
    await cookies(),
  );
  return NextResponse.json(result.body, { status: result.status });
}
