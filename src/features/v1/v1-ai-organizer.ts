import { z } from "zod";
import type {
  Phase0PossibleKind,
  Phase0SuggestedNextStep,
} from "../phase-0/phase0-types";
import type { V1CombinedRecord, V1RawClarity, V1ReviewDraft } from "./v1-types";

const v1AiDraftPatchSchema = z.object({
  candidateKind: z.enum([
    "help_request_candidate",
    "site_status_candidate",
    "task_candidate",
    "assignment_candidate",
    "announcement_candidate",
    "unknown",
  ]),
  decisionReason: z.string().min(1),
  humanReviewNote: z.string().min(1),
  rawClarity: z.enum(["unclear", "brief", "clear"]),
  reviewState: z.enum(["needs_review", "candidate_draft", "do_not_use_yet"]),
  suggestedNextStep: z.enum([
    "keep_raw",
    "ask_for_more_info",
    "send_to_human_review",
    "create_candidate_report",
    "create_site_update_suggestion",
    "do_not_use_yet",
  ]),
  summary: z.string().min(1),
  unsafeToActDirectly: z.boolean(),
});

const v1AiOrganizerResponseSchema = z.object({
  model: z.string().optional(),
  notice: z.string().optional(),
  patch: v1AiDraftPatchSchema,
});

const v1AiOrganizerErrorSchema = z.object({
  error: z.string(),
});

export type V1AiDraftPatch = Pick<
  V1ReviewDraft,
  | "candidateKind"
  | "decisionReason"
  | "humanReviewNote"
  | "rawClarity"
  | "reviewState"
  | "suggestedNextStep"
  | "summary"
  | "unsafeToActDirectly"
>;

export type V1AiOrganizerResponse = {
  model?: string;
  notice?: string;
  patch: {
    candidateKind: Phase0PossibleKind;
    decisionReason: string;
    humanReviewNote: string;
    rawClarity: V1RawClarity;
    reviewState: V1ReviewDraft["reviewState"];
    suggestedNextStep: Phase0SuggestedNextStep;
    summary: string;
    unsafeToActDirectly: boolean;
  };
};

export async function requestV1AiDraft(
  record: V1CombinedRecord,
): Promise<V1AiOrganizerResponse> {
  const response = await fetch("/api/v1/ai-organize", {
    body: JSON.stringify({ record }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = v1AiOrganizerErrorSchema.safeParse(payload);
    throw new Error(
      parsedError.success
        ? parsedError.data.error
        : "AI e化整理服務目前未回傳可讀取的錯誤內容。",
    );
  }

  const parsed = v1AiOrganizerResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("AI e化整理服務回傳格式不符，已停止套用 v1 草稿。");
  }

  return parsed.data;
}
