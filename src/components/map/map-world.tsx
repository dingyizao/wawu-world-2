"use client";

import { useState } from "react";

import { AmapSurface } from "./amap-surface";
import { WalkCompanion } from "./walk-companion";

export function MapWorld({
  companionName,
  initialMemoryShards,
  walkAssetPath,
}: {
  companionName: string;
  initialMemoryShards: number;
  walkAssetPath: string;
}) {
  const [memoryShards, setMemoryShards] = useState(initialMemoryShards);

  return (
    <main className="world-shell">
      <header className="world-header">
        <div>
          <span className="eyebrow">今日同行</span>
          <h1>你和{companionName}，正在同一座城里</h1>
        </div>
        <div className="shard-balance" aria-label="记忆碎片余额">
          <span>记忆碎片</span>
          <strong>{memoryShards}</strong>
        </div>
      </header>

      <section className="map-card" aria-label="同行地图">
        <AmapSurface
          companionName={companionName}
          walkAssetPath={walkAssetPath}
        />
        <WalkCompanion
          companionName={companionName}
          onWalletChange={setMemoryShards}
        />
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
