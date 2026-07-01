"use client";

import Image from "next/image";
import { useState } from "react";

const TRAINING_ANCHORS = [
  {
    id: "teahouse",
    name: "盖碗茶铺",
    note: "训练锚点 · 不代表真实到访",
    icon: "/assets/generated/map/anchor-teahouse.png",
    position: "fallback-anchor--one",
  },
  {
    id: "park",
    name: "少城公园",
    note: "训练锚点 · 不记录真实位置",
    icon: "/assets/generated/map/anchor-park.png",
    position: "fallback-anchor--two",
  },
  {
    id: "alley",
    name: "旧巷转角",
    note: "训练锚点 · 仅供功能演示",
    icon: "/assets/generated/map/anchor-alley.png",
    position: "fallback-anchor--three",
  },
];

export function FallbackMap() {
  const [selected, setSelected] = useState(TRAINING_ANCHORS[0]);

  return (
    <div className="fallback-map" aria-label="地图降级模式">
      <Image
        alt=""
        className="fallback-map__scene"
        fill
        priority
        sizes="(max-width: 700px) 100vw, 700px"
        src="/assets/generated/scenes/fallback-chengdu-map.png"
      />
      <span className="map-mode-chip">地图降级模式</span>
      {TRAINING_ANCHORS.map((anchor) => (
        <button
          aria-label={`查看训练锚点：${anchor.name}`}
          className={`fallback-anchor ${anchor.position}`}
          key={anchor.id}
          onClick={() => setSelected(anchor)}
          type="button"
        >
          <Image alt="" height={58} src={anchor.icon} width={58} />
        </button>
      ))}
      <div className="fallback-map__note">
        <strong>{selected.name}</strong>
        <span>{selected.note}</span>
      </div>
    </div>
  );
}
