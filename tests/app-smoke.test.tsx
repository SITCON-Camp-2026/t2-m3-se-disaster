import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/app/App";

function expectHeroStat(label: string, value: string) {
  const statLabel = screen
    .getAllByText(label)
    .find((node) => node.tagName.toLowerCase() === "dt");

  if (!statLabel) {
    throw new Error(`找不到首頁統計欄位：${label}`);
  }

  expect(statLabel.nextElementSibling).toHaveTextContent(value);
}

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, "", "/");
    window.localStorage.clear();
  });

  it("renders starter title", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /災害資訊\s*整理工作台/ }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("AI e化自動整理廣告專區")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "按此辦理 AI e化整理" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "進入 v1 重新整理工作台" }),
    ).toBeInTheDocument();
  });

  it("keeps the home page focused on phase 0 tabs", () => {
    render(<App />);

    expect(
      screen.getByRole("button", { name: /原始資訊登錄/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /整理工作台作業/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /已整理資訊彙整/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "通報" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "地點" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "志工任務" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "人員指派" }),
    ).not.toBeInTheDocument();
  });

  it("shows review states in the phase 0 workbench", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /整理工作台作業/ }));

    expect(screen.getByText(/第一階段的成功不是分類正確/)).toBeInTheDocument();
    expect(screen.getAllByText("待人工確認").length).toBeGreaterThan(0);
    expect(screen.getAllByText("未查核").length).toBeGreaterThan(0);
  });

  it("shows editable drafts in the phase 0 workbench", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /整理工作台作業/ }));

    expect(screen.getByLabelText("整理摘要")).toBeInTheDocument();
    expect(screen.getByLabelText("候選類型")).toBeInTheDocument();
    expect(screen.getByLabelText("信心程度")).toBeInTheDocument();
    expect(screen.getByLabelText("操作者 / 來源角色")).toBeInTheDocument();
    expect(screen.getByLabelText("下一步")).toBeInTheDocument();
    expect(screen.getByLabelText("人工確認註記")).toBeInTheDocument();
    expect(screen.queryByLabelText("草稿標題")).not.toBeInTheDocument();
    expect(screen.queryByText("判斷依據，一行一項")).not.toBeInTheDocument();
    expect(
      screen.queryByText("卡住原因 / 不能直接使用的原因，一行一項"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/整理草稿列管：12 筆/)).toBeInTheDocument();
  });

  it("keeps line breaks while editing human review notes", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /整理工作台作業/ }));

    fireEvent.change(screen.getByLabelText("人工確認註記"), {
      target: { value: "未確認完整位置\n未確認需求是否仍存在\n" },
    });

    expect(screen.getByLabelText("人工確認註記")).toHaveValue(
      "未確認完整位置\n未確認需求是否仍存在\n",
    );
  });

  it("applies local AI organizer suggestions as draft-only workbench data", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({
        notice: "AI 建議已送入工作台草稿，請人工確認後再列管。",
        patch: {
          actorRelation: "third_party",
          confidence: "low",
          humanReviewNote:
            "AI 只依原文整理，需要人工確認位置與是否仍有效。\nAI 草稿未經人工確認，不得視為已查核事實。",
          possibleKind: "task_candidate",
          suggestedNextStep: "send_to_human_review",
          summary: "AI 草稿摘要：原文提到清泥需求，但位置與時效不足。",
          title: "M-001 AI 清泥需求草稿",
          unsafeToActDirectly: true,
        },
      }),
      ok: true,
    } as Response);

    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: "按此辦理 AI e化整理" }),
    );

    expect(
      await screen.findByText(/AI 建議已送入工作台草稿/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("整理摘要")).toHaveValue(
      "AI 草稿摘要：原文提到清泥需求，但位置與時效不足。",
    );
    expect(screen.getByLabelText("人工確認註記")).toHaveValue(
      "AI 只依原文整理，需要人工確認位置與是否仍有效。\nAI 草稿未經人工確認，不得視為已查核事實。",
    );
    expect(screen.getAllByText("草稿").length).toBeGreaterThan(0);

    fetchMock.mockRestore();
  });

  it("confirms edited drafts into the organized information tab", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /整理工作台作業/ }));
    fireEvent.click(screen.getByRole("button", { name: "取消整理確認" }));
    fireEvent.change(screen.getByLabelText("整理摘要"), {
      target: {
        value: "原文提到需要清泥人力，但地址只到模糊地標，不能直接派工。",
      },
    });
    fireEvent.change(screen.getByLabelText("候選類型"), {
      target: { value: "task_candidate" },
    });
    fireEvent.change(screen.getByLabelText("信心程度"), {
      target: { value: "medium" },
    });
    fireEvent.change(screen.getByLabelText("操作者 / 來源角色"), {
      target: { value: "third_party" },
    });
    fireEvent.change(screen.getByLabelText("人工確認註記"), {
      target: { value: "需要確認實際位置與需求是否仍存在。" },
    });

    fireEvent.click(screen.getByRole("button", { name: "確認列入已整理資訊" }));

    expect(
      screen.getByRole("heading", { name: "【已整理資訊彙整表】" }),
    ).toBeInTheDocument();
    expect(screen.getByText("M-001 清泥人力需求位置不明")).toBeInTheDocument();
    expect(screen.getAllByText("整理已確認").length).toBeGreaterThan(0);
    expect(screen.getByText(/不能直接派工/)).toBeInTheDocument();
    expect(screen.getAllByText("信心：中").length).toBeGreaterThan(0);
    expect(screen.getAllByText("第三方轉述").length).toBeGreaterThan(0);
  });

  it("shows the prepared organized information list", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /已整理資訊彙整/ }));

    expect(screen.getByText("已整理列管：12 筆")).toBeInTheDocument();
    expect(
      screen.getByText("M-010 活動中心物資盤點與登記動線"),
    ).toBeInTheDocument();
    expect(screen.getByText(/不代表正式查核完成資料/)).toBeInTheDocument();
    expect(screen.queryByText("判斷依據")).not.toBeInTheDocument();
    expect(screen.queryByText("整理摘要與依據")).not.toBeInTheDocument();
    expect(screen.queryByText("限制事項與人工確認")).not.toBeInTheDocument();
    expect(screen.queryByText(/人類修正：/)).not.toBeInTheDocument();
  });

  it("renders the v1 workbench at /v1/", () => {
    window.history.pushState({}, "", "/v1/");

    render(<App />);

    expect(
      screen.getByRole("heading", { name: /v1 資訊\s*整理工作台/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /未整理資料清冊/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /觀測者新增/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /行動者檢視/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Phase 0 原始資訊/).length).toBeGreaterThan(0);
    expect(
      screen.queryByLabelText("AI e化自動整理廣告專區"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "返回 Phase 0 首頁" }),
    ).toHaveAttribute("href", "/");
    expectHeroStat("待人工確認", "0");

    const firstReviewButton = screen.getAllByRole("button", {
      name: "進行整理",
    })[0];
    if (!firstReviewButton) {
      throw new Error("找不到進行整理按鈕");
    }
    fireEvent.click(firstReviewButton);

    expect(
      screen.getByLabelText("v1 AI e化自動整理草稿區"),
    ).toBeInTheDocument();
    expectHeroStat("待人工確認", "1");
  });

  it("renders the v1 workbench under a GitHub Pages repository path", () => {
    window.history.pushState({}, "", "/t2-m3-se-disaster/v1/");

    render(<App />);

    expect(
      screen.getByRole("heading", { name: /v1 資訊\s*整理工作台/ }),
    ).toBeInTheDocument();
  });

  it("applies v1 AI organizer output from the opencode proxy as draft data", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({
        model: "@cf/moonshotai/kimi-k2.7-code",
        notice: "AI e化草稿已送入 v1 整理欄位，請人工確認後再給行動者查看。",
        patch: {
          candidateKind: "task_candidate",
          decisionReason:
            "AI 只依原文整理，地址仍模糊，不能判斷是否可以派工。\nAI 沒有查核外部資料，也沒有判斷是否可以行動。",
          humanReviewNote:
            "AI 草稿未經人工確認，不得視為已查核事實。\n需要人工確認位置與需求是否仍有效。",
          rawClarity: "unclear",
          reviewState: "candidate_draft",
          suggestedNextStep: "ask_for_more_info",
          summary: "AI 草稿摘要：原文提到清泥人力需求，但地點描述不足。",
          unsafeToActDirectly: true,
        },
      }),
      ok: true,
    } as Response);
    window.history.pushState({}, "", "/v1/");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /整理判斷/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "按此辦理 AI e化整理" }),
    );

    expect(
      await screen.findByText(/AI e化草稿已送入 v1 整理欄位/),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/ai-organize",
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.getByLabelText("候選摘要")).toHaveValue(
      "AI 草稿摘要：原文提到清泥人力需求，但地點描述不足。",
    );
    expect(
      (screen.getByLabelText("人工確認註記") as HTMLTextAreaElement).value,
    ).toContain("AI 草稿未經人工確認");
    expect(screen.getByLabelText("整理狀態")).toHaveValue("candidate_draft");
    expectHeroStat("待人工確認", "0");
    expect(screen.queryByText("已查核")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "同步到行動者檢視" }),
    ).toBeEnabled();
  });

  it("shows a ROC-style progress notice while v1 AI organizer is running", async () => {
    let resolveFetch!: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    vi.spyOn(globalThis, "fetch").mockReturnValue(fetchPromise);
    window.history.pushState({}, "", "/v1/");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /整理判斷/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "按此辦理 AI e化整理" }),
    );

    expect(screen.getByLabelText("AI e化辦理進度提示")).toBeInTheDocument();
    expect(screen.getByText(/資料整理 e 化公文傳送中/)).toBeInTheDocument();
    expect(screen.getByText(/請勿重複點選按鈕/)).toBeInTheDocument();

    resolveFetch({
      json: async () => ({
        notice: "AI e化草稿已送入 v1 整理欄位，請人工確認後再給行動者查看。",
        patch: {
          candidateKind: "task_candidate",
          decisionReason:
            "AI 只依原文整理，缺少可派工位置與時效。\nAI 沒有查核外部資料，也沒有判斷是否可以行動。",
          humanReviewNote:
            "AI 草稿未經人工確認，不得視為已查核事實。\n行動前需補問來源。",
          rawClarity: "unclear",
          reviewState: "candidate_draft",
          suggestedNextStep: "ask_for_more_info",
          summary: "AI 草稿摘要：清泥需求位置不明，需補問來源。",
          unsafeToActDirectly: true,
        },
      }),
      ok: true,
    } as Response);

    expect(
      await screen.findByText(/AI e化草稿已送入 v1 整理欄位/),
    ).toBeInTheDocument();
  });

  it("shows only synced v1 snapshots in the read-only action viewer", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: async () => ({
        notice: "AI e化草稿已送入 v1 整理欄位，請人工確認後再給行動者查看。",
        patch: {
          candidateKind: "task_candidate",
          decisionReason:
            "AI 只依原文整理，缺少可派工位置與時效。\nAI 沒有查核外部資料，也沒有判斷是否可以行動。",
          humanReviewNote:
            "AI 草稿未經人工確認，不得視為已查核事實。\n行動前需補問來源。",
          rawClarity: "unclear",
          reviewState: "candidate_draft",
          suggestedNextStep: "ask_for_more_info",
          summary: "AI 草稿摘要：清泥需求位置不明，需補問來源。",
          unsafeToActDirectly: true,
        },
      }),
      ok: true,
    } as Response);
    window.history.pushState({}, "", "/v1/");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /整理判斷/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "按此辦理 AI e化整理" }),
    );
    await screen.findByText(/AI e化草稿已送入 v1 整理欄位/);

    fireEvent.click(screen.getByRole("button", { name: /^◆\s*行動者檢視$/ }));
    expect(screen.getByText(/目前沒有可給行動者查看/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /整理判斷/ }));
    fireEvent.click(screen.getByRole("button", { name: "同步到行動者檢視" }));
    expect(screen.getByText(/已同步一份快照/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^◆\s*行動者檢視$/ }));

    expect(
      screen.getByRole("heading", { name: "【行動者檢視】" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/不是派工單/)).toBeInTheDocument();
    expect(screen.getByText(/清泥需求位置不明/)).toBeInTheDocument();
    expect(screen.getByText(/不能直接變成任務/)).toBeInTheDocument();
    expect(screen.getByText(/補問來源或現場資訊/)).toBeInTheDocument();
    expect(screen.getByText(/同步：/)).toBeInTheDocument();
  });

  it("adds observer input as local unverified v1 draft", () => {
    window.history.pushState({}, "", "/v1/");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /觀測者新增/ }));
    fireEvent.change(screen.getByLabelText("原始文字"), {
      target: {
        value: "練習場域活動中心旁有人說雨鞋數量需要重新確認。",
      },
    });
    fireEvent.change(screen.getByLabelText("我不確定的地方"), {
      target: { value: "時間和來源角色都還需要人工確認。" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "儲存為本機未整理草稿" }),
    );

    expect(
      screen.getByRole("heading", { name: "【資訊整理判斷】" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("原文清楚度")).toBeInTheDocument();
    expect(screen.queryByLabelText("信心程度")).not.toBeInTheDocument();
    expect(screen.getAllByText("未查核").length).toBeGreaterThan(0);
    expect(screen.getByText(/雨鞋數量需要重新確認/)).toBeInTheDocument();
    expectHeroStat("待人工確認", "1");
    expect(
      window.localStorage.getItem("sitcon-camp-2026-v1-observer-records"),
    ).toContain("練習場域活動中心");
  });

  it("keeps observer input simple and marks it unverified", () => {
    window.history.pushState({}, "", "/v1/");

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /觀測者新增/ }));
    fireEvent.change(screen.getByLabelText("原始文字"), {
      target: { value: "練習文字：電話線索和現場狀態都需要後續確認。" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "儲存為本機未整理草稿" }),
    );

    expect(screen.getAllByText("未查核").length).toBeGreaterThan(0);
    expect(
      window.localStorage.getItem("sitcon-camp-2026-v1-observer-records"),
    ).toContain("電話線索");
  });
});
