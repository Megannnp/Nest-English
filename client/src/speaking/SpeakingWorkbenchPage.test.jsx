import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SpeakingWorkbenchPage from "./SpeakingWorkbenchPage.jsx";

const apiMocks = vi.hoisted(() => ({
  classesAPI: { list: vi.fn() },
  speakingAPI: { teacherClassProgress: vi.fn() },
}));

vi.mock("../api/index.js", () => apiMocks);

vi.mock("../components/shared/ModuleAssignmentSection.jsx", () => ({
  default: () => <div>布置口语任务面板</div>,
}));

describe("SpeakingWorkbenchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.classesAPI.list.mockResolvedValue([{ id: "class-1", className: "一班" }]);
    apiMocks.speakingAPI.teacherClassProgress.mockResolvedValue([
      {
        id: "student-1",
        realName: "Alice",
        studentNo: "S01",
        speakingStats: {
          sessions: 2,
          durationMs: 120000,
          averageScore: 82,
          lastPracticedAt: 1782800000000,
        },
      },
    ]);
  });

  it("renders the workbench hero and connected class data", async () => {
    render(<SpeakingWorkbenchPage user={{ id: "t1", role: "teacher" }} hideTopBar />);

    expect(screen.getByText("看见口语表达差异，安排针对性练习。")).toBeInTheDocument();
    expect(await screen.findByText("Alice · S01")).toBeInTheDocument();
    expect(screen.getByText("82分")).toBeInTheDocument();
  });

  it("shows the assignment panel only for teachers", () => {
    const { rerender } = render(<SpeakingWorkbenchPage user={{ id: "s1", role: "student" }} hideTopBar />);
    expect(screen.queryByText("布置口语任务面板")).not.toBeInTheDocument();

    rerender(<SpeakingWorkbenchPage user={{ id: "t1", role: "teacher" }} hideTopBar />);
    expect(screen.getByText("布置口语任务面板")).toBeInTheDocument();
  });

  it("navigates via the quick action buttons", () => {
    const onNavigate = vi.fn();
    render(<SpeakingWorkbenchPage user={{ id: "t1", role: "teacher" }} onNavigate={onNavigate} hideTopBar />);

    screen.getByRole("button", { name: "查看口语成长" }).click();

    expect(onNavigate).toHaveBeenCalledWith("speaking-progress");
  });

  it("renders the speaking top bar when not hidden", () => {
    render(<SpeakingWorkbenchPage user={{ id: "t1", role: "teacher" }} onNavigate={vi.fn()} />);

    expect(screen.getByRole("button", { name: "口语工作台" })).toBeInTheDocument();
  });
});
