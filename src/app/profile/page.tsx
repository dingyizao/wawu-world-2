import Link from "next/link";

import { MobileShell } from "../../components/mobile-shell";

export default function ProfilePage() {
  return (
    <MobileShell active="/agent">
      <header className="showcase-header">
        <span className="eyebrow">隐私与账户</span>
        <h1>你决定什么可以被记住</h1>
      </header>
      <div className="report-list">
        <article><strong>位置隐私</strong><p>路线起点和终点默认模糊；训练同行不记录真实位置。</p></article>
        <article><strong>操作账本</strong><p>每次碎片获得与消耗都有唯一动作记录。</p></article>
        <article><strong>账户恢复与导出</strong><p>完整能力将在正式版开放，本页为浅层演示。</p></article>
      </div>
      <div className="feature-links"><Link href="/agent">返回我的分身</Link></div>
    </MobileShell>
  );
}
