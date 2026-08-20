import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PhoneticWorkbenchPage from "./PhoneticWorkbenchPage.jsx";

const apiMocks = vi.hoisted(() => ({
  classesAPI: { list: vi.fn() },
  phoneticsAPI: { teacherClassProgress: vi.fn() },
}));

vi.mock("../api/index.js", () => apiMocks);

vi.mock("../components/shared/ModuleAssignmentSection.jsx", () => ({
  default: () => <div>布置语音任务面板</div>,
}));

describe("PhoneticWorkbenchPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.classesAPI.list.mockResolvedValue([{ id: "class-1", className: "一班" }]);
    apiMocks.phoneticsAPI.teacherClassProgress.mockResolvedValue([
      {
        id: "student-1",
        realName: "Alice",
        studentNo: "S01",
        phoneticsStats: {
          sessions: 3,
          durationMs: 120000,
          averageScore: 88,
          averageAccuracy: 91,
          lastPracticedAt: 1782800000000,
        },
      },
    ]);
  });

  it("renders the workbench hero and connected class data", async () => {
    render(<PhoneticWorkbenchPage user={{ id: "t1", role: "teacher" }} hideTopBar />);

    expect(screen.getByText("看见发音问题，安排基础训练。")).toBeInTheDocument();
    expect(await screen.findByText("Alice · S01")).toBeInTheDocument();
    expect(screen.getByText("91%")).toBeInTheDocument();
    expect(screen.queryByText("语音教师统计待接入")).not.toBeInTheDocument();
  });

  it("shows the assignment panel only for teachers", () => {
    const { rerender } = render(<PhoneticWorkbenchPage user={{ id: "s1", role: "student" }} hideTopBar />);
    expect(screen.queryByText("布置语音任务面板")).not.toBeInTheDocument();

    rerender(<PhoneticWorkbenchPage user={{ id: "t1", role: "teacher" }} hideTopBar />);
    expect(screen.getByText("布置语音任务面板")).toBeInTheDocument();
  });

  it("navigates via the quick action buttons", () => {
    const onNavigate = vi.fn();
    render(<PhoneticWorkbenchPage user={{ id: "t1", role: "teacher" }} onNavigate={onNavigate} hideTopBar />);

    screen.getByRole("button", { name: "查看语音成长" }).click();

    expect(onNavigate).toHaveBeenCalledWith("phonetics-progress");
  });

  it("renders the phonetics top bar when not hidden", () => {
    render(<PhoneticWorkbenchPage user={{ id: "t1", role: "teacher" }} onNavigate={vi.fn()} />);

    expect(screen.getByRole("button", { name: "语音工作台" })).toBeInTheDocument();
  });
});
