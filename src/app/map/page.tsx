import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MapWorld } from "../../components/map/map-world";
import { getStateResponse } from "../../server/api";
import { getGameRepository } from "../../server/storage";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const result = await getStateResponse(
    getGameRepository(),
    await cookies(),
  );
  if (result.status !== 200 || !result.body.agent) {
    redirect("/onboarding");
  }

  const agent = result.body.agent;
  const walkAssetPath = `/assets/generated/avatars/${agent.walkAssetId
    .replace("avatar-", "")
    .replace("-walk", "")}-walk.png`;

  return (
    <MapWorld
      amapJsKey={process.env.NEXT_PUBLIC_AMAP_JS_KEY ?? ""}
      companionName={agent.name}
      initialMemoryShards={result.body.wallet.memoryShards}
      walkAssetPath={walkAssetPath}
    />
  );
}
