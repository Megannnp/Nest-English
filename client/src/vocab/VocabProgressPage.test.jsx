import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import VocabProgressPage from "./VocabProgressPage.jsx";
import { vocabularyAPI } from "../api/index.js";

vi.mock("../api/index.js", () => ({
  vocabularyAPI: {
    progress: vi.fn(),
    favorites: vi.fn(),
  },
}));

const mockUser = { id: "u1", name: "测试用户" };

describe("VocabProgressPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vocabularyAPI.progress.mockResolvedValue({
      sessions: 4,
      averageScore: 88,
      averageAccuracy: 90,
      durationMs: 600000,
      byActivity: [{ activityType: "flashcard", averageAccuracy: 92 }],
      recent: [{ id: "r1", activityType: "flashcard", accuracy: 92, createdAt: Date.now(), durationMs: 60000 }],
    });
    vocabularyAPI.favorites.mockResolvedValue([
      { id: "f1", content: "perseverance", metadata: { pos: "n." }, title: "坚持不懈" },
    ]);
  });

  it("renders the hero title for everyone", () => {
    render(<VocabProgressPage onNavigate={vi.fn()} />);
    expect(screen.getByText("词汇积累有路径，输出提升有证据。")).toBeInTheDocument();
  });

  it("shows the empty state for guests without fetching data", () => {
    render(<VocabProgressPage onNavigate={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("还没有真实词汇练习记录");
    expect(vocabularyAPI.progress).not.toHaveBeenCalled();
  });

  it("renders real stats and favorite words for a logged-in user", async () => {
    render(<VocabProgressPage onNavigate={vi.fn()} user={mockUser} />);

    await waitFor(() => expect(screen.getByText("记录次数")).toBeInTheDocument());

    expect(screen.getByText("88%")).toBeInTheDocument();
    expect(screen.getByText("收藏词汇")).toBeInTheDocument();
    expect(screen.getByText("perseverance")).toBeInTheDocument();
  });

  it("shows an error state and retries when loading fails", async () => {
    vocabularyAPI.progress.mockRejectedValueOnce(new Error("词汇成长数据加载失败"));

    render(<VocabProgressPage onNavigate={vi.fn()} user={mockUser} />);

    expect(await screen.findByText("词汇成长数据加载失败")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));

    await waitFor(() => expect(screen.getByText("记录次数")).toBeInTheDocument());
  });

  it("navigates to vocab quiz from the quick actions", () => {
    const onNavigate = vi.fn();
    render(<VocabProgressPage onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("button", { name: /开始词汇检测/ }));

    expect(onNavigate).toHaveBeenCalledWith("vocab-quiz");
  });
});
