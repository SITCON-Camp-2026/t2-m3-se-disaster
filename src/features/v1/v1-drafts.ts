import type {
  Phase0PossibleKind,
  Phase0SuggestedNextStep,
} from "../phase-0/phase0-types";
import { createAuditEvent } from "./v1-storage";
import type { V1CombinedRecord, V1ReviewDraft } from "./v1-types";

const defaultCandidateKind: Phase0PossibleKind = "unknown";
const defaultNextStep: Phase0SuggestedNextStep = "send_to_human_review";

export function createV1ReviewDraft(record: V1CombinedRecord): V1ReviewDraft {
  const event = createAuditEvent(
    "建立整理草稿",
    "以保守安全預設建立，尚待資訊整理者判斷。",
  );

  return {
    auditTrail: [event],
    candidateKind: defaultCandidateKind,
    decisionReason: "尚未完成資訊整理者判斷。",
    humanReviewNote:
      "需要人工確認來源角色、時間、原文清楚度，以及是否會誤導行動者。",
    rawClarity: "unclear",
    recordId: record.id,
    reviewState: "needs_review",
    suggestedNextStep: defaultNextStep,
    summary: "",
    unsafeToActDirectly: true,
    updatedAt: event.at,
  };
}
