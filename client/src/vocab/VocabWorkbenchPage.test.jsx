import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import VocabWorkbenchPage from "./VocabWorkbenchPage.jsx";
import { vocabularyAPI } from "../api/index.js";

vi.mock("../api/index.js", () => ({
  vocabularyAPI: {
    teacherClasses: vi.fn(),
    teacherClassProgress: vi.fn(),
  },
}));

vi.mock("../components/shared/ModuleAssignmentSection.jsx", () => ({
  default: () => <div>布置词汇任务面板</div>,
}));

describe("VocabWorkbenchPage", () => {
  it("shows the empty state for non-teacher users without fetching classes", () => {
    render(<VocabWorkbenchPage user={{ id: "s1", role: "student" }} hideTopBar />);

    expect(screen.getByText("看见词汇掌握差异，安排分层复习。")).toBeInTheDocument();
    expect(screen.getByText("暂无班级数据")).toBeInTheDocument();
    expect(vocabularyAPI.teacherClasses).not.toHaveBeenCalled();
    expect(screen.queryByText("布置词汇任务面板")).not.toBeInTheDocument();
  });

  it("loads and renders class summaries for a teacher", async () => {
    vocabularyAPI.teacherClasses.mockResolvedValue([
      { id: "class-1", className: "一班" },
    ]);
    vocabularyAPI.teacherClassProgress.mockResolvedValue([
      { id: "student-1", vocabStats: { sessions: 3, averageAccuracy: 80 } },
      { id: "student-2", vocabStats: { sessions: 0, averageAccuracy: 0 } },
    ]);

    render(<VocabWorkbenchPage user={{ id: "t1", role: "teacher" }} hideTopBar />);

    expect(await screen.findByText("一班")).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent.includes("1/2 已练习"))).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent.includes("平均正确率 80%"))).toBeInTheDocument();
    expect(screen.getByText("班级数量")).toBeInTheDocument();
    expect(screen.getByText("布置词汇任务面板")).toBeInTheDocument();
  });

  it("falls back to an empty class list when loading fails", async () => {
    vocabularyAPI.teacherClasses.mockRejectedValue(new Error("network error"));

    render(<VocabWorkbenchPage user={{ id: "t1", role: "teacher" }} hideTopBar />);

    await waitFor(() => {
      expect(screen.getByText("暂无学习记录")).toBeInTheDocument();
    });
  });
});
