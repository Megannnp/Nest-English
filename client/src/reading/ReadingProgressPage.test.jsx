import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ReadingProgressPage from "./ReadingProgressPage.jsx";
import { readingAPI } from "../api/index.js";

vi.mock("../api/index.js", () => ({
  readingAPI: {
    practiceProgress: vi.fn(),
    analysisDetail: vi.fn(),
  },
}));

const mockUser = { id: "u1", name: "测试用户" };

describe("ReadingProgressPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readingAPI.practiceProgress.mockResolvedValue({
      sessions: 12,
      passages: 20,
      accuracy: 80,
      wrongQuestions: 5,
      analyses: { total: 3, recent: [{ id: "a1", genre: "说明文", mainIdea: "AI改变教育", questionCount: 4, createdAt: Date.now() }] },
      courseProgress: { nodes: [{ status: "completed" }, { status: "started" }] },
      byType: [{ questionType: "细节理解", accuracy: 70, total: 10 }],
      byGenre: [{ genre: "说明文", accuracy: 88, total: 12, sessions: 3 }],
      recent: [{ id: "r1", score: 90, wrongItems: [] }],
    });
  });

  it("renders demo data for guests without fetching real progress", () => {
    render(<ReadingProgressPage onNavigate={vi.fn()} />);

    expect(screen.getByText("读有所获，进步有据。")).toBeInTheDocument();
    expect(screen.getByText("练习场次")).toBeInTheDocument();
    expect(readingAPI.practiceProgress).not.toHaveBeenCalled();
  });

  it("renders real stats and genre mastery for a logged-in user", async () => {
    render(<ReadingProgressPage onNavigate={vi.fn()} user={mockUser} />);

    await waitFor(() => expect(readingAPI.practiceProgress).toHaveBeenCalled());
    expect(await screen.findByText("80%")).toBeInTheDocument();
    expect(screen.getByText("文体掌握")).toBeInTheDocument();
    expect(screen.getByText("正确率 88%")).toBeInTheDocument();
    expect(screen.getByText("AI改变教育")).toBeInTheDocument();
  });

  it("shows an error state and retries when loading fails", async () => {
    readingAPI.practiceProgress.mockRejectedValueOnce(new Error("阅读成长数据加载失败"));

    render(<ReadingProgressPage onNavigate={vi.fn()} user={mockUser} />);

    expect(await screen.findByText("阅读成长数据加载失败")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));

    await waitFor(() => expect(screen.getByText("文体掌握")).toBeInTheDocument());
  });

  it("opens the analysis detail and stores the seed before navigating", async () => {
    readingAPI.analysisDetail.mockResolvedValue({ id: "a1", mainIdea: "AI改变教育" });
    const onNavigate = vi.fn();

    render(<ReadingProgressPage onNavigate={onNavigate} user={mockUser} />);

    fireEvent.click(await screen.findByText("AI改变教育"));

    await waitFor(() => expect(readingAPI.analysisDetail).toHaveBeenCalledWith("a1"));
    expect(JSON.parse(sessionStorage.getItem("nestReadingAnalysisSeed"))).toEqual({ id: "a1", mainIdea: "AI改变教育" });
    expect(onNavigate).toHaveBeenCalledWith("reading-analyzer");
  });
});
