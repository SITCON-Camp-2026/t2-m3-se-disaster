import type { Phase0SuggestedNextStep } from "../phase-0/phase0-types";
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

export const actionNextStepLabels: Record<Phase0SuggestedNextStep, string> = {
  keep_raw: "回整理者保留原文，不作行動指令",
  ask_for_more_info: "回整理者補問來源或現場資訊",
  send_to_human_review: "送人工確認窗口續辦，不可派工",
  create_candidate_report: "僅建立候選通報草稿，非正式通報",
  create_site_update_suggestion: "僅建立地點更新建議，非現場指令",
  do_not_use_yet: "暫不採用，請勿作為行動依據",
};
