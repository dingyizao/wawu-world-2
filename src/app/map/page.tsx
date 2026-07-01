import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AmapSurface } from "../../components/map/amap-surface";
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
    <main className="world-shell">
      <header className="world-header">
        <div>
          <span className="eyebrow">今日同行</span>
          <h1>你和{agent.name}，正在同一座城里</h1>
        </div>
        <div className="shard-balance" aria-label="记忆碎片余额">
          <span>记忆碎片</span>
          <strong>{result.body.wallet.memoryShards}</strong>
        </div>
      </header>

      <section className="map-card" aria-label="同行地图">
        <AmapSurface
          companionName={agent.name}
          walkAssetPath={walkAssetPath}
        />
        <div className="companion-whisper">
          <strong>{agent.name}</strong>
          <p>我会和你保持一步的距离。要不要去看看附近有什么故事？</p>
        </div>
      </section>

      <nav className="world-nav" aria-label="主要功能">
        <span aria-current="page">同行</span>
        <span>碎片</span>
        <span>创造</span>
        <span>娃屋</span>
      </nav>
    </main>
  );
}
