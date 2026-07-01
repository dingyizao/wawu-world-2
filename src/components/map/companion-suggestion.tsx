type Suggestion = {
  line: string;
  suggestedAnchorId: string | null;
  reason: string;
  modelSource: "coze" | "safe-fallback";
};

export function CompanionSuggestion({
  suggestion,
  onAccept,
  onReject,
}: {
  suggestion: Suggestion;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <article className="companion-suggestion">
      <span className="model-source">
        {suggestion.modelSource === "coze"
          ? "Coze 原生模型生成"
          : "模型失败 · 已降级为预置结果"}
      </span>
      <p>{suggestion.line}</p>
      <small>{suggestion.reason}</small>
      <div className="suggestion-actions">
        <button onClick={onReject} type="button">先不去</button>
        <button onClick={onAccept} type="button">一起去看看</button>
      </div>
    </article>
  );
}
