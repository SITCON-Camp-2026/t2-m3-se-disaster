import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/app/App";

describe("App", () => {
  it("renders starter title", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /災害資訊\s*整理工作台/ }),
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
    expect(screen.getByLabelText("人工確認註記")).toBeInTheDocument();
    expect(screen.getByText(/整理草稿列管：12 筆/)).toBeInTheDocument();
  });

  it("keeps line breaks while editing evidence and blockers", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /整理工作台作業/ }));

    fireEvent.change(screen.getByLabelText("判斷依據，一行一項"), {
      target: { value: "原文提到需要清泥\n地址只有模糊地標\n" },
    });
    fireEvent.change(
      screen.getByLabelText("卡住原因 / 不能直接使用的原因，一行一項"),
      {
        target: { value: "未確認完整位置\n未確認需求是否仍存在\n" },
      },
    );

    expect(screen.getByLabelText("判斷依據，一行一項")).toHaveValue(
      "原文提到需要清泥\n地址只有模糊地標\n",
    );
    expect(
      screen.getByLabelText("卡住原因 / 不能直接使用的原因，一行一項"),
    ).toHaveValue("未確認完整位置\n未確認需求是否仍存在\n");
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
  });

  it("shows the prepared organized information list", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /已整理資訊彙整/ }));

    expect(screen.getByText("已整理列管：12 筆")).toBeInTheDocument();
    expect(
      screen.getByText("M-010 活動中心物資盤點與登記動線"),
    ).toBeInTheDocument();
    expect(screen.getByText(/不代表正式查核完成資料/)).toBeInTheDocument();
  });
});
