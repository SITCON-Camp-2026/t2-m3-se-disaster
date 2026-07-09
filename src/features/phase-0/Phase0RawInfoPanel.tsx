import { SourceLabel } from "../../components/SourceLabel";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDateTime } from "../../lib/date";
import type { Phase0MessyRecord } from "./phase0-types";

export function Phase0RawInfoPanel({
  records,
  selectedRecordId,
  onSelect,
}: {
  records: Phase0MessyRecord[];
  selectedRecordId: string;
  onSelect: (recordId: string) => void;
}) {
  return (
    <div className="phase0-raw">
      <div className="panel__header">
        <div>
          <h2>【原始資訊登錄清冊】</h2>
          <p>以下資料尚未完成查核程序，請務必依序送入整理工作台辦理。</p>
        </div>
        <p>登錄件數：{records.length} 筆</p>
      </div>

      <div className="table-frame">
        <table className="admin-table raw-table">
          <thead>
            <tr>
              <th scope="col">案號</th>
              <th scope="col">原始文字內容摘要</th>
              <th scope="col">來源類別</th>
              <th scope="col">查核狀態</th>
              <th scope="col">更新時間</th>
              <th scope="col">作業</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr
                className={
                  record.id === selectedRecordId ? "admin-row--selected" : ""
                }
                key={record.id}
              >
                <td className="case-id">{record.id}</td>
                <td>{record.rawText}</td>
                <td>
                  <SourceLabel sourceType={record.sourceType} />
                </td>
                <td>
                  <StatusBadge status={record.verificationStatus} />
                </td>
                <td>{formatDateTime(record.updatedAt)}</td>
                <td>
                  <button type="button" onClick={() => onSelect(record.id)}>
                    送整理
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
