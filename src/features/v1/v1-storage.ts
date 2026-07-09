import type { V1AuditEvent, V1ObserverRecord, V1ReviewDraft } from "./v1-types";

const observerStorageKey = "sitcon-camp-2026-v1-observer-records";
const draftStorageKey = "sitcon-camp-2026-v1-review-drafts";
const schemaVersion = 1;

type StoredObserverRecords = {
  records: V1ObserverRecord[];
  schemaVersion: number;
};

type StoredReviewDrafts = {
  drafts: V1ReviewDraft[];
  schemaVersion: number;
};

export function createAuditEvent(action: string, note: string): V1AuditEvent {
  const at = new Date().toISOString();
  const randomId =
    globalThis.crypto && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : `${at}-${Math.random().toString(36).slice(2)}`;

  return {
    action,
    at,
    id: randomId,
    note,
  };
}

export function loadObserverRecords(): V1ObserverRecord[] {
  const parsed = readJson<StoredObserverRecords>(observerStorageKey);
  if (
    !parsed ||
    parsed.schemaVersion !== schemaVersion ||
    !Array.isArray(parsed.records)
  ) {
    return [];
  }
  return parsed.records.map(normalizeObserverRecord);
}

export function saveObserverRecords(records: V1ObserverRecord[]) {
  writeJson(observerStorageKey, {
    records,
    schemaVersion,
  });
}

export function loadReviewDrafts(): V1ReviewDraft[] {
  const parsed = readJson<StoredReviewDrafts>(draftStorageKey);
  if (
    !parsed ||
    parsed.schemaVersion !== schemaVersion ||
    !Array.isArray(parsed.drafts)
  ) {
    return [];
  }
  return parsed.drafts.map(normalizeReviewDraft);
}

export function saveReviewDrafts(drafts: V1ReviewDraft[]) {
  writeJson(draftStorageKey, {
    drafts,
    schemaVersion,
  });
}

export function clearV1Storage() {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.removeItem(observerStorageKey);
  window.localStorage.removeItem(draftStorageKey);
}

function readJson<T>(key: string): T | undefined {
  if (!canUseStorage()) {
    return undefined;
  }

  const value = window.localStorage.getItem(key);
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeObserverRecord(record: V1ObserverRecord): V1ObserverRecord {
  return {
    ...record,
    reviewState: "needs_review",
    verificationStatus: "unverified",
  };
}

function normalizeReviewDraft(draft: V1ReviewDraft): V1ReviewDraft {
  const reviewState = normalizeReviewState(draft.reviewState);

  return {
    ...draft,
    actionSnapshot: draft.actionSnapshot
      ? {
          ...draft.actionSnapshot,
          reviewState: normalizeReviewState(draft.actionSnapshot.reviewState),
          unsafeToActDirectly:
            draft.actionSnapshot.unsafeToActDirectly !== false,
        }
      : undefined,
    reviewState,
    unsafeToActDirectly: draft.unsafeToActDirectly !== false,
  };
}

function normalizeReviewState(
  value: V1ReviewDraft["reviewState"],
): V1ReviewDraft["reviewState"] {
  return value === "needs_review" ||
    value === "candidate_draft" ||
    value === "do_not_use_yet"
    ? value
    : "needs_review";
}

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}
