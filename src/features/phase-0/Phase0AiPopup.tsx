import { useState } from "react";
import { AiProcessingWindow } from "../../components/AiProcessingWindow";
import { StatusBadge } from "../../components/StatusBadge";
import { requestPhase0AiDraft, type Phase0AiDraftPatch } from "./phase0-ai";
import type { Phase0MessyRecord, Phase0OrganizedDraft } from "./phase0-types";

type Phase0AiPopupState = "idle" | "loading" | "success" | "error";

export function Phase0AiPopup({
  draft,
  onApplySuggestion,
  record,
}: {
  draft?: Phase0OrganizedDraft;
  onApplySuggestion: (recordId: string, patch: Phase0AiDraftPatch) => void;
  record?: Phase0MessyRecord;
}) {
  const [state, setState] = useState<Phase0AiPopupState>("idle");
  const [message, setMessage] = useState(
    "本功能由本機 dev server 代辦，API key 不送進前端檔案。",
  );

  async function handleAiOrganize() {
    if (!record) {
      return;
    }

    setState("loading");
    setMessage("AI e化資料整理中，請稍候，請不要著急。");

    try {
      const result = await requestPhase0AiDraft(record);
      onApplySuggestion(record.id, result.patch);
      setState("success");
      setMessage(result.notice ?? "AI 建議已送入工作台草稿，請人工確認。");
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "AI e化整理服務發生未明錯誤，請人工辦理。",
      );
    }
  }

  return (
    <aside className="ai-ad-popup" aria-label="AI e化自動整理廣告專區">
      <div className="ai-ad-popup__top">★ 本機加值便民措施 ★</div>
      <h2>【AI e化自動整理】</h2>
      <p className="ai-ad-popup__slogan">一鍵辦理、草稿先行、人工確認！</p>
      <div className="ai-ad-popup__case">
        <span>目前案號</span>
        <strong>{record?.id ?? "尚未選取"}</strong>
        {draft ? <StatusBadge status={draft.status} /> : null}
      </div>
      <p className="ai-ad-popup__notice">
        ※ 按下後只產生「草稿建議」，不會直接列為正式查核事實。
      </p>
      <button
        className="ai-ad-popup__button"
        disabled={!record || state === "loading"}
        type="button"
        onClick={handleAiOrganize}
      >
        {state === "loading" ? "AI 辦理中..." : "按此辦理 AI e化整理"}
      </button>
      <p className={`ai-ad-popup__message ai-ad-popup__message--${state}`}>
        {message}
      </p>
      {state === "loading" ? <AiProcessingWindow caseId={record?.id} /> : null}
      <div className="ai-ad-popup__footer">本服務不保存 API key 於 repo</div>
    </aside>
  );
}
