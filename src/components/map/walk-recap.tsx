import Image from "next/image";

export function WalkRecap({
  steps,
  earnedShards,
  training,
  stepSource,
  onClose,
}: {
  steps: number;
  earnedShards: number;
  training: boolean;
  stepSource: "motion" | "gps-estimate" | "training";
  onClose: () => void;
}) {
  return (
    <article className="walk-recap">
      <Image
        alt=""
        height={360}
        src="/assets/generated/scenes/walk-recap.png"
        width={640}
      />
      <span className="model-source">
        {training ? "训练同行回顾" : "真实同行回顾"}
      </span>
      <h2>这一段路，我们一起记住了</h2>
      <div className="recap-stats">
        <span><strong>{steps}</strong> 步</span>
        <span><strong>+{earnedShards}</strong> 记忆碎片</span>
      </div>
      <p>
        计步来源：
        {stepSource === "motion"
          ? "运动传感器"
          : stepSource === "gps-estimate"
            ? "GPS 距离估算"
            : "训练模拟"}
      </p>
      <p>
        起点和终点附近的路线已自动模糊，只保留中段用于这次共同回顾。
      </p>
      <button className="primary-button" onClick={onClose} type="button">
        收好这段记忆
      </button>
    </article>
  );
}
