"use client";

import { useState } from "react";

export function ResetExperienceButton({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reset() {
    if (
      !window.confirm(
        "重置后会清除当前分身、碎片、娃屋物品和同行记录，并回到创建分身流程。是否继续？",
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/reset", { method: "POST" });
      if (!response.ok) {
        throw new Error("RESET_FAILED");
      }
      window.location.assign("/onboarding");
    } catch {
      setError("重置失败，请稍后重试。");
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "reset-experience reset-experience--compact" : "reset-experience"}>
      <button disabled={busy} onClick={reset} type="button">
        {busy ? "正在重置…" : "重置体验"}
      </button>
      {error ? <span>{error}</span> : null}
    </div>
  );
}
