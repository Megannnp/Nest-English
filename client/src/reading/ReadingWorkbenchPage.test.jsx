import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ReadingWorkbenchPage from "./ReadingWorkbenchPage.jsx";
import { classesAPI, readingAPI } from "../api/index.js";

vi.mock("../api/index.js", () => ({
  classesAPI: { list: vi.fn() },
  readingAPI: { teacherClassProgress: vi.fn() },
}));

vi.mock("../components/shared/ModuleAssignmentSection.jsx", () => ({
  default: () => <div>布置阅读任务面板</div>,
}));

describe("ReadingWorkbenchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an empty state and does not fetch classes for guests", () => {
    render(<ReadingWorkbenchPage hideTopBar />);

    expect(screen.getByText("看见阅读问题，安排下一次训练。")).toBeInTheDocument();
    expect(classesAPI.list).not.toHaveBeenCalled();
    expect(screen.queryByText("布置阅读任务面板")).not.toBeInTheDocument();
  });

  it("does not show the teacher assignment panel for a non-teacher user", async () => {
    classesAPI.list.mockResolvedValue([]);

    render(<ReadingWorkbenchPage user={{ id: "s1", role: "student" }} hideTopBar />);

    await waitFor(() => expect(classesAPI.list).toHaveBeenCalled());
    expect(screen.queryByText("布置阅读任务面板")).not.toBeInTheDocument();
  });

  it("loads classes and switches between them to show per-student stats", async () => {
    classesAPI.list.mockResolvedValue([
      { id: "class-1", className: "一班" },
      { id: "class-2", className: "二班" },
    ]);
    readingAPI.teacherClassProgress.mockImplementation((classId) => Promise.resolve([
      {
        id: `${classId}-student`,
        realName: classId === "class-1" ? "学生甲" : "学生乙",
        readingStats: {
          sessions: classId === "class-1" ? 2 : 5,
          totalQuestions: 10,
          correctQuestions: classId === "class-1" ? 6 : 9,
          analyses: { total: 1, lastAnalyzedAt: Date.now() },
        },
      },
    ]));

    render(<ReadingWorkbenchPage user={{ id: "t1", role: "teacher" }} hideTopBar />);

    const classPanel = () => screen.getByText("班级阅读概览").closest("section");
    await waitFor(() => expect(within(classPanel()).getByText("学生甲")).toBeInTheDocument());
    expect(screen.getByText("布置阅读任务面板")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "二班" }));

    await waitFor(() => expect(readingAPI.teacherClassProgress).toHaveBeenCalledWith("class-2"));
    await waitFor(() => expect(within(classPanel()).getByText("学生乙")).toBeInTheDocument());
  });

  it("shows a failure message when loading classes fails", async () => {
    classesAPI.list.mockRejectedValue(new Error("加载班级失败"));

    render(<ReadingWorkbenchPage user={{ id: "t1", role: "teacher" }} hideTopBar />);

    expect(await screen.findByText("加载班级失败")).toBeInTheDocument();
  });
});
