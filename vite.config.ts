import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const openCodeProviderId = "cloudflare-ai-gateway";
const fallbackModel = "@cf/moonshotai/kimi-k2.7-code";

type JsonObject = Record<string, unknown>;

type Phase0AiRecord = {
  id: string;
  rawText: string;
  sourceType: string;
  updatedAt: string;
  verificationStatus: string;
};

type OpenCodeProviderConfig = {
  models?: JsonObject;
  name?: string;
  options?: {
    apiKey?: string;
    baseURL?: string;
    headers?: JsonObject;
  };
};

type OpenCodeConfig = {
  provider?: Record<string, OpenCodeProviderConfig>;
};

class Phase0AiProxyError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
  ) {
    super(message);
  }
}

function phase0AiProxyPlugin(): Plugin {
  return {
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(
        "/api/phase0/ai-organize",
        async (request, response) => {
          if (request.method !== "POST") {
            sendJson(response, 405, {
              error: "AI e化整理服務只接受 POST 作業。",
            });
            return;
          }

          try {
            const body = parseJsonObject(await readBody(request));
            const record = parsePhase0AiRecord(body.record);
            const provider = await readCloudflareAiGatewayConfig();
            const model = firstModelName(provider.models) ?? fallbackModel;
            const content = await requestAiDraft(provider, model, record);
            const patch = normalizeAiDraftPatch(
              parseAiJsonContent(content),
              record,
            );

            sendJson(response, 200, {
              model,
              notice: "AI 建議已送入工作台草稿，請人工確認後再列管。",
              patch,
            });
          } catch (error) {
            const statusCode =
              error instanceof Phase0AiProxyError ? error.statusCode : 500;
            const message =
              error instanceof Error
                ? error.message
                : "AI e化整理服務發生未明錯誤。";

            sendJson(response, statusCode, { error: message });
          }
        },
      );
    },
    name: "phase0-local-ai-proxy",
  };
}

async function readBody(request: IncomingMessage): Promise<string> {
  return await new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += String(chunk);

      if (body.length > 80_000) {
        reject(new Phase0AiProxyError("AI 整理請求內容過大。", 413));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", () =>
      reject(new Phase0AiProxyError("無法讀取 AI 整理請求內容。", 400)),
    );
  });
}

async function readCloudflareAiGatewayConfig(): Promise<OpenCodeProviderConfig> {
  const configPath = join(homedir(), ".config", "opencode", "opencode.json");
  let config: OpenCodeConfig;

  try {
    config = JSON.parse(await readFile(configPath, "utf8")) as OpenCodeConfig;
  } catch {
    throw new Phase0AiProxyError(
      "找不到本機 opencode AI 設定，請確認 ~/.config/opencode/opencode.json。",
      503,
    );
  }

  const provider = config.provider?.[openCodeProviderId];
  if (!provider?.options?.apiKey || !provider.options.baseURL) {
    throw new Phase0AiProxyError(
      "opencode 的 Cloudflare AI Gateway 設定不完整，缺少 apiKey 或 baseURL。",
      503,
    );
  }

  return provider;
}

async function requestAiDraft(
  provider: OpenCodeProviderConfig,
  model: string,
  record: Phase0AiRecord,
): Promise<string> {
  const providerOptions = provider.options;
  const baseUrl = providerOptions?.baseURL?.replace(/\/+$/, "");
  const apiKey = providerOptions?.apiKey;

  if (!baseUrl || !apiKey) {
    throw new Phase0AiProxyError("AI Gateway 設定不完整，無法辦理。", 503);
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    body: JSON.stringify({
      messages: [
        {
          content:
            "你是 Phase 0 教學用的災害資訊整理助理。只能根據使用者提供的原始資訊整理草稿，不得補真實地址、電話、人物資料、地圖資訊或外部事實。不要把 AI 產物寫成已查核事實。請只輸出 JSON 物件。",
          role: "system",
        },
        {
          content: createAiPrompt(record),
          role: "user",
        },
      ],
      model,
      temperature: 0.1,
    }),
    headers: {
      ...stringHeaders(providerOptions?.headers),
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Phase0AiProxyError(
      `AI Gateway 回應失敗（HTTP ${response.status}），請檢查 opencode 設定或稍後再試。`,
      502,
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  const content = extractOpenAiText(payload);
  if (!content) {
    throw new Phase0AiProxyError("AI Gateway 未回傳可讀取的草稿內容。", 502);
  }

  return content;
}

function createAiPrompt(record: Phase0AiRecord): string {
  return `請把以下 Phase 0 原始資訊整理成工作台草稿。請遵守：
- 只使用原文可見內容。
- 不得查外部資料，不得補地址、電話、人物身分或救災判斷。
- verificationStatus 不是 verified 時，請保留人工確認與不可直接行動的提醒。
- unsafeToActDirectly 在本課程原型中請輸出 true。
- title 請用「${record.id} + 短標題」格式。

請輸出純 JSON，欄位如下：
{
  "title": "string",
  "summary": "string",
  "possibleKind": "help_request_candidate | site_status_candidate | task_candidate | assignment_candidate | announcement_candidate | unknown",
  "confidence": "low | medium | high",
  "actorRelation": "self | field_volunteer | third_party | unknown",
  "suggestedNextStep": "keep_raw | ask_for_more_info | send_to_human_review | create_candidate_report | create_site_update_suggestion | do_not_use_yet",
  "unsafeToActDirectly": true,
  "humanReviewNote": "string"
}

原始資訊：
案號：${record.id}
來源類型：${record.sourceType}
查核狀態：${record.verificationStatus}
更新時間：${record.updatedAt}
原文：${record.rawText}`;
}

function parseJsonObject(text: string): JsonObject {
  try {
    const value: unknown = JSON.parse(text);
    if (isJsonObject(value)) {
      return value;
    }
  } catch {
    // fall through
  }

  throw new Phase0AiProxyError("AI 整理請求不是有效 JSON。", 400);
}

function parsePhase0AiRecord(value: unknown): Phase0AiRecord {
  if (!isJsonObject(value)) {
    throw new Phase0AiProxyError("AI 整理請求缺少原始資訊。", 400);
  }

  const record = {
    id: stringValue(value.id),
    rawText: stringValue(value.rawText),
    sourceType: stringValue(value.sourceType),
    updatedAt: stringValue(value.updatedAt),
    verificationStatus: stringValue(value.verificationStatus),
  };

  if (!record.id || !record.rawText) {
    throw new Phase0AiProxyError("AI 整理請求缺少案號或原文。", 400);
  }

  return record;
}

function parseAiJsonContent(content: string): JsonObject {
  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/u, "")
    .trim();

  try {
    const value: unknown = JSON.parse(withoutFence);
    if (isJsonObject(value)) {
      return value;
    }
  } catch {
    // Try to recover when the model wrapped the JSON in short prose.
  }

  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const value: unknown = JSON.parse(withoutFence.slice(start, end + 1));
    if (isJsonObject(value)) {
      return value;
    }
  }

  throw new Phase0AiProxyError("AI 回傳內容不是可套用的 JSON 草稿。", 502);
}

function normalizeAiDraftPatch(input: JsonObject, record: Phase0AiRecord) {
  const humanReviewNote =
    limitedText(input.humanReviewNote, 520) ||
    "AI 僅依原文整理草稿，請人工確認來源、時間、地點、同意與是否仍有效。";

  return {
    actorRelation: enumValue(
      input.actorRelation,
      ["self", "field_volunteer", "third_party", "unknown"],
      "unknown",
    ),
    confidence: enumValue(input.confidence, ["low", "medium", "high"], "low"),
    humanReviewNote: `${humanReviewNote}\nAI 草稿未經人工確認，不得視為已查核事實。`,
    possibleKind: enumValue(
      input.possibleKind,
      [
        "help_request_candidate",
        "site_status_candidate",
        "task_candidate",
        "assignment_candidate",
        "announcement_candidate",
        "unknown",
      ],
      "unknown",
    ),
    suggestedNextStep: enumValue(
      input.suggestedNextStep,
      [
        "keep_raw",
        "ask_for_more_info",
        "send_to_human_review",
        "create_candidate_report",
        "create_site_update_suggestion",
        "do_not_use_yet",
      ],
      record.verificationStatus === "verified"
        ? "keep_raw"
        : "send_to_human_review",
    ),
    summary:
      limitedText(input.summary, 620) ||
      "AI 未能產生可靠摘要，請由人工依原文重新整理。",
    title: limitedText(input.title, 72) || `${record.id} AI 整理草稿`,
    unsafeToActDirectly: true,
  };
}

function extractOpenAiText(payload: unknown): string {
  if (!isJsonObject(payload)) {
    return "";
  }

  const choices = payload.choices;
  if (!Array.isArray(choices)) {
    return "";
  }

  const firstChoice = choices[0];
  if (!isJsonObject(firstChoice) || !isJsonObject(firstChoice.message)) {
    return "";
  }

  const content = firstChoice.message.content;
  return typeof content === "string" ? content : "";
}

function firstModelName(models: JsonObject | undefined): string | undefined {
  if (!models) {
    return undefined;
  }

  return Object.keys(models)[0];
}

function stringHeaders(
  headers: JsonObject | undefined,
): Record<string, string> {
  if (!headers) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(headers)
      .filter(([, value]) => typeof value === "string")
      .map(([key, value]) => [key, value as string]),
  );
}

function enumValue<const T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && options.includes(value as T)
    ? (value as T)
    : fallback;
}

function limitedText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: JsonObject,
) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

export default defineConfig({
  plugins: [react(), phase0AiProxyPlugin()],
  base: repoName ? `/${repoName}/` : "/",
});
