import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ListeningWorkbenchPage from "./ListeningWorkbenchPage.jsx";
import { listeningAPI, teacherDataAPI } from "../api/index.js";

vi.mock("../api/index.js", () => ({
  listeningAPI: {
    teacherClassProgress: vi.fn(),
  },
  teacherDataAPI: {
    overview: vi.fn(),
    classDetail: vi.fn(),
  },
}));

vi.mock("../hooks/useScrollReveal.js", () => ({
  default: () => ({ current: null }),
}));

vi.mock("../components/shared/ModuleAssignmentSection.jsx", () => ({
  default: () => <div>布置专项任务</div>,
}));

describe("ListeningWorkbenchPage", () => {
  it("switches teacher listening stats between classes", async () => {
    teacherDataAPI.overview.mockResolvedValue({
      summary: { studentCount: 3 },
      classes: [
        { classId: "class-1", className: "一班" },
        { classId: "class-2", className: "二班" },
      ],
    });
    teacherDataAPI.classDetail.mockImplementation((classId) => Promise.resolve({
      classSummary: { className: classId === "class-1" ? "一班" : "二班" },
      modules: {
        realRecords: [{
          moduleType: "listening",
          sessions: classId === "class-1" ? 2 : 5,
          averageAccuracy: classId === "class-1" ? 80 : 92,
          durationMs: 60000,
          lastPracticedAt: 1782800000000,
        }],
      },
    }));
    listeningAPI.teacherClassProgress.mockImplementation((classId) => Promise.resolve([
      {
        id: `${classId}-student`,
        realName: classId === "class-1" ? "学生甲" : "学生乙",
        studentNo: "",
        listeningStats: {
          sessions: classId === "class-1" ? 2 : 5,
          averageAccuracy: classId === "class-1" ? 80 : 92,
        },
      },
    ]));

    render(
      <ListeningWorkbenchPage
        user={{ id: "teacher-1", role: "teacher" }}
        hideTopBar
      />
    );

    expect(await screen.findByText("学生甲")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "二班" }));

    await waitFor(() => {
      expect(listeningAPI.teacherClassProgress).toHaveBeenCalledWith("class-2");
    });
    expect(await screen.findByText("学生乙")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("5 次练习"))).toBeInTheDocument();
  });
});
