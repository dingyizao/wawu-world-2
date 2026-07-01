"use client";

import { useState } from "react";
import Link from "next/link";

import { AmapSurface } from "./amap-surface";
import { WalkCompanion } from "./walk-companion";

export function MapWorld({
  amapJsKey,
  companionName,
  initialMemoryShards,
  walkAssetPath,
}: {
  amapJsKey: string;
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
          amapJsKey={amapJsKey}
          companionName={companionName}
          onWalletChange={setMemoryShards}
          walkAssetPath={walkAssetPath}
        />
        <WalkCompanion
          companionName={companionName}
          onWalletChange={setMemoryShards}
        />
      </section>

      <nav className="world-nav" aria-label="主要功能">
        <Link aria-current="page" href="/map" prefetch={false}>同行</Link>
        <Link href="/agent" prefetch={false}>分身</Link>
        <Link href="/agent/creation" prefetch={false}>创造</Link>
        <Link href="/house" prefetch={false}>娃屋</Link>
      </nav>
    </main>
  );
}
