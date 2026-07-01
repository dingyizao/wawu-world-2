import type {
  MbtiFamily,
  MbtiType,
  Relationship,
} from "../domain/types";

const MODEL = "doubao-seed-2-0-mini-260215";

export type CompanionObservationContext = {
  companionName: string;
  mbti: MbtiType;
  family: MbtiFamily;
  relationship: Relationship;
  anchors: Array<{ id: string; name: string }>;
};

export type CompanionObservation = {
  line: string;
  suggestedAnchorId: string | null;
  reason: string;
  modelSource: "coze" | "safe-fallback";
};

export interface CompanionModelClient {
  generate(prompt: string): Promise<string>;
}

class CozeCompanionModelClient implements CompanionModelClient {
  async generate(prompt: string) {
    const { Config, LLMClient } = await import("coze-coding-dev-sdk");
    const client = new LLMClient(new Config({ timeout: 8_000 }));
    const response = await client.invoke(
      [
        {
          role: "system",
          content:
            "你是城市同行分身。只返回 JSON，不解释，字段为 line、suggestedAnchorId、reason。",
        },
        { role: "user", content: prompt },
      ],
      {
        model: MODEL,
        thinking: "disabled",
        temperature: 0.65,
      },
    );
    return response.content;
  }
}

const FALLBACK_LINES: Record<MbtiFamily, string> = {
  analyst: "我发现前面的街区有些结构很有意思，要一起验证一下吗？",
  diplomat: "那边好像藏着一段温柔的城市记忆，我们一起去看看吧。",
  sentinel: "这条路线更安稳，也能看到不少老成都留下的痕迹。",
  explorer: "前面有个没走过的转角，我想和你去碰一碰运气。",
};

function boundedText(value: string, length: number) {
  return Array.from(value.replace(/[\u0000-\u001f\u007f]/g, "").trim())
    .slice(0, length)
    .join("");
}

function fallback(
  context: CompanionObservationContext,
): CompanionObservation {
  const line = `${context.companionName}：${FALLBACK_LINES[context.family]}`;
  return {
    line: boundedText(line, 72),
    suggestedAnchorId: context.anchors[0]?.id ?? null,
    reason: "模型暂时不可用，已使用同人格预置观察",
    modelSource: "safe-fallback",
  };
}

function parseObservation(
  value: string,
  context: CompanionObservationContext,
): CompanionObservation | null {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (
      typeof parsed.line !== "string" ||
      typeof parsed.reason !== "string" ||
      typeof parsed.suggestedAnchorId !== "string" ||
      !context.anchors.some((anchor) => anchor.id === parsed.suggestedAnchorId)
    ) {
      return null;
    }
    const line = boundedText(parsed.line, 72);
    if (!line) {
      return null;
    }
    return {
      line,
      suggestedAnchorId: parsed.suggestedAnchorId,
      reason: boundedText(parsed.reason, 96),
      modelSource: "coze",
    };
  } catch {
    return null;
  }
}

function promptFor(context: CompanionObservationContext) {
  return JSON.stringify({
    task: "基于人格与候选地点，生成一句不超过72个汉字的同行观察",
    companion: {
      name: context.companionName,
      mbti: context.mbti,
      relationship: context.relationship,
    },
    anchors: context.anchors,
  });
}

export async function generateCompanionObservation(
  context: CompanionObservationContext,
  options: {
    client?: CompanionModelClient;
    timeoutMs?: number;
  } = {},
): Promise<CompanionObservation> {
  const client = options.client ?? new CozeCompanionModelClient();
  const timeoutMs = options.timeoutMs ?? 8_000;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    const content = await Promise.race([
      client.generate(promptFor(context)),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("MODEL_TIMEOUT")),
          timeoutMs,
        );
      }),
    ]);
    return parseObservation(content, context) ?? fallback(context);
  } catch {
    return fallback(context);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
