import type {
  Phase0ActorRelation,
  Phase0Confidence,
  Phase0PossibleKind,
  Phase0SuggestedNextStep,
} from "./phase0-types";

export const kindLabels: Record<Phase0PossibleKind, string> = {
  help_request_candidate: "求助候選",
  site_status_candidate: "地點狀態候選",
  task_candidate: "任務候選",
  assignment_candidate: "人員指派候選",
  announcement_candidate: "公告候選",
  unknown: "候選類型待判斷",
};

export const confidenceLabels: Record<Phase0Confidence, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

export const nextStepLabels: Record<Phase0SuggestedNextStep, string> = {
  keep_raw: "先保留原始資訊",
  ask_for_more_info: "補問來源或現場資訊",
  send_to_human_review: "交給人工確認",
  create_candidate_report: "建立候選通報",
  create_site_update_suggestion: "建立地點更新建議",
  do_not_use_yet: "暫時不要使用",
};

export const actorRelationLabels: Record<Phase0ActorRelation, string> = {
  self: "當事人本人",
  field_volunteer: "現場志工或值守者",
  third_party: "第三方轉述",
  unknown: "角色待確認",
};
