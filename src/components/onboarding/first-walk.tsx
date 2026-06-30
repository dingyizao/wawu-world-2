import Image from "next/image";

import type { MbtiType, WalkMode } from "../../domain/types";

export function FirstWalk({
  avatarType,
  mode,
  onArrive,
}: {
  avatarType: MbtiType;
  mode: WalkMode;
  onArrive: () => void;
}) {
  return (
    <section className="first-walk">
      <Image
        alt=""
        className="first-walk__scene"
        fill
        priority
        sizes="(max-width: 720px) 100vw, 720px"
        src="/assets/generated/scenes/onboarding-first-walk.png"
      />
      <div className="first-walk__overlay">
        <span className="status-chip">
          {mode === "real" ? "实景同行" : "训练同行 · 不记录真实位置"}
        </span>
        <div className="walking-pair" aria-label="你和 AI 分身正在同行">
          <span className="player-dot">你</span>
          <Image
            alt="AI 分身同行形态"
            height={132}
            src={`/assets/generated/avatars/${avatarType.toLowerCase()}-walk.png`}
            width={132}
          />
        </div>
        <div className="speech-card">
          <strong>我会走在你身边，但不会替你决定。</strong>
          <p>发现附近的记忆锚点时，我会先建议，由你确认是否靠近。</p>
        </div>
        <button className="primary-button" onClick={onArrive} type="button">
          一起走到第一枚碎片
        </button>
      </div>
    </section>
  );
}
