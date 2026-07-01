"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CompanionSuggestion } from "./companion-suggestion";
import { WalkRecap } from "./walk-recap";

type Session = {
  id: string;
  mode: "real" | "training";
};

type Suggestion = {
  line: string;
  suggestedAnchorId: string | null;
  reason: string;
  modelSource: "coze" | "safe-fallback";
};

type Recap = {
  steps: number;
  training: boolean;
};

const TRAINING_ROUTE = [
  [104.06, 30.66],
  [104.061, 30.661],
  [104.062, 30.662],
  [104.063, 30.663],
  [104.064, 30.664],
].map(([longitude, latitude], index) => ({
  longitude,
  latitude,
  recordedAt: new Date(Date.UTC(2026, 6, 1, 1, index)).toISOString(),
}));

export function WalkCompanion({
  companionName,
  onWalletChange,
}: {
  companionName: string;
  onWalletChange: (balance: number) => void;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [steps, setSteps] = useState(0);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [reward, setReward] = useState<{
    name: string;
    assetPath: string;
  } | null>(null);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [earnedShards, setEarnedShards] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) {
      return;
    }
    const timer = window.setInterval(() => {
      setSteps((value) => value + (session.mode === "training" ? 24 : 1));
    }, 1200);
    return () => window.clearInterval(timer);
  }, [session]);

  async function start(mode: Session["mode"]) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/walks/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode,
          locationConsent: mode === "real",
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "WALK_START_FAILED");
      }
      setSession(body.session);
      setSteps(mode === "training" ? 328 : 0);
      setSuggestion(null);
      setAccepted(false);
      setReward(null);
      setRecap(null);
    } catch {
      setError("同行暂时无法开始，请稍后再试。");
    } finally {
      setBusy(false);
    }
  }

  async function observe() {
    if (!session) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/walks/observe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "OBSERVE_FAILED");
      }
      setSuggestion(body.suggestion);
      setAccepted(false);
    } catch {
      setError("分身暂时没有新的发现，可以继续同行。");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!session) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/walks/finish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          steps,
          route: session.mode === "training" ? TRAINING_ROUTE : [],
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "WALK_FINISH_FAILED");
      }
      setRecap(body.recap);
      setEarnedShards(body.earnedShards);
      onWalletChange(body.memoryShards);
    } catch {
      setError("这次同行还没有成功结算，请重试。");
    } finally {
      setBusy(false);
    }
  }

  async function checkIn() {
    if (!session || !suggestion?.suggestedAnchorId) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/anchors/check-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          anchorId: suggestion.suggestedAnchorId,
          walkId: session.id,
          mode: session.mode,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "CHECK_IN_FAILED");
      }
      setReward(body.item);
    } catch {
      setError(
        session.mode === "real"
          ? "真实打卡需在地点 120 米内；可改用训练同行演示。"
          : "训练打卡暂时失败，请稍后重试。",
      );
    } finally {
      setBusy(false);
    }
  }

  if (recap) {
    return (
      <WalkRecap
        earnedShards={earnedShards}
        onClose={() => {
          setSession(null);
          setRecap(null);
        }}
        steps={recap.steps}
        training={recap.training}
      />
    );
  }

  if (!session) {
    return (
      <section className="walk-console">
        <strong>{companionName}就在你的定位光点旁边</strong>
        <p>真实同行记录实际位置；训练同行只演示玩法，不生成真实打卡。</p>
        <div className="walk-start-actions">
          <button disabled={busy} onClick={() => start("real")} type="button">
            开始真实同行
          </button>
          <button disabled={busy} onClick={() => start("training")} type="button">
            开始训练同行
          </button>
        </div>
        {error ? <p className="error-message">{error}</p> : null}
      </section>
    );
  }

  return (
    <section className="walk-console walk-console--active">
      <div className="walk-status-row">
        <span className="status-chip">
          {session.mode === "training" ? "训练同行 · 非真实打卡" : "真实同行"}
        </span>
        <strong>{steps} 步</strong>
      </div>
      {reward ? (
        <div className="reward-note">
          <strong>获得：{reward.name}</strong>
          <span>训练所得已放入储物柜，不会标记为真实到访。</span>
          <Link href="/house" prefetch={false}>打开我的娃屋</Link>
        </div>
      ) : accepted ? (
        <p className="accepted-note">
          你决定和{companionName}一起去看看。地点执行仍由你确认。
        </p>
      ) : null}
      {suggestion && !accepted ? (
        <CompanionSuggestion
          onAccept={() => setAccepted(true)}
          onReject={() => setSuggestion(null)}
          suggestion={suggestion}
        />
      ) : (
        <button
          className="secondary-button"
          disabled={busy}
          onClick={observe}
          type="button"
        >
          听听{companionName}发现了什么
        </button>
      )}
      {accepted && !reward ? (
        <button
          className="secondary-button"
          disabled={busy}
          onClick={checkIn}
          type="button"
        >
          {session.mode === "training" ? "完成训练打卡" : "确认到场打卡"}
        </button>
      ) : null}
      <button className="primary-button" disabled={busy} onClick={finish} type="button">
        结束同行并生成回顾
      </button>
      {error ? <p className="error-message">{error}</p> : null}
    </section>
  );
}
