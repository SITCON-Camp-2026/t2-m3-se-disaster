export function AiProcessingWindow({ caseId }: { caseId?: string }) {
  return (
    <div
      aria-label="AI e化辦理進度提示"
      aria-live="polite"
      className="ai-processing-window"
    >
      <div className="ai-processing-window__title">
        <span>◆ 本系統處理狀態</span>
        <strong>資料整理 e 化公文傳送中</strong>
      </div>
      <div className="ai-processing-window__bar" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <ul>
        <li>受理案號：{caseId ?? "尚未建立案號"}，刻正辦理草稿整理。</li>
        <li>本系統正在洽請本機 opencode e化服務協助產生候選內容。</li>
        <li>請勿重複點選按鈕，請耐心等候，謝謝您的合作！</li>
      </ul>
    </div>
  );
}
