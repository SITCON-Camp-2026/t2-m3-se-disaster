import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/app/App";

describe("App", () => {
  it("renders starter title", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /災害資訊\s*整理工作台/ }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("AI e化自動整理廣告專區")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "按此辦理 AI e化整理" }),
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
});
