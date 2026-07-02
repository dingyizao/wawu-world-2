import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { resetCurrentUser } from "../../../../server/api";
import { getGameRepository } from "../../../../server/storage";

export async function POST() {
  const result = await resetCurrentUser(
    getGameRepository(),
    await cookies(),
  );
  return NextResponse.json(result.body, { status: result.status });
}
