import { createPhase0Judgement } from "./phase0-heuristics";
import type { Phase0MessyRecord, Phase0OrganizedDraft } from "./phase0-types";

const demoConfirmedAt = "2026-07-20T15:30:00+08:00";

type SeedDraft = Omit<Phase0OrganizedDraft, "id" | "updatedAt">;

// Phase 0 learner-facing demo drafts. These are not official answers or verified facts.
const seedDrafts: Record<string, SeedDraft> = {
  "M-001": {
    messyRecordId: "M-001",
    status: "organized_confirmed",
    title: "M-001 清泥人力需求位置不明",
    summary:
      "原文指出光復車站後方疑似需要十幾人清泥，但地點只描述為老雜貨店後面，尚不足以派工。",
    possibleKind: "task_candidate",
    confidence: "low",
    actorRelation: "third_party",
    evidence: [
      "原文有清泥與十幾個人的需求描述。",
      "來源是社群轉錄，非當事人或現場負責窗口。",
      "地址只有模糊地標。",
    ],
    blockers: [
      "缺完整位置與現場窗口。",
      "需求是否仍存在無法確認。",
      "不能把社群轉述直接派成志工任務。",
    ],
    suggestedNextStep: "send_to_human_review",
    unsafeToActDirectly: true,
    humanReviewNote: "請先確認地點、需求時間、現場聯絡方式與是否適合公開位置。",
    humanCorrection:
      "不採用「直接建立十幾人清泥任務」的推測，因原文沒有足夠派工資訊。",
    confirmedAt: demoConfirmedAt,
  },
  "M-002": {
    messyRecordId: "M-002",
    status: "organized_confirmed",
    title: "M-002 雨鞋庫存時效不明",
    summary:
      "溪畔活動中心早上可能仍有雨鞋，但原文已明說不知道下午是否仍有庫存。",
    possibleKind: "site_status_candidate",
    confidence: "low",
    actorRelation: "field_volunteer",
    evidence: [
      "原文提到早上還有雨鞋。",
      "來源是志工更新。",
      "原文同時指出下午狀況未知。",
    ],
    blockers: [
      "物資庫存高度時效性，下午可能已改變。",
      "不知道數量、尺寸與領取限制。",
      "不能直接公告請大家前往領取。",
    ],
    suggestedNextStep: "ask_for_more_info",
    unsafeToActDirectly: true,
    humanReviewNote: "需要補最新盤點時間、剩餘數量與領用規則。",
    humanCorrection: "不把「早上還有」整理成「現在有」。",
    confirmedAt: demoConfirmedAt,
  },
  "M-003": {
    messyRecordId: "M-003",
    status: "organized_confirmed",
    title: "M-003 老街口工具需求可能已變更",
    summary:
      "老街口可能已不缺鏟子，需求轉向水電；原本清單可能過期，需要先更新需求狀態。",
    possibleKind: "site_status_candidate",
    confidence: "medium",
    actorRelation: "field_volunteer",
    evidence: [
      "原文指出已不缺鏟子。",
      "原文指出現在比較需要水電。",
      "原文提醒原本那張單可能沒更新。",
    ],
    blockers: [
      "水電需求範圍與資格不明。",
      "不知道原本表單哪一欄需要關閉或更新。",
      "不能只依舊單繼續派送鏟子。",
    ],
    suggestedNextStep: "create_site_update_suggestion",
    unsafeToActDirectly: true,
    humanReviewNote: "應請現場窗口確認舊需求是否關閉，以及水電需求如何登記。",
    humanCorrection: "把重點從新增任務改成更新既有需求狀態。",
    confirmedAt: demoConfirmedAt,
  },
  "M-004": {
    messyRecordId: "M-004",
    status: "organized_confirmed",
    title: "M-004 社群雨鞋領取訊息待查核",
    summary:
      "群組訊息說溪畔活動中心有很多雨鞋並請人直接過去拿，但來源未查核且可能與其他物資資訊衝突。",
    possibleKind: "site_status_candidate",
    confidence: "low",
    actorRelation: "third_party",
    evidence: [
      "原文是群組轉述。",
      "原文有直接前往領取的指示。",
      "查核狀態仍是 unverified。",
    ],
    blockers: [
      "不知道訊息時間與庫存是否仍有效。",
      "不知道是否有領取資格或現場秩序限制。",
      "可能造成大量人流或物資誤導。",
    ],
    suggestedNextStep: "send_to_human_review",
    unsafeToActDirectly: true,
    humanReviewNote: "應與活動中心值守者確認庫存與公告方式。",
    humanCorrection: "不採用「叫大家直接過去拿」作為工作台建議。",
    confirmedAt: demoConfirmedAt,
  },
  "M-005": {
    messyRecordId: "M-005",
    status: "organized_confirmed",
    title: "M-005 道路封閉截圖日期與來源不明",
    summary:
      "截圖內容提到中午前道路封閉，但原文不確定日期，也不確定是否為官方公告。",
    possibleKind: "announcement_candidate",
    confidence: "low",
    actorRelation: "unknown",
    evidence: [
      "原文有道路封閉資訊。",
      "原文指出截圖日期不明。",
      "原文指出官方性不明。",
    ],
    blockers: [
      "不能因 sourceType 類似官方公告就視為已查核。",
      "不知道封閉是哪一天的中午前。",
      "道路資訊錯誤會直接影響安全與動線。",
    ],
    suggestedNextStep: "do_not_use_yet",
    unsafeToActDirectly: true,
    humanReviewNote: "必須確認公告日期、發布單位與是否仍有效。",
    humanCorrection: "明確拒絕把 sourceType 當作 verified 狀態。",
    confirmedAt: demoConfirmedAt,
  },
  "M-006": {
    messyRecordId: "M-006",
    status: "organized_confirmed",
    title: "M-006 學校側門集合點資訊互相衝突",
    summary:
      "有人回報學校側門可當集合點，但另一位志工說剛剛淹水不適合停留，安全狀態互相衝突。",
    possibleKind: "site_status_candidate",
    confidence: "low",
    actorRelation: "field_volunteer",
    evidence: [
      "原文同時出現可當集合點與不適合停留兩種說法。",
      "來源是現場回報。",
      "問題涉及安全與人員停留。",
    ],
    blockers: [
      "集合點安全狀態未定。",
      "不知道哪一則回報較新。",
      "不能引導志工前往可能淹水位置。",
    ],
    suggestedNextStep: "send_to_human_review",
    unsafeToActDirectly: true,
    humanReviewNote: "需要現場負責人確認是否開放、替代集合點與更新時間。",
    humanCorrection: "不把第一句整理為可用集合點；衝突訊息要同時保留。",
    confirmedAt: demoConfirmedAt,
  },
  "M-007": {
    messyRecordId: "M-007",
    status: "organized_confirmed",
    title: "M-007 水電工班支援名單疑似過期",
    summary:
      "社群貼文提到某工班可支援水電，但留言指出可能是昨天名單且今天沒空。",
    possibleKind: "assignment_candidate",
    confidence: "low",
    actorRelation: "third_party",
    evidence: [
      "原文有水電支援可能性。",
      "原文同時有今天沒空的留言反證。",
      "來源是社群貼文。",
    ],
    blockers: [
      "名單可能過期。",
      "沒有工班今日可承接確認。",
      "沒有聯絡窗口與可服務範圍。",
    ],
    suggestedNextStep: "send_to_human_review",
    unsafeToActDirectly: true,
    humanReviewNote: "先確認工班今天是否能支援，再考慮是否轉入人員媒合。",
    humanCorrection: "不把舊名單直接轉成人員指派。",
    confirmedAt: demoConfirmedAt,
  },
  "M-008": {
    messyRecordId: "M-008",
    status: "organized_confirmed",
    title: "M-008 A 區暫停派人原因不明",
    summary:
      "現場回報 A 區先不要再派人，但原因不明，可能是人太多、道路危險或任務已完成。",
    possibleKind: "site_status_candidate",
    confidence: "medium",
    actorRelation: "field_volunteer",
    evidence: [
      "原文有明確暫停派人的訊息。",
      "原文列出原因不明。",
      "來源是現場回報。",
    ],
    blockers: [
      "不知道停止派人的真實原因。",
      "若是道路危險，需要安全公告；若是完成，需要關閉任務。",
      "不能自行推定狀態。",
    ],
    suggestedNextStep: "ask_for_more_info",
    unsafeToActDirectly: true,
    humanReviewNote: "請現場窗口補原因、範圍、有效時間與替代指引。",
    humanCorrection: "只保留暫停派人，不推論成任務完成或道路危險。",
    confirmedAt: demoConfirmedAt,
  },
  "M-009": {
    messyRecordId: "M-009",
    status: "organized_confirmed",
    title: "M-009 車站東側集合點限制更新",
    summary:
      "14:20 現場志工回報光復車站東側臨時集合點仍開放，但只接受已報到清淤志工，一般物資不要送到此處。",
    possibleKind: "site_status_candidate",
    confidence: "medium",
    actorRelation: "field_volunteer",
    evidence: [
      "原文有回報時間、地點與限制條件。",
      "原文區分清淤志工與一般物資。",
      "原文說官方公告尚未同步更新。",
    ],
    blockers: [
      "官方公告尚未同步。",
      "需要確認入口公告是否仍有效。",
      "不能擴大解讀成所有志工都可直接前往。",
    ],
    suggestedNextStep: "create_site_update_suggestion",
    unsafeToActDirectly: true,
    humanReviewNote: "適合整理成候選地點狀態，並標示官方同步待確認。",
    humanCorrection: "人類保留限制條件，避免只留下「集合點開放」。",
    confirmedAt: demoConfirmedAt,
  },
  "M-010": {
    messyRecordId: "M-010",
    status: "organized_confirmed",
    title: "M-010 活動中心物資盤點與登記動線",
    summary:
      "14:35 值守志工確認溪畔活動中心雨鞋約 12 雙、尺寸多為 26-28，飲用水暫不缺，不收二手衣，水電需求改至大進路口服務台。",
    possibleKind: "site_status_candidate",
    confidence: "high",
    actorRelation: "field_volunteer",
    evidence: [
      "原文有明確時間、地點、物資數量與限制。",
      "原文有下一次盤點時間。",
      "原文有水電登記替代地點。",
    ],
    blockers: [
      "仍需等 16:30 下一次盤點更新。",
      "雨鞋數量可能快速變動。",
      "verificationStatus 仍是 needs_review，不是 verified。",
    ],
    suggestedNextStep: "create_site_update_suggestion",
    unsafeToActDirectly: true,
    humanReviewNote: "品質較高，可作候選地點更新，但仍要保留待確認狀態。",
    humanCorrection: "不把值守志工確認改寫成系統 verified。",
    confirmedAt: demoConfirmedAt,
  },
  "M-011": {
    messyRecordId: "M-011",
    status: "organized_confirmed",
    title: "M-011 長者家具搬動需求需同意與定位",
    summary:
      "現場志工代長者轉述，住家泥水已退但需搬大型家具；位置只有方向描述，且尚未確認長者是否同意公開完整地址。",
    possibleKind: "help_request_candidate",
    confidence: "medium",
    actorRelation: "third_party",
    evidence: [
      "原文有需求內容：搬動大型家具。",
      "原文說是志工代長者轉述。",
      "原文指出公開完整地址的同意尚未確認。",
    ],
    blockers: [
      "需求不是當事人直接操作。",
      "涉及住家位置與個資同意。",
      "缺安全可派工位置與聯絡窗口。",
    ],
    suggestedNextStep: "send_to_human_review",
    unsafeToActDirectly: true,
    humanReviewNote: "先確認當事人同意、精確位置可揭露程度與現場協助方式。",
    humanCorrection: "不把方向描述補成完整地址。",
    confirmedAt: demoConfirmedAt,
  },
  "M-012": {
    messyRecordId: "M-012",
    status: "organized_confirmed",
    title: "M-012 外地家屬藥品協助需先查證",
    summary:
      "外地家屬表示親友疑似需要藥品協助，但不在現場，也無法確認親友目前位置。",
    possibleKind: "help_request_candidate",
    confidence: "low",
    actorRelation: "third_party",
    evidence: [
      "原文提到疑似藥品協助需求。",
      "來電者不是現場當事人。",
      "原文說無法確認親友目前位置。",
    ],
    blockers: [
      "需求與位置都不確定。",
      "涉及健康與個人狀態，不能由系統推定。",
      "不知道是否應建立任務，原文也保留疑問。",
    ],
    suggestedNextStep: "ask_for_more_info",
    unsafeToActDirectly: true,
    humanReviewNote: "應建立查證流程，先確認人、位置、同意與需求性質。",
    humanCorrection: "不直接建立送藥任務，也不補醫療資訊。",
    confirmedAt: demoConfirmedAt,
  },
};

export function createPhase0Draft(
  record: Phase0MessyRecord,
): Phase0OrganizedDraft {
  const seededDraft = seedDrafts[record.id];
  if (seededDraft) {
    return {
      ...seededDraft,
      id: `draft-${record.id}`,
      updatedAt: record.updatedAt,
    };
  }

  const safetyBoundary = createPhase0Judgement(record);

  return {
    ...safetyBoundary,
    id: `draft-${record.id}`,
    status: "draft",
    title: `${record.id} 整理草稿`,
    summary: "",
    actorRelation: "unknown",
    humanCorrection: "",
    humanReviewNote: safetyBoundary.humanReviewNote ?? "",
    updatedAt: record.updatedAt,
  };
}

export function createInitialPhase0Drafts(
  records: Phase0MessyRecord[],
): Phase0OrganizedDraft[] {
  return records.map(createPhase0Draft);
}
