import { RecordCard } from "../../components/RecordCard";
import { StatusBadge } from "../../components/StatusBadge";
import { Phase0JudgementCard } from "./Phase0JudgementCard";
import { createPhase0Judgement } from "./phase0-heuristics";
import {
  actorRelationLabels,
  confidenceLabels,
  kindLabels,
  nextStepLabels,
} from "./phase0-labels";
import type {
  Phase0ActorRelation,
  Phase0Confidence,
  Phase0MessyRecord,
  Phase0OrganizedDraft,
  Phase0PossibleKind,
  Phase0SuggestedNextStep,
} from "./phase0-types";

const kindOptions = Object.entries(kindLabels) as Array<
  [Phase0PossibleKind, string]
>;
const confidenceOptions = Object.entries(confidenceLabels) as Array<
  [Phase0Confidence, string]
>;
const nextStepOptions = Object.entries(nextStepLabels) as Array<
  [Phase0SuggestedNextStep, string]
>;
const actorRelationOptions = Object.entries(actorRelationLabels) as Array<
  [Phase0ActorRelation, string]
>;

export function Phase0Workbench({
  records,
  selectedRecordId,
  onSelect,
  drafts,
  onCreateDraft,
  onUpdateDraft,
  onDeleteDraft,
  onResetDraft,
  onConfirmDraft,
  onReopenDraft,
}: {
  records: Phase0MessyRecord[];
  selectedRecordId: string;
  onSelect: (recordId: string) => void;
  drafts: Phase0OrganizedDraft[];
  onCreateDraft: (recordId: string) => void;
  onUpdateDraft: (
    recordId: string,
    patch: Partial<Phase0OrganizedDraft>,
  ) => void;
  onDeleteDraft: (recordId: string) => void;
  onResetDraft: (recordId: string) => void;
  onConfirmDraft: (recordId: string) => void;
  onReopenDraft: (recordId: string) => void;
}) {
  const selectedRecord =
    records.find((record) => record.id === selectedRecordId) ?? records[0];
  const safetyBoundary = createPhase0Judgement(selectedRecord);
  const selectedDraft = drafts.find(
    (draft) => draft.messyRecordId === selectedRecord.id,
  );
  const confirmedCount = drafts.filter(
    (draft) => draft.status === "organized_confirmed",
  ).length;
  const directUnsafeCount = drafts.filter(
    (draft) => draft.unsafeToActDirectly,
  ).length;
  const needsHumanReviewCount = drafts.filter(
    (draft) =>
      draft.suggestedNextStep === "send_to_human_review" ||
      draft.actorRelation === "third_party" ||
      draft.actorRelation === "unknown",
  ).length;

  return (
    <div className="workbench">
      <div className="workbench__intro">
        <p className="eyebrow">整理工作台作業區</p>
        <h2>【資料整理及人工確認列管作業】</h2>
        <p>
          本作業區依據原始資訊逐筆辦理候選類型、判斷依據、不可直接行動原因及人工確認註記。
          第一階段的成功不是分類正確，而是把為什麼現在還不能判斷說清楚。
        </p>
      </div>

      <div className="workbench__layout">
        <aside className="workbench__queue" aria-label="選擇原始資訊">
          <h3>案件清單</h3>
          {records.map((record) => (
            <QueueButton
              draft={drafts.find((item) => item.messyRecordId === record.id)}
              isActive={record.id === selectedRecord.id}
              key={record.id}
              onSelect={() => onSelect(record.id)}
              record={record}
            />
          ))}
        </aside>

        <div className="workbench__main">
          <RecordCard record={selectedRecord} />

          {selectedDraft ? (
            <DraftEditor
              draft={selectedDraft}
              onConfirm={() => onConfirmDraft(selectedRecord.id)}
              onDelete={() => onDeleteDraft(selectedRecord.id)}
              onReopen={() => onReopenDraft(selectedRecord.id)}
              onReset={() => onResetDraft(selectedRecord.id)}
              onUpdate={(patch) => onUpdateDraft(selectedRecord.id, patch)}
              record={selectedRecord}
            />
          ) : (
            <div className="draft-empty">
              <div>
                <p className="eyebrow">尚未送入整理</p>
                <h3>這筆原始資訊還沒有整理草稿</h3>
                <p>
                  建立草稿後才能編輯候選類型、整理摘要、不能直接行動的原因與人工確認註記。
                </p>
              </div>
              <button
                className="primary-action"
                type="button"
                onClick={() => onCreateDraft(selectedRecord.id)}
              >
                建立整理草稿
              </button>
              <Phase0JudgementCard
                judgement={safetyBoundary}
                record={selectedRecord}
              />
            </div>
          )}
        </div>

        <aside className="workbench__checklist">
          <h3>e化作業檢核</h3>
          <ul>
            <li>原始資訊登錄：{records.length} 筆</li>
            <li>整理草稿列管：{drafts.length} 筆</li>
            <li>已整理資訊彙整：{confirmedCount} 筆</li>
            <li>不可直接行動：{directUnsafeCount} 筆</li>
            <li>人工確認或角色釐清：{needsHumanReviewCount} 筆</li>
            <li>
              請將資料品質問題登錄於 observations，並於 AI log 留存 agent
              判斷限制。
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

function QueueButton({
  draft,
  isActive,
  onSelect,
  record,
}: {
  draft?: Phase0OrganizedDraft;
  isActive: boolean;
  onSelect: () => void;
  record: Phase0MessyRecord;
}) {
  return (
    <button
      className={isActive ? "active" : ""}
      type="button"
      onClick={onSelect}
    >
      <span className="queue-id">{record.id}</span>
      <span className="queue-badges">
        <StatusBadge status={record.verificationStatus} />
        {draft ? (
          <StatusBadge status={draft.status} />
        ) : (
          <span className="draft-state">未建草稿</span>
        )}
      </span>
    </button>
  );
}

function DraftEditor({
  draft,
  onConfirm,
  onDelete,
  onReopen,
  onReset,
  onUpdate,
  record,
}: {
  draft: Phase0OrganizedDraft;
  onConfirm: () => void;
  onDelete: () => void;
  onReopen: () => void;
  onReset: () => void;
  onUpdate: (patch: Partial<Phase0OrganizedDraft>) => void;
  record: Phase0MessyRecord;
}) {
  const canConfirm =
    draft.summary.trim().length > 0 ||
    (draft.humanReviewNote ?? "").trim().length > 0 ||
    draft.humanCorrection.trim().length > 0;

  return (
    <form className="draft-editor" onSubmit={(event) => event.preventDefault()}>
      <div className="draft-editor__header">
        <div>
          <p className="eyebrow">案件整理表單</p>
          <h3>{draft.title}</h3>
        </div>
        <StatusBadge status={draft.status} />
      </div>

      <p className="draft-editor__notice">
        ※ 本草稿只表示小組完成整理判斷；原始資料的查核狀態仍是
        <strong> {record.verificationStatus}</strong>。
      </p>

      <label className="field">
        <span>草稿標題</span>
        <input
          value={draft.title}
          onChange={(event) => onUpdate({ title: event.target.value })}
        />
      </label>

      <label className="field">
        <span>整理摘要</span>
        <textarea
          rows={4}
          value={draft.summary}
          placeholder="只整理原文中可被看見的資訊，不補真實地址、電話或未出現的事實。"
          onChange={(event) => onUpdate({ summary: event.target.value })}
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>候選類型</span>
          <select
            value={draft.possibleKind}
            onChange={(event) =>
              onUpdate({
                possibleKind: event.target.value as Phase0PossibleKind,
              })
            }
          >
            {kindOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>信心程度</span>
          <select
            value={draft.confidence}
            onChange={(event) =>
              onUpdate({ confidence: event.target.value as Phase0Confidence })
            }
          >
            {confidenceOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>操作者 / 來源角色</span>
          <select
            value={draft.actorRelation}
            onChange={(event) =>
              onUpdate({
                actorRelation: event.target.value as Phase0ActorRelation,
              })
            }
          >
            {actorRelationOptions.map(([value, label]) => (
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
              onUpdate({
                suggestedNextStep: event.target
                  .value as Phase0SuggestedNextStep,
              })
            }
          >
            {nextStepOptions.map(([value, label]) => (
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
            onUpdate({ unsafeToActDirectly: event.target.checked })
          }
        />
        <span>不能直接變成任務或行動依據</span>
      </label>

      <label className="field">
        <span>判斷依據，一行一項</span>
        <textarea
          rows={4}
          value={draft.evidence.join("\n")}
          onChange={(event) =>
            onUpdate({ evidence: splitTextAreaLines(event.target.value) })
          }
        />
      </label>

      <label className="field">
        <span>卡住原因 / 不能直接使用的原因，一行一項</span>
        <textarea
          rows={4}
          value={draft.blockers.join("\n")}
          onChange={(event) =>
            onUpdate({ blockers: splitTextAreaLines(event.target.value) })
          }
        />
      </label>

      <label className="field">
        <span>人工確認註記</span>
        <textarea
          rows={3}
          value={draft.humanReviewNote ?? ""}
          placeholder="例如：來源不是當事人、日期不明、與另一筆資訊衝突。"
          onChange={(event) =>
            onUpdate({ humanReviewNote: event.target.value })
          }
        />
      </label>

      <label className="field">
        <span>人類質疑或修正 agent 判斷</span>
        <textarea
          rows={3}
          value={draft.humanCorrection}
          placeholder="記錄小組不同意或修正的地方，避免把推測當成事實。"
          onChange={(event) =>
            onUpdate({ humanCorrection: event.target.value })
          }
        />
      </label>

      <div className="draft-actions">
        {draft.status === "organized_confirmed" ? (
          <button type="button" onClick={onReopen}>
            取消整理確認
          </button>
        ) : (
          <button
            className="primary-action"
            disabled={!canConfirm}
            type="button"
            onClick={onConfirm}
          >
            確認列入已整理資訊
          </button>
        )}
        <button type="button" onClick={onReset}>
          重設為安全預設
        </button>
        <button className="danger-action" type="button" onClick={onDelete}>
          刪除草稿
        </button>
      </div>
    </form>
  );
}

function splitTextAreaLines(value: string): string[] {
  return value.split("\n");
}
