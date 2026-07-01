import Link from "next/link";

import { MobileShell } from "../../components/mobile-shell";

export default function ChallengesPage() {
  return (
    <MobileShell active="/map">
      <header className="showcase-header">
        <span className="eyebrow">本周挑战 · 演示内容</span>
        <h1>和分身完成三次不同节奏的同行</h1>
      </header>
      <div className="report-list">
        <article><strong>晨间 500 步</strong><p>训练记录 1/1 · 已完成</p></article>
        <article><strong>发现两个城市锚点</strong><p>训练记录 1/2 · 进行中</p></article>
        <article><strong>收下一张城市明信片</strong><p>0/1 · 未开始</p></article>
      </div>
      <div className="feature-links"><Link href="/map">继续同行</Link></div>
    </MobileShell>
  );
}
