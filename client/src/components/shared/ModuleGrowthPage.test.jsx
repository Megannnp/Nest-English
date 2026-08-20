import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ModuleGrowthPage, { RecentRecordsList } from "./ModuleGrowthPage.jsx";

describe("RecentRecordsList", () => {
  it("renders pre-shaped records without crashing when renderItem is omitted", () => {
    render(
      <RecentRecordsList
        records={[{ key: "r1", tag: "口语练习", title: "得分 90", meta: "07/13" }]}
      />
    );

    expect(screen.getByText("得分 90")).toBeInTheDocument();
    expect(screen.getByText("口语练习")).toBeInTheDocument();
    expect(screen.getByText("07/13")).toBeInTheDocument();
  });

  it("still supports a custom renderItem for records that need remapping", () => {
    render(
      <RecentRecordsList
        records={[{ id: "r1", score: 90 }]}
        renderItem={(record) => ({ key: record.id, tag: "自定义", title: `得分 ${record.score}`, meta: "" })}
      />
    );

    expect(screen.getByText("得分 90")).toBeInTheDocument();
    expect(screen.getByText("自定义")).toBeInTheDocument();
  });

  it("wires up onClick when a pre-shaped record provides one", () => {
    const onClick = vi.fn();
    render(
      <RecentRecordsList
        records={[{ key: "r1", tag: "口语练习", title: "得分 90", meta: "07/13", onClick }]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /得分 90/ }));
    expect(onClick).toHaveBeenCalled();
  });

  it("renders nothing for an empty records list", () => {
    const { container } = render(<RecentRecordsList records={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ModuleGrowthPage", () => {
  it("shows the configured empty state instead of zero metrics when a logged-in module has no data", () => {
    render(
      <ModuleGrowthPage
        title="成长页"
        subtitle="学习记录"
        user={{ id: "u1", name: "测试用户" }}
        metrics={[{ label: "练习场次", value: 0, helper: "真实记录" }]}
        hasData={false}
        emptyMessage="还没有真实学习记录。"
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("还没有真实学习记录。");
    expect(screen.queryByText("练习场次")).not.toBeInTheDocument();
  });
});
