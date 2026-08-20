import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TeacherDataPage from "./TeacherDataPage.jsx";

const { teacherDataAPI } = vi.hoisted(() => ({
  teacherDataAPI: {
    overview: vi.fn(),
    classDetail: vi.fn(),
  },
}));

vi.mock("../api/index.js", () => ({
  teacherDataAPI,
}));

const populatedOverview = {
  summary: {
    classCount: 1,
    studentCount: 2,
    assignedCount: 8,
    completedCount: 5,
    completionRate: 63,
    pendingStudentCount: 1,
    lastLearningAt: Date.parse("2026-07-03T10:00:00+08:00"),
  },
  classes: [
    {
      classId: "class-1",
      className: "高一 A 班",
      studentCount: 2,
      overall: {
        assignedCount: 8,
        completedCount: 5,
        completionRate: 63,
      },
    },
  ],
};

const populatedDetail = {
  classSummary: {
    classId: "class-1",
    className: "高一 A 班",
    studentCount: 2,
    lastLearningAt: Date.parse("2026-07-03T10:00:00+08:00"),
  },
  overall: {
    assignedCount: 8,
    completedCount: 5,
    completionRate: 63,
    pendingStudentCount: 1,
    pendingStudents: [{ id: "student-1", name: "王同学", studentNo: "01" }],
  },
  writing: {
    assignmentCount: 1,
    assignedCount: 2,
    submittedCount: 1,
    returnedCount: 1,
    completionRate: 50,
    teacherCommentCoverageRate: 50,
    commentReadyCount: 1,
  },
  grammar: {
    assignmentCount: 1,
    assignedCount: 2,
    submittedCount: 1,
    completionRate: 50,
    practiceSessions: 3,
    totalQuestions: 10,
    accuracy: 80,
  },
  reading: {
    practiceSessions: 4,
    totalQuestions: 12,
    accuracy: 75,
    analysesCount: 2,
  },
  modules: {
    assignedCount: 2,
    completedCount: 1,
    completionRate: 50,
    byModule: [
      {
        moduleType: "reading",
        assignedCount: 2,
        completedCount: 1,
        completionRate: 50,
      },
    ],
  },
};

describe("TeacherDataPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state", () => {
    teacherDataAPI.overview.mockReturnValue(new Promise(() => {}));

    render(<TeacherDataPage />);

    expect(screen.getByText("正在加载教师数据...")).toBeInTheDocument();
  });

  it("shows empty state when teacher has no classes", async () => {
    teacherDataAPI.overview.mockResolvedValue({ summary: { classCount: 0 }, classes: [] });

    render(<TeacherDataPage />);

    expect(await screen.findByText("还没有可统计的班级。先创建班级并让学生加入后，这里会展示完成率和学情数据。")).toBeInTheDocument();
    expect(teacherDataAPI.classDetail).not.toHaveBeenCalled();
  });

  it("shows error state", async () => {
    teacherDataAPI.overview.mockRejectedValue(new Error("服务暂时不可用"));

    render(<TeacherDataPage />);

    expect(await screen.findByText("服务暂时不可用")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
  });

  it("loads and renders teacher completion and learning data", async () => {
    teacherDataAPI.overview.mockResolvedValue(populatedOverview);
    teacherDataAPI.classDetail.mockResolvedValue(populatedDetail);

    render(<TeacherDataPage />);

    expect(screen.getByText("正在加载教师数据...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("高一 A 班 · 2 人")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("王同学 · 01")).toBeInTheDocument();
    });

    expect(teacherDataAPI.overview).toHaveBeenCalledTimes(1);
    expect(teacherDataAPI.classDetail).toHaveBeenCalledWith("class-1");
    expect(screen.getAllByText("63%").length).toBeGreaterThan(0);
    expect(screen.getByText("教师点评覆盖")).toBeInTheDocument();
    expect(screen.getAllByText("练习次数").length).toBeGreaterThan(0);
    expect(screen.getByText("解析次数")).toBeInTheDocument();
    expect(screen.getByText("阅读练习")).toBeInTheDocument();
    expect(screen.getByText("校方采购报告摘要")).toBeInTheDocument();
    expect(screen.getByText("说服力 20%")).toBeInTheDocument();
    expect(screen.getByText(/可直接用于年级组汇报/)).toBeInTheDocument();
    expect(screen.getByText("班级弱点")).toBeInTheDocument();
    expect(screen.getByText(/完成缺口/)).toBeInTheDocument();
    expect(screen.getByText("学生分层")).toBeInTheDocument();
    expect(screen.getByText("优先跟进")).toBeInTheDocument();
    expect(screen.getByText("导出材料")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打印或保存学情报告 PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下载学情报告 TXT" })).toBeInTheDocument();
    expect(screen.getByText("教学下一步")).toBeInTheDocument();
    expect(screen.getByText(/先处理待完成学生/)).toBeInTheDocument();
    expect(screen.getAllByText(/阅读正确率低于 80%/).length).toBeGreaterThan(0);
    expect(screen.getByText(/未接入真实记录的模块只展示专项任务完成数/)).toBeInTheDocument();
  });

  it("renders one-click assignment buttons for recommendations and navigates on click", async () => {
    teacherDataAPI.overview.mockResolvedValue(populatedOverview);
    teacherDataAPI.classDetail.mockResolvedValue(populatedDetail);

    const onNavigate = vi.fn();
    render(<TeacherDataPage onNavigate={onNavigate} />);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /创建作业/ }).length).toBeGreaterThan(0);
    });

    // populatedDetail 中 reading.accuracy=75（<80），会触发阅读推荐。
    // 点击任一推荐的「创建作业」按钮应触发 onNavigate 导航到对应模块工作台。
    fireEvent.click(screen.getAllByRole("button", { name: /创建作业/ })[0]);

    expect(onNavigate).toHaveBeenCalled();
  });
});
