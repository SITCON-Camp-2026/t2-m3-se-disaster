import { useState } from "react";
import messyReports from "../fixtures/phase-0/messy-reports.json";
import { EmptyState } from "../components/EmptyState";
import {
  createInitialPhase0Drafts,
  createPhase0Draft,
} from "../features/phase-0/phase0-drafts";
import { Phase0AiPopup } from "../features/phase-0/Phase0AiPopup";
import { Phase0OrganizedInfoPanel } from "../features/phase-0/Phase0OrganizedInfoPanel";
import { Phase0RawInfoPanel } from "../features/phase-0/Phase0RawInfoPanel";
import { Phase0Workbench } from "../features/phase-0/Phase0Workbench";
import type { Phase0AiDraftPatch } from "../features/phase-0/phase0-ai";
import type {
  Phase0MessyRecord,
  Phase0OrganizedDraft,
} from "../features/phase-0/phase0-types";
import { V1Workbench } from "../features/v1/V1Workbench";

type TabKey = "raw" | "workbench" | "organized";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "raw", label: "原始資訊登錄" },
  { key: "workbench", label: "整理工作台作業" },
  { key: "organized", label: "已整理資訊彙整" },
];

const phase0Records = messyReports satisfies Phase0MessyRecord[];

export function App() {
  const isV1Path =
    typeof window !== "undefined" && /\/v1\/?$/.test(window.location.pathname);

  if (isV1Path) {
    return <V1Workbench />;
  }

  return <Phase0App />;
}

function Phase0App() {
  const [activeTab, setActiveTab] = useState<TabKey>("raw");
  const [selectedRecordId, setSelectedRecordId] = useState(
    phase0Records[0]?.id ?? "",
  );
  const [drafts, setDrafts] = useState<Phase0OrganizedDraft[]>(() =>
    createInitialPhase0Drafts(phase0Records),
  );
  const selectedRecord =
    phase0Records.find((record) => record.id === selectedRecordId) ??
    phase0Records[0];
  const selectedDraft = selectedRecord
    ? drafts.find((draft) => draft.messyRecordId === selectedRecord.id)
    : undefined;

  function selectForWorkbench(recordId: string) {
    ensureDraft(recordId);
    setSelectedRecordId(recordId);
    setActiveTab("workbench");
  }

  function ensureDraft(recordId: string) {
    setDrafts((currentDrafts) => {
      if (currentDrafts.some((draft) => draft.messyRecordId === recordId)) {
        return currentDrafts;
      }

      const record = phase0Records.find((item) => item.id === recordId);
      return record
        ? [...currentDrafts, createPhase0Draft(record)]
        : currentDrafts;
    });
  }

  function updateDraft(recordId: string, patch: Partial<Phase0OrganizedDraft>) {
    const updatedAt = new Date().toISOString();
    setDrafts((currentDrafts) =>
      currentDrafts.map((draft) =>
        draft.messyRecordId === recordId
          ? { ...draft, ...patch, updatedAt }
          : draft,
      ),
    );
  }

  function applyAiSuggestion(recordId: string, patch: Phase0AiDraftPatch) {
    const record = phase0Records.find((item) => item.id === recordId);
    if (!record) {
      return;
    }

    const updatedAt = new Date().toISOString();
    setDrafts((currentDrafts) => {
      const nextDraft = {
        ...createPhase0Draft(record),
        ...patch,
        confirmedAt: undefined,
        humanCorrection: "AI e化服務產生草稿，尚待人工確認。",
        status: "draft" as const,
        updatedAt,
      };

      if (currentDrafts.some((draft) => draft.messyRecordId === recordId)) {
        return currentDrafts.map((draft) =>
          draft.messyRecordId === recordId
            ? {
                ...draft,
                ...patch,
                confirmedAt: undefined,
                humanCorrection: "AI e化服務產生草稿，尚待人工確認。",
                status: "draft",
                updatedAt,
              }
            : draft,
        );
      }

      return [...currentDrafts, nextDraft];
    });
    setSelectedRecordId(recordId);
    setActiveTab("workbench");
  }

  function deleteDraft(recordId: string) {
    setDrafts((currentDrafts) =>
      currentDrafts.filter((draft) => draft.messyRecordId !== recordId),
    );
  }

  function resetDraft(recordId: string) {
    const record = phase0Records.find((item) => item.id === recordId);
    if (!record) {
      return;
    }

    setDrafts((currentDrafts) =>
      currentDrafts.map((draft) =>
        draft.messyRecordId === recordId ? createPhase0Draft(record) : draft,
      ),
    );
  }

  function confirmDraft(recordId: string) {
    const confirmedAt = new Date().toISOString();
    updateDraft(recordId, {
      status: "organized_confirmed",
      confirmedAt,
    });
    setActiveTab("organized");
  }

  function reopenDraft(recordId: string) {
    updateDraft(recordId, {
      status: "draft",
      confirmedAt: undefined,
    });
  }

  function editOrganizedDraft(recordId: string) {
    setSelectedRecordId(recordId);
    setActiveTab("workbench");
  }

  const organizedCount = drafts.filter(
    (draft) => draft.status === "organized_confirmed",
  ).length;
  const unsafeCount = drafts.filter(
    (draft) => draft.unsafeToActDirectly,
  ).length;
  const reviewCount = phase0Records.filter(
    (record) => record.verificationStatus !== "verified",
  ).length;

  const content =
    phase0Records.length === 0 ? (
      <EmptyState message="目前沒有資料" />
    ) : activeTab === "raw" ? (
      <Phase0RawInfoPanel
        records={phase0Records}
        selectedRecordId={selectedRecordId}
        onSelect={selectForWorkbench}
      />
    ) : activeTab === "workbench" ? (
      <Phase0Workbench
        drafts={drafts}
        records={phase0Records}
        selectedRecordId={selectedRecordId}
        onConfirmDraft={confirmDraft}
        onCreateDraft={ensureDraft}
        onDeleteDraft={deleteDraft}
        onReopenDraft={reopenDraft}
        onResetDraft={resetDraft}
        onSelect={setSelectedRecordId}
        onUpdateDraft={updateDraft}
      />
    ) : (
      <Phase0OrganizedInfoPanel
        drafts={drafts}
        records={phase0Records}
        onEdit={editOrganizedDraft}
      />
    );

  return (
    <>
      <Phase0AiPopup
        draft={selectedDraft}
        record={selectedRecord}
        onApplySuggestion={applyAiSuggestion}
      />
      <main className="layout">
        <header className="hero">
          <div className="agency-strip">
            <span>災害資訊 e 化便民服務平台</span>
            <span>資料品質列管專區</span>
            <span>更新：Phase 0 練習版</span>
          </div>
          <p className="eyebrow">SITCON Camp 2026 ｜ 第一階段作業系統</p>
          <h1 className="roc-wordart" data-shadow="災害資訊整理工作台">
            <span>災害資訊</span>
            <span>整理工作台</span>
          </h1>
          <p className="hero__copy">
            本系統協助學員依序辦理原始資訊登錄、整理草稿修正、人工確認註記及已整理資訊彙整作業。
            請注意：本頁資料仍為教學練習資料，整理完成不代表救災事實已正式查核。
          </p>
          <div className="ticker" aria-label="重要公告">
            <span>
              ※ 重要提醒：needs_review 與 unverified 不得顯示為 verified。
            </span>
            <span>※ 本系統不查詢真實地圖、地址、電話或人物資料。</span>
            <span>※ 請務必保留 agent 推測與人類修正紀錄。</span>
          </div>
          <dl className="hero-stats">
            <div>
              <dt>原始登錄</dt>
              <dd>{phase0Records.length}</dd>
            </div>
            <div>
              <dt>整理列管</dt>
              <dd>{organizedCount}</dd>
            </div>
            <div>
              <dt>不可直接行動</dt>
              <dd>{unsafeCount}</dd>
            </div>
            <div>
              <dt>待查核狀態</dt>
              <dd>{reviewCount}</dd>
            </div>
          </dl>
          <div className="v1-home-link">
            <a href="v1/">進入 v1 重新整理工作台</a>
          </div>
        </header>

        <nav className="tabs" aria-label="第一階段工作區">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={activeTab === tab.key ? "active" : ""}
              type="button"
              onClick={() => setActiveTab(tab.key)}
            >
              <span>◆</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <section className="panel">{content}</section>
      </main>
    </>
  );
}
