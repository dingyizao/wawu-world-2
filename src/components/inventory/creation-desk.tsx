"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { ItemDefinition } from "../../domain/inventory";

export function CreationDesk({ balance }: { balance: number }) {
  const [prompt, setPrompt] = useState("");
  const [currentBalance, setCurrentBalance] = useState(balance);
  const [result, setResult] = useState<{
    item: ItemDefinition;
    modelSource: "coze" | "safe-fallback";
    note: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/creation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error);
      }
      setResult(body);
      setCurrentBalance(body.memoryShards);
    } catch {
      setError(
        currentBalance < 5
          ? "记忆碎片不足，先去完成一次同行。"
          : "这次创造没有完成，碎片不会扣除。",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="creation-desk">
      <Image
        alt=""
        height={420}
        src="/assets/generated/scenes/creation-desk.png"
        width={760}
      />
      <div className="creation-desk__panel">
        <span className="status-chip">余额 {currentBalance} · 每次消耗 5</span>
        <label className="field-label" htmlFor="creation-prompt">
          告诉分身，你想留下什么
        </label>
        <input
          className="text-input"
          id="creation-prompt"
          maxLength={80}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="例如：把今天的风做成一只小灯笼"
          value={prompt}
        />
        <button
          className="primary-button"
          disabled={busy || !prompt.trim()}
          onClick={create}
          type="button"
        >
          和分身一起创造
        </button>
        {error ? <p className="error-message">{error}</p> : null}
        {result ? (
          <article className="creation-result">
            <Image alt="" height={180} src={result.item.assetPath} width={180} />
            <div>
              <span className="model-source">
                {result.modelSource === "coze"
                  ? "Coze 原生模型生成"
                  : "模型失败 · 已降级到预置结果"}
              </span>
              <h2>{result.item.name}</h2>
              <p>{result.note}</p>
              <Link href="/house">去储物柜查看</Link>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
