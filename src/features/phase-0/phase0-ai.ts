import { z } from "zod";
import type {
  Phase0ActorRelation,
  Phase0Confidence,
  Phase0MessyRecord,
  Phase0OrganizedDraft,
  Phase0PossibleKind,
  Phase0SuggestedNextStep,
} from "./phase0-types";

const aiDraftPatchSchema = z.object({
  actorRelation: z.enum(["self", "field_volunteer", "third_party", "unknown"]),
  confidence: z.enum(["low", "medium", "high"]),
  humanReviewNote: z.string().optional(),
  possibleKind: z.enum([
    "help_request_candidate",
    "site_status_candidate",
    "task_candidate",
    "assignment_candidate",
    "announcement_candidate",
    "unknown",
  ]),
  suggestedNextStep: z.enum([
    "keep_raw",
    "ask_for_more_info",
    "send_to_human_review",
    "create_candidate_report",
    "create_site_update_suggestion",
    "do_not_use_yet",
  ]),
  summary: z.string().min(1),
  title: z.string().min(1),
  unsafeToActDirectly: z.boolean(),
});

const aiOrganizerResponseSchema = z.object({
  model: z.string().optional(),
  notice: z.string().optional(),
  patch: aiDraftPatchSchema,
});

const aiOrganizerErrorSchema = z.object({
  error: z.string(),
});

export type Phase0AiDraftPatch = Pick<
  Phase0OrganizedDraft,
  | "actorRelation"
  | "confidence"
  | "humanReviewNote"
  | "possibleKind"
  | "suggestedNextStep"
  | "summary"
  | "title"
  | "unsafeToActDirectly"
>;

export type Phase0AiOrganizerResponse = {
  model?: string;
  notice?: string;
  patch: {
    actorRelation: Phase0ActorRelation;
    confidence: Phase0Confidence;
    humanReviewNote?: string;
    possibleKind: Phase0PossibleKind;
    suggestedNextStep: Phase0SuggestedNextStep;
    summary: string;
    title: string;
    unsafeToActDirectly: boolean;
  };
};

export async function requestPhase0AiDraft(
  record: Phase0MessyRecord,
): Promise<Phase0AiOrganizerResponse> {
  const response = await fetch("/api/phase0/ai-organize", {
    body: JSON.stringify({ record }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = aiOrganizerErrorSchema.safeParse(payload);
    throw new Error(
      parsedError.success
        ? parsedError.data.error
        : "AI e化整理服務目前未回傳可讀取的錯誤內容。",
    );
  }

  const parsed = aiOrganizerResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("AI e化整理服務回傳格式不符，已停止套用草稿。");
  }

  return parsed.data;
}
