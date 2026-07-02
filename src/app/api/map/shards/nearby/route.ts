import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  parseNearbyInput,
  refreshMapShards,
} from "../../../../../server/map-shards";
import { authenticatedUserId } from "../../../../../server/session";
import { getGameRepository } from "../../../../../server/storage";

export async function POST(request: Request) {
  const repository = getGameRepository();
  const userId = await authenticatedUserId(repository, await cookies());
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  const parsed = parseNearbyInput(input);
  if (!parsed) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await refreshMapShards(repository, userId, parsed),
    );
  } catch (error) {
    const code =
      error instanceof Error ? error.message : "REFRESH_MAP_SHARDS_FAILED";
    return NextResponse.json({ error: code }, { status: 409 });
  }
}
