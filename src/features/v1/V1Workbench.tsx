import { useMemo, useState } from "react";
import messyReports from "../../fixtures/phase-0/messy-reports.json";
import { AiProcessingWindow } from "../../components/AiProcessingWindow";
import { SourceLabel } from "../../components/SourceLabel";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDateTime } from "../../lib/date";
import {
  actorRelationLabels,
  kindLabels,
  nextStepLabels,
} from "../phase-0/phase0-labels";
import type {
  Phase0ActorRelation,
  Phase0MessyRecord,
  Phase0PossibleKind,
  Phase0SuggestedNextStep,
} from "../phase-0/phase0-types";
import { requestV1AiDraft } from "./v1-ai-organizer";
import { createV1ReviewDraft } from "./v1-drafts";
import {
  observerSourceLabels,
  rawClarityLabels,
  recordOriginLabels,
  reviewStateLabels,
} from "./v1-labels";
import {
  clearV1Storage,
  createAuditEvent,
  loadObserverRecords,
  loadReviewDrafts,
  saveObserverRecords,
  saveReviewDrafts,
} from "./v1-storage";
import { phase0ToV1Record } from "./v1-types";
import type {
  V1CombinedRecord,
  V1ObserverRecord,
  V1RawClarity,
  V1ReviewDraft,
  V1RecordOrigin,
  V1ReviewState,
} from "./v1-types";

type V1Tab = "queue" | "observer" | "review" | "action" | "audit";

const phase0Records = messyReports satisfies Phase0MessyRecord[];
const phase0V1Records = phase0Records.map(phase0ToV1Record);

const tabs: Array<{ key: V1Tab; label: string }> = [
  { key: "queue", label: "未整理資料清冊" },
  { key: "observer", label: "觀測者新增" },
  { key: "review", label: "整理判斷" },
  { key: "action", label: "行動者檢視" },
  { key: "audit", label: "本機紀錄" },
];

export function V1Workbench() {
  const [activeTab, setActiveTab] = useState<V1Tab>("queue");
  const [observerRecords, setObserverRecords] = useState<V1ObserverRecord[]>(
    () => loadObserverRecords(),
  );
  const [reviewDrafts, setReviewDrafts] = useState<V1ReviewDraft[]>(() =>
    loadReviewDrafts(),
  );
  const records = useMemo(
    () => [
      ...phase0V1Records,
      ...observerRecords.map(observerRecordToCombinedRecord),
    ],
    [observerRecords],
  );
  const [selectedRecordId, setSelectedRecordId] = useState(
    records[0]?.id ?? "",
  );
  const selectedRecord =
    records.find((record) => record.id === selectedRecordId) ?? records[0];
  const selectedDraft = selectedRecord
    ? (reviewDrafts.find((draft) => draft.recordId === selectedRecord.id) ??
      createV1ReviewDraft(selectedRecord))
    : undefined;

  function persistObserverRecords(nextRecords: V1ObserverRecord[]) {
    setObserverRecords(nextRecords);
    saveObserverRecords(nextRecords);
  }

  function persistReviewDrafts(nextDrafts: V1ReviewDraft[]) {
    setReviewDrafts(nextDrafts);
    saveReviewDrafts(nextDrafts);
  }

  function selectForReview(recordId: string) {
    const record = records.find((item) => item.id === recordId);
    if (!record) {
      return;
    }
    ensureDraft(record);
    setSelectedRecordId(recordId);
    setActiveTab("review");
  }

  function ensureDraft(record: V1CombinedRecord) {
    if (reviewDrafts.some((draft) => draft.recordId === record.id)) {
      return;
    }
    persistReviewDrafts([...reviewDrafts, createV1ReviewDraft(record)]);
  }

  function updateDraft(patch: Partial<V1ReviewDraft>, auditNote: string) {
    if (!selectedRecord || !selectedDraft) {
      return;
    }

    const event = createAuditEvent("更新整理判斷", auditNote);
    const nextDraft = {
      ...selectedDraft,
      ...patch,
      auditTrail: [...selectedDraft.auditTrail, event],
      updatedAt: event.at,
    };

    const exists = reviewDrafts.some(
      (draft) => draft.recordId === selectedRecord.id,
    );
    persistReviewDrafts(
      exists
        ? reviewDrafts.map((draft) =>
            draft.recordId === selectedRecord.id ? nextDraft : draft,
          )
        : [...reviewDrafts, nextDraft],
    );
  }

  function syncDraftToActionView() {
    if (!selectedRecord || !selectedDraft) {
      return "尚未選取可同步的整理草稿。";
    }

    const summary = selectedDraft.summary.trim();
    const humanReviewNote = selectedDraft.humanReviewNote.trim();

    if (!summary || !humanReviewNote) {
      return "請先填寫候選摘要與人工確認註記，再同步到行動者檢視。";
    }

    const event = createAuditEvent(
      "同步到行動者檢視",
      "建立給行動者查看的整理快照；這不是派工單，也不代表資料已查核。",
    );
    const nextDraft: V1ReviewDraft = {
      ...selectedDraft,
      actionSnapshot: {
        candidateKind: selectedDraft.candidateKind,
        decisionReason: selectedDraft.decisionReason,
        humanReviewNote,
        rawClarity: selectedDraft.rawClarity,
        reviewState: selectedDraft.reviewState,
        sharedAt: event.at,
        suggestedNextStep: selectedDraft.suggestedNextStep,
        summary,
        unsafeToActDirectly: selectedDraft.unsafeToActDirectly,
      },
      auditTrail: [...selectedDraft.auditTrail, event],
      updatedAt: event.at,
    };
    const exists = reviewDrafts.some(
      (draft) => draft.recordId === selectedRecord.id,
    );

    persistReviewDrafts(
      exists
        ? reviewDrafts.map((draft) =>
            draft.recordId === selectedRecord.id ? nextDraft : draft,
          )
        : [...reviewDrafts, nextDraft],
    );

    return "已同步一份快照到行動者檢視；後續修改不會自動更新，需再次同步。";
  }

  async function applyAiOrganizerDraft() {
    if (!selectedRecord || !selectedDraft) {
      return "尚未選取可整理的原始資訊。";
    }

    const result = await requestV1AiDraft(selectedRecord);
    const event = createAuditEvent(
      "AI e化自動整理",
      result.model
        ? `透過 opencode AI 產生候選整理草稿（${result.model}），仍需人工確認，且不可直接行動。`
        : "透過 opencode AI 產生候選整理草稿，仍需人工確認，且不可直接行動。",
    );
    const nextDraft = {
      ...selectedDraft,
      ...result.patch,
      auditTrail: [...selectedDraft.auditTrail, event],
      updatedAt: event.at,
    };
    const exists = reviewDrafts.some(
      (draft) => draft.recordId === selectedRecord.id,
    );

    persistReviewDrafts(
      exists
        ? reviewDrafts.map((draft) =>
            draft.recordId === selectedRecord.id ? nextDraft : draft,
          )
        : [...reviewDrafts, nextDraft],
    );

    return result.notice ?? "AI e化草稿已送入整理欄位，請人工逐欄檢查。";
  }

  function addObserverRecord(input: ObserverFormInput) {
    const now = new Date().toISOString();
    const localId = `L-${now.replace(/\D/g, "").slice(0, 14)}`;
    const auditEvent = createAuditEvent(
      "觀測者新增資料",
      "新增為本機未整理草稿，預設需要人工確認。",
    );
    const newRecord: V1ObserverRecord = {
      actorRelation: input.actorRelation,
      auditTrail: [auditEvent],
      createdAt: now,
      localId,
      observedAt: input.observedAt,
      rawText: input.rawText,
      reviewState: "needs_review",
      sourceType: input.sourceType,
      uncertaintyNote: input.uncertaintyNote,
      updatedAt: now,
      verificationStatus: "unverified",
    };

    persistObserverRecords([newRecord, ...observerRecords]);
    setSelectedRecordId(localId);
    setActiveTab("review");
    persistReviewDrafts([
      ...reviewDrafts,
      createV1ReviewDraft(observerRecordToCombinedRecord(newRecord)),
    ]);
  }

  function deleteObserverRecord(recordId: string) {
    const record = observerRecords.find((item) => item.localId === recordId);
    if (!record) {
      return;
    }
    persistObserverRecords(
      observerRecords.filter((item) => item.localId !== recordId),
    );
    persistReviewDrafts(
      reviewDrafts.filter((draft) => draft.recordId !== recordId),
    );
    setSelectedRecordId(phase0V1Records[0]?.id ?? "");
    setActiveTab("queue");
  }

  function resetLocalData() {
    clearV1Storage();
    setObserverRecords([]);
    setReviewDrafts([]);
    setSelectedRecordId(phase0V1Records[0]?.id ?? "");
    setActiveTab("queue");
  }

  const needsReviewCount = new Set(
    reviewDrafts
      .filter((draft) => draft.reviewState === "needs_review")
      .map((draft) => draft.recordId),
  ).size;
  const unsafeCount = reviewDrafts.filter(
    (draft) => draft.unsafeToActDirectly,
  ).length;
  const localAuditCount =
    observerRecords.reduce(
      (count, record) => count + record.auditTrail.length,
      0,
    ) +
    reviewDrafts.reduce((count, draft) => count + draft.auditTrail.length, 0);

  return (
    <main className="layout v1-layout">
      <header className="hero v1-hero">
        <div className="agency-strip">
          <span>災害資訊 e 化便民服務平台</span>
          <span>v1 重新整理工作區</span>
          <span>本機草稿版</span>
        </div>
        <p className="eyebrow">SITCON Camp 2026 ｜ Release 03 實作迭代</p>
        <h1 className="roc-wordart" data-shadow="v1 資訊整理工作台">
          <span>v1 資訊</span>
          <span>整理工作台</span>
        </h1>
        <p className="hero__copy">
          v1 仍使用 Phase 0
          原始資訊作為唯一內建資料來源。觀測者新增內容只保存在本機，
          一律是未查核與需要人工確認，不代表正式通報或可行動任務。
        </p>
        <div className="ticker" aria-label="v1 重要公告">
          <span>※ 原文清楚度不是可信度，也不是可行動程度。</span>
          <span>※ 本機新增資料只是課堂練習草稿，不代表正式保存。</span>
          <span>※ verified / confirmed 不得由 AI 或本機儲存自動產生。</span>
        </div>
        <dl className="hero-stats">
          <div>
            <dt>Phase 0 原始資訊</dt>
            <dd>{phase0V1Records.length}</dd>
          </div>
          <div>
            <dt>本機新增</dt>
            <dd>{observerRecords.length}</dd>
          </div>
          <div>
            <dt>待人工確認</dt>
            <dd>{needsReviewCount}</dd>
          </div>
          <div>
            <dt>不可直接行動</dt>
            <dd>{unsafeCount}</dd>
          </div>
        </dl>
        <div className="v1-home-link">
          <a href="/">返回 Phase 0 首頁</a>
        </div>
      </header>

      <nav className="tabs" aria-label="v1 工作區">
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

      <section className="panel">
        {activeTab === "queue" ? (
          <RecordQueue
            records={records}
            reviewDrafts={reviewDrafts}
            selectedRecordId={selectedRecord?.id ?? ""}
            onDeleteObserver={deleteObserverRecord}
            onSelect={selectForReview}
          />
        ) : activeTab === "observer" ? (
          <ObserverForm onAdd={addObserverRecord} />
        ) : activeTab === "review" && selectedRecord && selectedDraft ? (
          <ReviewPanel
            draft={selectedDraft}
            record={selectedRecord}
            onAiOrganize={applyAiOrganizerDraft}
            onSyncToActionView={syncDraftToActionView}
            onUpdate={updateDraft}
          />
        ) : activeTab === "action" ? (
          <ActionView
            records={records}
            reviewDrafts={reviewDrafts}
            onSelect={selectForReview}
          />
        ) : (
          <AuditPanel
            auditCount={localAuditCount}
            observerRecords={observerRecords}
            reviewDrafts={reviewDrafts}
            onReset={resetLocalData}
          />
        )}
      </section>
    </main>
  );
}

type ObserverFormInput = {
  actorRelation: Phase0ActorRelation;
  observedAt: string;
  rawText: string;
  sourceType: string;
  uncertaintyNote: string;
};

function ObserverForm({
  onAdd,
}: {
  onAdd: (input: ObserverFormInput) => void;
}) {
  const [rawText, setRawText] = useState("");
  const [sourceType, setSourceType] = useState("observer_input");
  const [actorRelation, setActorRelation] =
    useState<Phase0ActorRelation>("unknown");
  const [observedAt, setObservedAt] = useState("");
  const [uncertaintyNote, setUncertaintyNote] = useState("");
  const [error, setError] = useState("");

  function submitObserverRecord() {
    const trimmedRawText = rawText.trim();
    const trimmedUncertaintyNote = uncertaintyNote.trim();

    if (trimmedRawText.length < 8) {
      setError("請先輸入足夠的原始文字。");
      return;
    }

    onAdd({
      actorRelation,
      observedAt,
      rawText: trimmedRawText,
      sourceType,
      uncertaintyNote: trimmedUncertaintyNote,
    });
    setRawText("");
    setUncertaintyNote("");
    setObservedAt("");
    setActorRelation("unknown");
    setSourceType("observer_input");
    setError("");
  }

  return (
    <div className="v1-observer">
      <div className="panel__header">
        <div>
          <h2>【觀測者新增本機草稿】</h2>
          <p>新增內容只保存在本機，預設未查核，不能直接變成任務。</p>
        </div>
        <StatusBadge status="needs_review" />
      </div>

      {error ? <div className="error-state">{error}</div> : null}

      <div className="field-grid">
        <label className="field">
          <span>資訊取得方式</span>
          <select
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value)}
          >
            {Object.entries(observerSourceLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>來源角色</span>
          <select
            value={actorRelation}
            onChange={(event) =>
              setActorRelation(event.target.value as Phase0ActorRelation)
            }
          >
            {Object.entries(actorRelationLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>觀測或聽聞時間</span>
        <input
          type="datetime-local"
          value={observedAt}
          onChange={(event) => setObservedAt(event.target.value)}
        />
      </label>

      <label className="field">
        <span>原始文字</span>
        <textarea
          rows={5}
          value={rawText}
          placeholder="輸入觀測者看到或聽到的原始文字；送出後仍會維持未查核。"
          onChange={(event) => setRawText(event.target.value)}
        />
      </label>

      <label className="field">
        <span>我不確定的地方</span>
        <textarea
          rows={3}
          value={uncertaintyNote}
          placeholder="例如：時間不確定、來源不是當事人、地點描述太模糊。"
          onChange={(event) => setUncertaintyNote(event.target.value)}
        />
      </label>

      <div className="draft-actions">
        <button
          className="primary-action"
          type="button"
          onClick={submitObserverRecord}
        >
          儲存為本機未整理草稿
        </button>
      </div>
    </div>
  );
}

function RecordQueue({
  records,
  reviewDrafts,
  selectedRecordId,
  onDeleteObserver,
  onSelect,
}: {
  records: V1CombinedRecord[];
  reviewDrafts: V1ReviewDraft[];
  selectedRecordId: string;
  onDeleteObserver: (recordId: string) => void;
  onSelect: (recordId: string) => void;
}) {
  return (
    <div className="v1-queue">
      <div className="panel__header">
        <div>
          <h2>【未整理資料清冊】</h2>
          <p>資料仍來自 Phase 0 原始資訊與本機草稿，尚未完成查核。</p>
        </div>
        <p>列管件數：{records.length} 筆</p>
      </div>

      <div className="table-frame">
        <table className="admin-table v1-record-table">
          <thead>
            <tr>
              <th scope="col">案號</th>
              <th scope="col">來源 / 狀態</th>
              <th scope="col">原始文字</th>
              <th scope="col">整理狀態</th>
              <th scope="col">作業</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => {
              const draft = reviewDrafts.find(
                (item) => item.recordId === record.id,
              );
              return (
                <tr
                  className={
                    record.id === selectedRecordId ? "admin-row--selected" : ""
                  }
                  key={record.id}
                >
                  <td className="case-id">
                    <strong>{record.id}</strong>
                    <span className="draft-state">
                      {recordOriginLabels[record.origin]}
                    </span>
                  </td>
                  <td>
                    <SourceLabel sourceType={record.sourceType} />
                    <StatusBadge status={record.verificationStatus} />
                    {record.actorRelation ? (
                      <span className="draft-state">
                        {actorRelationLabels[record.actorRelation]}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <p>{record.rawText}</p>
                    {record.uncertaintyNote ? (
                      <p>不確定處：{record.uncertaintyNote}</p>
                    ) : null}
                  </td>
                  <td>
                    {draft ? (
                      <div className="table-tags">
                        <span>{reviewStateLabels[draft.reviewState]}</span>
                        <span>{rawClarityLabels[draft.rawClarity]}</span>
                        <span>
                          {draft.unsafeToActDirectly
                            ? "不可直接行動"
                            : "仍需確認情境"}
                        </span>
                        <span>
                          {draft.actionSnapshot
                            ? "已同步行動者"
                            : "未同步行動者"}
                        </span>
                      </div>
                    ) : (
                      <span className="draft-state">尚未建立整理判斷</span>
                    )}
                  </td>
                  <td>
                    <button type="button" onClick={() => onSelect(record.id)}>
                      進行整理
                    </button>
                    {record.origin === "local_observer" ? (
                      <button
                        className="danger-action"
                        type="button"
                        onClick={() => onDeleteObserver(record.id)}
                      >
                        刪除本機草稿
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewPanel({
  draft,
  onAiOrganize,
  onSyncToActionView,
  onUpdate,
  record,
}: {
  draft: V1ReviewDraft;
  onAiOrganize: () => Promise<string>;
  onSyncToActionView: () => string;
  onUpdate: (patch: Partial<V1ReviewDraft>, auditNote: string) => void;
  record: V1CombinedRecord;
}) {
  const [aiState, setAiState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [aiMessage, setAiMessage] = useState(
    "按下後會透過本機 dev server 呼叫 opencode；只填入草稿，不會查核資料，也不會產生可行動任務。",
  );
  const [syncMessage, setSyncMessage] = useState(
    "行動者檢視只會看到你按下同步時建立的快照。",
  );
  const canSyncToActionView =
    draft.summary.trim().length > 0 && draft.humanReviewNote.trim().length > 0;
  const hasUnsyncedChanges = draft.actionSnapshot
    ? draft.updatedAt > draft.actionSnapshot.sharedAt
    : false;

  async function handleAiOrganize() {
    setAiState("loading");
    setAiMessage("AI e化整理中，請稍候。");

    try {
      const notice = await onAiOrganize();
      setAiState("success");
      setAiMessage(notice);
    } catch (error) {
      setAiState("error");
      setAiMessage(
        error instanceof Error
          ? error.message
          : "AI e化整理服務發生未明錯誤，請人工辦理。",
      );
    }
  }

  function handleSyncToActionView() {
    setSyncMessage(onSyncToActionView());
  }

  return (
    <div className="v1-review">
      <div className="panel__header">
        <div>
          <h2>【資訊整理判斷】</h2>
          <p>整理判斷不代表外部查核完成，所有結果都必須保留未查核狀態。</p>
        </div>
        <StatusBadge status={record.verificationStatus} />
      </div>

      <article className="record-card">
        <div className="record-card__header">
          <div>
            <p className="eyebrow">{recordOriginLabels[record.origin]}</p>
            <h3>{record.id}</h3>
          </div>
          <SourceLabel sourceType={record.sourceType} />
        </div>
        <p>{record.rawText}</p>
        {record.uncertaintyNote ? (
          <p>不確定處：{record.uncertaintyNote}</p>
        ) : null}
        <p className="draft-editor__notice">
          原文清楚度只描述原始文字是否支撐整理判斷，不代表資料已查核、
          已確認或可以行動。
        </p>
      </article>

      <aside className="v1-ai-panel" aria-label="v1 AI e化自動整理草稿區">
        <div>
          <p className="eyebrow">本機草稿輔助</p>
          <h3>【AI e化自動整理】</h3>
          <p>
            只依目前原文產生候選摘要與待確認註記；不查外部資料、不判斷真偽、
            不派工。
          </p>
        </div>
        <button
          className="primary-action"
          disabled={aiState === "loading"}
          type="button"
          onClick={handleAiOrganize}
        >
          {aiState === "loading" ? "AI 辦理中..." : "按此辦理 AI e化整理"}
        </button>
        <p className={`v1-ai-panel__message v1-ai-panel__message--${aiState}`}>
          {aiMessage}
        </p>
        {aiState === "loading" ? (
          <AiProcessingWindow caseId={record.id} />
        ) : null}
      </aside>

      <form
        className="draft-editor"
        onSubmit={(event) => event.preventDefault()}
      >
        <section className="sync-panel" aria-label="行動者檢視同步確認">
          <div>
            <h3>同步到行動者檢視</h3>
            <p>同步只建立一份可閱讀快照，不代表資料已查核，也不會變成任務。</p>
            {draft.actionSnapshot ? (
              <p>
                上次同步：{formatDateTime(draft.actionSnapshot.sharedAt)}
                {hasUnsyncedChanges ? "，草稿同步後已有新修改。" : ""}
              </p>
            ) : (
              <p>目前尚未同步到行動者檢視。</p>
            )}
          </div>
          <button
            className="primary-action"
            disabled={!canSyncToActionView}
            type="button"
            onClick={handleSyncToActionView}
          >
            同步到行動者檢視
          </button>
          <p className="sync-panel__message">{syncMessage}</p>
        </section>

        <div className="field-grid">
          <label className="field">
            <span>原文清楚度</span>
            <select
              value={draft.rawClarity}
              onChange={(event) =>
                onUpdate(
                  { rawClarity: event.target.value as V1RawClarity },
                  "更新原文清楚度。",
                )
              }
            >
              {Object.entries(rawClarityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>候選類型</span>
            <select
              value={draft.candidateKind}
              onChange={(event) =>
                onUpdate(
                  { candidateKind: event.target.value as Phase0PossibleKind },
                  "更新候選類型。",
                )
              }
            >
              {Object.entries(kindLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>整理狀態</span>
            <select
              value={draft.reviewState}
              onChange={(event) =>
                onUpdate(
                  { reviewState: event.target.value as V1ReviewState },
                  "更新整理狀態。",
                )
              }
            >
              {Object.entries(reviewStateLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>下一步</span>
            <select
              value={draft.suggestedNextStep}
              onChange={(event) =>
                onUpdate(
                  {
                    suggestedNextStep: event.target
                      .value as Phase0SuggestedNextStep,
                  },
                  "更新下一步。",
                )
              }
            >
              {Object.entries(nextStepLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="check-field">
          <input
            checked={draft.unsafeToActDirectly}
            type="checkbox"
            onChange={(event) =>
              onUpdate(
                { unsafeToActDirectly: event.target.checked },
                "更新是否不可直接行動。",
              )
            }
          />
          <span>不能直接變成任務或行動依據</span>
        </label>

        <label className="field">
          <span>候選摘要</span>
          <textarea
            rows={4}
            value={draft.summary}
            placeholder="只整理原文可支撐的內容，不補真實地址、電話、人物或現場判斷。"
            onChange={(event) =>
              onUpdate({ summary: event.target.value }, "更新候選摘要。")
            }
          />
        </label>

        <label className="field">
          <span>人工確認註記</span>
          <textarea
            rows={3}
            value={draft.humanReviewNote}
            onChange={(event) =>
              onUpdate(
                { humanReviewNote: event.target.value },
                "更新人工確認註記。",
              )
            }
          />
        </label>

        <label className="field">
          <span>判斷理由</span>
          <textarea
            rows={3}
            value={draft.decisionReason}
            onChange={(event) =>
              onUpdate({ decisionReason: event.target.value }, "更新判斷理由。")
            }
          />
        </label>
      </form>
    </div>
  );
}

function ActionView({
  onSelect,
  records,
  reviewDrafts,
}: {
  onSelect: (recordId: string) => void;
  records: V1CombinedRecord[];
  reviewDrafts: V1ReviewDraft[];
}) {
  const actionItems = reviewDrafts
    .map((draft) => ({
      draft,
      record: records.find((item) => item.id === draft.recordId),
      snapshot: draft.actionSnapshot,
    }))
    .filter(
      (
        item,
      ): item is {
        draft: V1ReviewDraft;
        record: V1CombinedRecord;
        snapshot: NonNullable<V1ReviewDraft["actionSnapshot"]>;
      } => Boolean(item.record && item.snapshot),
    )
    .sort((a, b) => b.snapshot.sharedAt.localeCompare(a.snapshot.sharedAt));

  return (
    <div className="v1-action-view">
      <div className="panel__header">
        <div>
          <h2>【行動者檢視】</h2>
          <p>
            這裡只給行動者看整理草稿與限制，不是派工單，也不代表資料已查核。
          </p>
        </div>
        <p>可查看草稿：{actionItems.length} 筆</p>
      </div>

      {actionItems.length === 0 ? (
        <div className="empty-state">
          目前沒有可給行動者查看的整理快照。請先到「整理判斷」建立摘要、
          下一步與人工確認註記，並按下同步。
        </div>
      ) : (
        <div className="table-frame">
          <table className="admin-table v1-action-table">
            <thead>
              <tr>
                <th scope="col">案號 / 狀態</th>
                <th scope="col">整理給行動者看的摘要</th>
                <th scope="col">行動前限制</th>
                <th scope="col">下一步</th>
                <th scope="col">回整理</th>
              </tr>
            </thead>
            <tbody>
              {actionItems.map(({ draft, record, snapshot }) => {
                const hasNewDraftChanges = draft.updatedAt > snapshot.sharedAt;
                return (
                  <tr key={draft.recordId}>
                    <td className="case-id">
                      <strong>{record.id}</strong>
                      <span className="draft-state">
                        {recordOriginLabels[record.origin as V1RecordOrigin]}
                      </span>
                      <SourceLabel sourceType={record.sourceType} />
                      <StatusBadge status={record.verificationStatus} />
                      <div className="table-tags">
                        <span>{reviewStateLabels[snapshot.reviewState]}</span>
                        <span>{rawClarityLabels[snapshot.rawClarity]}</span>
                        <span>{kindLabels[snapshot.candidateKind]}</span>
                        <span>同步：{formatDateTime(snapshot.sharedAt)}</span>
                        {hasNewDraftChanges ? (
                          <span>整理頁已有新修改</span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <p>{snapshot.summary}</p>
                      <p className="draft-editor__notice">
                        原文：{record.rawText}
                      </p>
                    </td>
                    <td>
                      <p>
                        {snapshot.unsafeToActDirectly
                          ? "不能直接變成任務或行動依據。"
                          : "仍需人工確認情境後才能判斷是否可行動。"}
                      </p>
                      <p>{snapshot.humanReviewNote}</p>
                      <p>{snapshot.decisionReason}</p>
                    </td>
                    <td>
                      <strong>
                        {nextStepLabels[snapshot.suggestedNextStep]}
                      </strong>
                      <p>
                        請先依人工確認註記補足資訊，再由人決定是否進入任務流程。
                      </p>
                    </td>
                    <td>
                      <button type="button" onClick={() => onSelect(record.id)}>
                        回到整理判斷
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AuditPanel({
  auditCount,
  observerRecords,
  onReset,
  reviewDrafts,
}: {
  auditCount: number;
  observerRecords: V1ObserverRecord[];
  onReset: () => void;
  reviewDrafts: V1ReviewDraft[];
}) {
  const events = [
    ...observerRecords.flatMap((record) =>
      record.auditTrail.map((event) => ({
        ...event,
        recordId: record.localId,
      })),
    ),
    ...reviewDrafts.flatMap((draft) =>
      draft.auditTrail.map((event) => ({ ...event, recordId: draft.recordId })),
    ),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="v1-audit">
      <div className="panel__header">
        <div>
          <h2>【本機操作與判斷紀錄】</h2>
          <p>紀錄只存在本機，用來回看整理判斷，不代表正式保存。</p>
        </div>
        <p>紀錄件數：{auditCount}</p>
      </div>

      <div className="draft-actions">
        <button className="danger-action" type="button" onClick={onReset}>
          清除全部本機草稿
        </button>
      </div>

      {events.length === 0 ? (
        <div className="empty-state">目前沒有本機操作紀錄。</div>
      ) : (
        <div className="table-frame">
          <table className="admin-table v1-audit-table">
            <thead>
              <tr>
                <th scope="col">時間</th>
                <th scope="col">案號</th>
                <th scope="col">動作</th>
                <th scope="col">紀錄</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{formatDateTime(event.at)}</td>
                  <td className="case-id">{event.recordId}</td>
                  <td>{event.action}</td>
                  <td>{event.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function observerRecordToCombinedRecord(
  record: V1ObserverRecord,
): V1CombinedRecord {
  return {
    actorRelation: record.actorRelation,
    auditTrail: record.auditTrail,
    id: record.localId,
    observedAt: record.observedAt,
    origin: "local_observer",
    rawText: record.rawText,
    sourceType: record.sourceType,
    uncertaintyNote: record.uncertaintyNote,
    updatedAt: record.updatedAt,
    verificationStatus: record.verificationStatus,
  };
}
