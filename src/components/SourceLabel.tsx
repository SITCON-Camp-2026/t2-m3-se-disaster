const labels: Record<string, string> = {
  field_report: "現場回報",
  phone_call: "電話",
  social_post: "社群轉錄",
  official_notice: "官方公告",
  volunteer_update: "志工更新",
  observer_input: "觀測者輸入",
  mock: "模擬資料",
};

export function SourceLabel({ sourceType }: { sourceType: string }) {
  return (
    <span className="source-label">
      來源：{labels[sourceType] ?? sourceType}
    </span>
  );
}
