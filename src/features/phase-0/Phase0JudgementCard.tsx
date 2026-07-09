import { StatusBadge } from "../../components/StatusBadge";
import { confidenceLabels, kindLabels, nextStepLabels } from "./phase0-labels";
import type { Phase0JudgementDraft, Phase0MessyRecord } from "./phase0-types";

export function Phase0JudgementCard({
  judgement,
  record,
}: {
  judgement: Phase0JudgementDraft;
  record: Phase0MessyRecord;
}) {
  return (
    <article className="judgement-card">
      <div className="judgement-card__header">
        <div>
          <p className="eyebrow">Starter 安全預設</p>
          <h3>尚未建立整理草稿</h3>
        </div>
        <StatusBadge status={record.verificationStatus} />
      </div>

      <p>
        這張卡只保留保守的安全邊界，不是 agent 對這筆資料的整理答案。請讓 coding
        agent 實作可建立、編輯與刪除的整理草稿。
      </p>

      <dl className="judgement-summary">
        <div>
          <dt>候選類型</dt>
          <dd>{kindLabels[judgement.possibleKind]}</dd>
        </div>
        <div>
          <dt>信心程度</dt>
          <dd>{confidenceLabels[judgement.confidence]}</dd>
        </div>
        <div>
          <dt>下一步</dt>
          <dd>{nextStepLabels[judgement.suggestedNextStep]}</dd>
        </div>
      </dl>

      <p>
        能否直接行動：
        <strong>
          {judgement.unsafeToActDirectly ? "不可直接行動" : "仍需確認情境"}
        </strong>
      </p>

      <section>
        <h4>目前只有安全預設</h4>
        <ul>
          {judgement.evidence.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h4>目前卡住的地方</h4>
        <ul>
          {judgement.blockers.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </article>
  );
}
