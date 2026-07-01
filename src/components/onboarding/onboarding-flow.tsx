"use client";

import Image from "next/image";
import { useState } from "react";

import { MBTI_CATALOG } from "../../domain/mbti";
import type { MbtiType, Relationship } from "../../domain/types";
import { CompanionPreview } from "./companion-preview";
import { FirstWalk } from "./first-walk";
import { MbtiGrid } from "./mbti-grid";
import {
  allowLocationPermission,
  canCompleteOnboarding,
  createOnboardingDraft,
  denyLocationPermission,
  recordFirstShard,
  selectCompanion,
} from "./onboarding-model";

const RELATIONSHIPS: Array<{
  id: Relationship;
  label: string;
  description: string;
}> = [
  { id: "companion", label: "同行者", description: "一起观察、一起决定" },
  { id: "mirror", label: "镜子", description: "帮我看见自己的偏好" },
  { id: "chronicler", label: "记录员", description: "替共同经历整理线索" },
  { id: "guardian", label: "守望者", description: "更重视节奏和安全提醒" },
];

const TUNING_FIELDS = [
  ["initiative", "主动建议"],
  ["expression", "表达热度"],
  ["autonomy", "自主探索"],
] as const;

export function OnboardingFlow() {
  const [draft, setDraft] = useState(createOnboardingDraft);
  const [appearanceType, setAppearanceType] = useState<MbtiType>("ENFP");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function choosePersonality(type: MbtiType) {
    setAppearanceType(type);
    setDraft((current) =>
      selectCompanion(current, type, `avatar-${type.toLowerCase()}-portrait`),
    );
  }

  function chooseAppearance(type: MbtiType) {
    setAppearanceType(type);
    setDraft((current) => ({
      ...current,
      avatarId: `avatar-${type.toLowerCase()}-portrait`,
    }));
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setDraft(denyLocationPermission);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setDraft(allowLocationPermission),
      () => setDraft(denyLocationPermission),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function finish() {
    if (!canCompleteOnboarding(draft) || !draft.mbti || !draft.avatarId) return;
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        agentName: draft.agentName,
        mbti: draft.mbti,
        avatarId: draft.avatarId,
        relationship: draft.relationship,
        tuning: draft.tuning,
      }),
    });
    if (!response.ok) {
      setSubmitting(false);
      setError("入世资料暂时没有保存成功，请再试一次。");
      return;
    }
    window.location.assign("/map");
  }

  if (draft.stage === "meet") {
    return (
      <main className="onboarding-shell onboarding-shell--hero">
        <Image
          alt="在成都街巷与 AI 分身第一次相遇"
          className="hero-scene"
          fill
          priority
          sizes="100vw"
          src="/assets/generated/scenes/onboarding-meet.png"
        />
        <section className="hero-panel">
          <span className="eyebrow">首次入世 · 1 / 7</span>
          <h1>这一次，不是独自走进城市</h1>
          <p>
            先创造一位与你并肩探索的 AI
            分身。完成第一次同行和碎片收集后，娃屋世界才会真正开启。
          </p>
          <label className="field-label" htmlFor="agent-name">
            给同行者一个名字
          </label>
          <input
            className="text-input"
            id="agent-name"
            maxLength={12}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                agentName: event.target.value,
              }))
            }
            placeholder="例如：小满"
            value={draft.agentName}
          />
          <button
            className="primary-button"
            disabled={!draft.agentName.trim()}
            onClick={() =>
              setDraft((current) => ({ ...current, stage: "mbti" }))
            }
            type="button"
          >
            开始创造分身
          </button>
          <p className="gate-note">没有游客入口；完成创建前无法进入主界面。</p>
        </section>
      </main>
    );
  }

  if (draft.stage === "mbti") {
    return (
      <main className="onboarding-shell content-shell">
        <header className="flow-header">
          <span className="eyebrow">选择性格 · 2 / 7</span>
          <h1>TA 会怎样陪你看世界？</h1>
          <p>
            先选性格内核。每一种性格都有独立外观，之后仍可“保留性格，换外观”。
          </p>
        </header>
        <MbtiGrid onSelect={choosePersonality} />
      </main>
    );
  }

  if (draft.stage === "tune" && draft.mbti) {
    return (
      <main className="onboarding-shell content-shell">
        <header className="flow-header">
          <span className="eyebrow">微调分身 · 3 / 7</span>
          <h1>保留性格，也可以换一副样子</h1>
        </header>
        <CompanionPreview
          avatarType={appearanceType}
          personalityType={draft.mbti}
        />
        <section className="tuning-panel">
          <h2>MBTI+ 细节</h2>
          {TUNING_FIELDS.map(([field, label]) => (
            <label className="range-field" key={field}>
              <span>{label}</span>
              <input
                max="1"
                min="0"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    tuning: {
                      ...current.tuning,
                      [field]: Number(event.target.value),
                    },
                  }))
                }
                step="0.05"
                type="range"
                value={draft.tuning[field]}
              />
            </label>
          ))}
        </section>
        <details className="appearance-picker">
          <summary>保留 {draft.mbti} 性格，换外观</summary>
          <div className="appearance-row">
            {MBTI_CATALOG.map((profile) => (
              <button
                aria-label={`换成 ${profile.type} 外观`}
                aria-pressed={appearanceType === profile.type}
                key={profile.type}
                onClick={() => chooseAppearance(profile.type)}
                type="button"
              >
                <Image
                  alt=""
                  height={68}
                  src={`/assets/generated/avatars/${profile.type.toLowerCase()}-portrait.png`}
                  width={68}
                />
              </button>
            ))}
          </div>
        </details>
        <button
          className="primary-button"
          onClick={() =>
            setDraft((current) => ({ ...current, stage: "relationship" }))
          }
          type="button"
        >
          确认这位同行者
        </button>
      </main>
    );
  }

  if (draft.stage === "relationship") {
    return (
      <main className="onboarding-shell content-shell narrow-shell">
        <header className="flow-header">
          <span className="eyebrow">定义关系 · 4 / 7</span>
          <h1>你希望 TA 站在什么位置？</h1>
        </header>
        <div className="relationship-grid">
          {RELATIONSHIPS.map((relationship) => (
            <button
              aria-pressed={draft.relationship === relationship.id}
              className="relationship-card"
              key={relationship.id}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  relationship: relationship.id,
                }))
              }
              type="button"
            >
              <strong>{relationship.label}</strong>
              <span>{relationship.description}</span>
            </button>
          ))}
        </div>
        <button
          className="primary-button"
          onClick={() =>
            setDraft((current) => ({ ...current, stage: "permissions" }))
          }
          type="button"
        >
          继续
        </button>
      </main>
    );
  }

  if (draft.stage === "permissions") {
    return (
      <main className="onboarding-shell content-shell narrow-shell">
        <Image
          alt=""
          className="permission-art"
          height={260}
          src="/assets/generated/map/route-badge.png"
          width={260}
        />
        <header className="flow-header">
          <span className="eyebrow">位置权限 · 5 / 7</span>
          <h1>真实同行，需要知道你从哪里出发</h1>
          <p>
            位置仅用于地图定位和附近锚点。拒绝后会进入明确标注的训练地图，不会伪造真实步行。
          </p>
        </header>
        <button className="primary-button" onClick={requestLocation} type="button">
          允许位置并开始实景同行
        </button>
        <button
          className="secondary-button"
          onClick={() => setDraft(denyLocationPermission)}
          type="button"
        >
          暂不授权，使用训练同行
        </button>
      </main>
    );
  }

  if (draft.stage === "first-walk" && draft.walkMode && draft.mbti) {
    return (
      <main className="onboarding-shell content-shell">
        <span className="eyebrow">第一次同行 · 6 / 7</span>
        <FirstWalk
          avatarType={appearanceType}
          mode={draft.walkMode}
          onArrive={() =>
            setDraft((current) => ({ ...current, stage: "first-shard" }))
          }
        />
      </main>
    );
  }

  if (draft.stage === "first-shard") {
    return (
      <main className="onboarding-shell content-shell narrow-shell shard-step">
        <span className="eyebrow">第一枚记忆 · 7 / 7</span>
        <h1>由你确认，收下第一枚碎片</h1>
        <p>分身可以发现和建议，但真正的收集动作始终属于你。</p>
        <button
          className="shard-button"
          onClick={() => setDraft(recordFirstShard)}
          type="button"
        >
          <Image
            alt="发光的记忆碎片"
            height={240}
            src="/assets/generated/map/memory-shard-glow.png"
            width={240}
          />
          <span>亲手收集</span>
        </button>
      </main>
    );
  }

  return (
    <main className="onboarding-shell content-shell narrow-shell complete-step">
      <Image
        alt="你和分身完成第一次同行"
        className="completion-scene"
        height={390}
        priority
        src="/assets/generated/scenes/walk-recap.png"
        width={694}
      />
      <span className="eyebrow">入世完成</span>
      <h1>城市已经记住了你们的第一步</h1>
      <p>主界面即将开启。之后所有藏品会进入“我的娃屋”储物柜。</p>
      {error ? <p className="error-message">{error}</p> : null}
      <button
        className="primary-button"
        disabled={submitting || !canCompleteOnboarding(draft)}
        onClick={finish}
        type="button"
      >
        {submitting ? "正在开启世界…" : "进入娃屋世界"}
      </button>
    </main>
  );
}
