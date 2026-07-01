import Image from "next/image";

import { MobileShell } from "../../../components/mobile-shell";

export default function ReportPage() {
  return (
    <MobileShell active="/agent">
      <header className="showcase-header">
        <span className="eyebrow">今日记忆日报</span>
        <h1>你们把一段普通的路，走成了共同记忆</h1>
        <p>演示内容 · 模型不可用时使用经过审核的同人格模板。</p>
      </header>
      <Image
        alt=""
        className="showcase-scene"
        height={520}
        src="/assets/generated/scenes/daily-report.png"
        width={760}
      />
      <div className="report-list">
        <article><strong>同行</strong><p>你们完成了一次训练散步，真实位置未被记录。</p></article>
        <article><strong>发现</strong><p>小满注意到了公园与旧街之间的生活气息。</p></article>
        <article><strong>收获</strong><p>新的虚拟物品已放入娃屋储物柜。</p></article>
      </div>
    </MobileShell>
  );
}
