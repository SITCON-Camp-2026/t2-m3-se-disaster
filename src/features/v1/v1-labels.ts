import type { V1RawClarity, V1RecordOrigin, V1ReviewState } from "./v1-types";

export const rawClarityLabels: Record<V1RawClarity, string> = {
  unclear: "原文模糊",
  brief: "原文簡略",
  clear: "原文清晰",
};

export const reviewStateLabels: Record<V1ReviewState, string> = {
  needs_review: "需要人工確認",
  candidate_draft: "候選整理草稿",
  do_not_use_yet: "暫時不採用",
};

export const recordOriginLabels: Record<V1RecordOrigin, string> = {
  phase0_fixture: "Phase 0 原始資訊",
  local_observer: "本機觀測者新增",
};

export const observerSourceLabels: Record<string, string> = {
  observer_input: "觀測者輸入",
  field_report: "現場回報",
  phone_call: "電話轉述",
  social_post: "社群轉述",
  volunteer_update: "志工更新",
};
