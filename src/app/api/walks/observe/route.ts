import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getMbtiProfile } from "../../../../domain/mbti";
import { observeWalk } from "../../../../domain/walk";
import { generateCompanionObservation } from "../../../../server/companion-ai";
import { authenticatedUserId } from "../../../../server/session";
import { getGameRepository } from "../../../../server/storage";

const CANDIDATES = [
  {
    id: "park",
    name: "少城公园",
    tags: ["nature", "quiet", "neighborhoods"],
    distance: 320,
  },
  {
    id: "teahouse",
    name: "盖碗茶铺",
    tags: ["food", "tradition", "social"],
    distance: 180,
  },
  {
    id: "old-alley",
    name: "旧巷转角",
    tags: ["history", "hidden-patterns", "unexpected"],
    distance: 460,
  },
];

export async function POST(request: Request) {
  const repository = getGameRepository();
  const userId = await authenticatedUserId(repository, await cookies());
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const state = await repository.getState(userId);
  if (!state?.agent) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  const sessionId =
    input && typeof input === "object" && "sessionId" in input
      ? input.sessionId
      : null;
  const session = state.walks.find(
    (walk) => walk.id === sessionId && walk.status === "active",
  );
  if (!session) {
    return NextResponse.json({ error: "WALK_NOT_ACTIVE" }, { status: 409 });
  }

  const profile = getMbtiProfile(state.agent.mbti);
  const observation = observeWalk({
    session: {
      id: session.id,
      mode: session.mode,
      startedAt: session.startedAt,
      canCreateRealCheckIn: session.mode === "real",
    },
    profile,
    candidates: CANDIDATES,
  });
  const rankedAnchors = observation.rankedAnchors.slice(0, 3);
  const suggestion = await generateCompanionObservation({
    companionName: state.agent.name,
    mbti: state.agent.mbti,
    family: profile.family,
    relationship: state.agent.relationship,
    anchors: rankedAnchors.map(({ id, name }) => ({ id, name })),
  });

  return NextResponse.json({ suggestion, rankedAnchors });
}
