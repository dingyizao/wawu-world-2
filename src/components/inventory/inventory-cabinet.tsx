"use client";

import Image from "next/image";
import { useState } from "react";

import {
  CABINET_CATEGORIES,
  type ItemCategory,
  type InventoryDisplayItem,
  cabinetWindows,
  itemProvenance,
} from "../../domain/inventory";

export function InventoryCabinet({
  items,
}: {
  items: InventoryDisplayItem[];
}) {
  const [category, setCategory] = useState<ItemCategory>(
    items[0]?.category ?? "furniture",
  );
  const windows = cabinetWindows(items);
  const activeWindow = windows.find((window) => window.category === category);
  const visible = items.filter((item) => item.category === category);

  return (
    <>
      <section className="cabinet-window-board" aria-label="四类储物展示窗">
        {windows.map((window) => (
          <button
            aria-pressed={category === window.category}
            className="cabinet-window"
            key={window.category}
            onClick={() => setCategory(window.category)}
            type="button"
          >
            <span>{window.label}</span>
            <strong>{window.count}</strong>
            {window.featuredItem ? (
              <Image
                alt=""
                height={112}
                src={window.featuredItem.assetPath}
                width={112}
              />
            ) : (
              <Image
                alt=""
                height={112}
                src="/assets/generated/scenes/empty-storage.png"
                width={112}
              />
            )}
          </button>
        ))}
      </section>
      {activeWindow ? (
        <section className="cabinet-detail-window" aria-live="polite">
          <div>
            <span className="eyebrow">{activeWindow.label}</span>
            <h2>
              {activeWindow.count > 0
                ? `已收纳 ${activeWindow.count} 件`
                : "这一格等待第一件藏品"}
            </h2>
            <p>{activeWindow.description}</p>
          </div>
          {activeWindow.featuredItem ? (
            <Image
              alt=""
              height={180}
              src={activeWindow.featuredItem.assetPath}
              width={180}
            />
          ) : null}
        </section>
      ) : null}
      <div className="cabinet-filters">
        {CABINET_CATEGORIES.map((filter) => (
          <button
            aria-pressed={category === filter.id}
            key={filter.id}
            onClick={() => setCategory(filter.id)}
            type="button"
          >
            {filter.shortLabel}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="empty-cabinet">
          <Image
            alt=""
            height={360}
            src="/assets/generated/scenes/empty-storage.png"
            width={640}
          />
          <strong>这一格还空着</strong>
          <p>去同行、打卡或让分身创造一个新物件。</p>
        </div>
      ) : (
        <div className="inventory-grid">
          {visible.map((item) => (
            <article className="inventory-card" key={item.instanceId}>
              <Image alt="" height={220} src={item.assetPath} width={220} />
              <span>{item.rarity}</span>
              <h2>{item.name}</h2>
              <p>{itemProvenance(item.sourceActionId)}</p>
              <button type="button">放到展示格</button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
