import { SourceLabel } from "../../components/SourceLabel";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDateTime } from "../../lib/date";
import {
  actorRelationLabels,
  confidenceLabels,
  kindLabels,
  nextStepLabels,
} from "./phase0-labels";
import type { Phase0MessyRecord, Phase0OrganizedDraft } from "./phase0-types";

export function Phase0OrganizedInfoPanel({
  drafts,
  records,
  onEdit,
}: {
  drafts: Phase0OrganizedDraft[];
  records: Phase0MessyRecord[];
  onEdit: (recordId: string) => void;
}) {
  const confirmedDrafts = drafts.filter(
    (draft) => draft.status === "organized_confirmed",
  );

  return (
    <div className="organized-info">
      <div className="panel__header">
        <div>
          <h2>【已整理資訊彙整表】</h2>
          <p>
            本表為工作台整理完成清冊，僅代表整理程序完成，不代表正式查核完成資料。
          </p>
        </div>
        <p>已整理列管：{confirmedDrafts.length} 筆</p>
      </div>

      {confirmedDrafts.length === 0 ? (
        <div className="empty-state">
          尚未有整理確認的資料。請先到整理工作台編輯草稿並按下確認。
        </div>
      ) : (
        <div className="table-frame organized-frame">
          <table className="admin-table organized-table">
            <thead>
              <tr>
                <th scope="col">案號</th>
                <th scope="col">整理項目</th>
                <th scope="col">候選類型 / 信心</th>
                <th scope="col">整理摘要與依據</th>
                <th scope="col">限制事項與人工確認</th>
                <th scope="col">下一步</th>
                <th scope="col">作業</th>
              </tr>
            </thead>
            <tbody>
              {confirmedDrafts.map((draft) => {
                const record = records.find(
                  (item) => item.id === draft.messyRecordId,
                );
                const evidence = visibleLines(draft.evidence);
                const blockers = visibleLines(draft.blockers);

                return (
                  <tr key={draft.id}>
                    <td className="case-id">
                      <strong>{draft.messyRecordId}</strong>
                      <StatusBadge status={draft.status} />
                      {record ? (
                        <StatusBadge status={record.verificationStatus} />
                      ) : null}
                    </td>
                    <td>
                      <strong>{draft.title}</strong>
                      {record ? (
                        <div className="table-meta">
                          <SourceLabel sourceType={record.sourceType} />
                          <span>
                            原始更新：{formatDateTime(record.updatedAt)}
                          </span>
                          <span>
                            整理登錄：
                            {draft.confirmedAt
                              ? formatDateTime(draft.confirmedAt)
                              : "未記錄"}
                          </span>
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div className="table-tags">
                        <span>{kindLabels[draft.possibleKind]}</span>
                        <span>信心：{confidenceLabels[draft.confidence]}</span>
                        <span>{actorRelationLabels[draft.actorRelation]}</span>
                      </div>
                    </td>
                    <td>
                      <p>{draft.summary || "尚未填寫整理摘要。"}</p>
                      {evidence.length > 0 ? (
                        <ul>
                          {evidence.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>尚未標出依據。</p>
                      )}
                    </td>
                    <td>
                      <strong>
                        {draft.unsafeToActDirectly
                          ? "不可直接行動"
                          : "仍需情境確認"}
                      </strong>
                      {blockers.length > 0 ? (
                        <ul>
                          {blockers.map((item, index) => (
                            <li key={`${item}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>沒有額外註記。</p>
                      )}
                      {draft.humanReviewNote ? (
                        <p>※ {draft.humanReviewNote}</p>
                      ) : null}
                      {draft.humanCorrection ? (
                        <p>人類修正：{draft.humanCorrection}</p>
                      ) : null}
                    </td>
                    <td>{nextStepLabels[draft.suggestedNextStep]}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => onEdit(draft.messyRecordId)}
                      >
                        回工作台
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

function visibleLines(lines: string[]): string[] {
  return lines.map((line) => line.trim()).filter(Boolean);
}
