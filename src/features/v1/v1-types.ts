import type {
  Phase0ActorRelation,
  Phase0MessyRecord,
  Phase0PossibleKind,
  Phase0SuggestedNextStep,
} from "../phase-0/phase0-types";

export type V1RawClarity = "unclear" | "brief" | "clear";

export type V1ReviewState =
  "needs_review" | "candidate_draft" | "do_not_use_yet";

export type V1RecordOrigin = "phase0_fixture" | "local_observer";

export type V1AuditEvent = {
  id: string;
  action: string;
  note: string;
  at: string;
};

export type V1ObserverRecord = {
  localId: string;
  rawText: string;
  sourceType: string;
  actorRelation: Phase0ActorRelation;
  observedAt: string;
  uncertaintyNote: string;
  verificationStatus: "unverified";
  reviewState: "needs_review";
  createdAt: string;
  updatedAt: string;
  auditTrail: V1AuditEvent[];
};

export type V1CombinedRecord = {
  actorRelation?: Phase0ActorRelation;
  auditTrail: V1AuditEvent[];
  id: string;
  observedAt?: string;
  origin: V1RecordOrigin;
  rawText: string;
  sourceType: string;
  uncertaintyNote?: string;
  updatedAt: string;
  verificationStatus: string;
};

export type V1ReviewDraft = {
  auditTrail: V1AuditEvent[];
  candidateKind: Phase0PossibleKind;
  decisionReason: string;
  humanReviewNote: string;
  rawClarity: V1RawClarity;
  recordId: string;
  reviewState: V1ReviewState;
  suggestedNextStep: Phase0SuggestedNextStep;
  summary: string;
  unsafeToActDirectly: boolean;
  updatedAt: string;
};

export function phase0ToV1Record(record: Phase0MessyRecord): V1CombinedRecord {
  return {
    auditTrail: [],
    id: record.id,
    origin: "phase0_fixture",
    rawText: record.rawText,
    sourceType: record.sourceType,
    updatedAt: record.updatedAt,
    verificationStatus: record.verificationStatus,
  };
}
