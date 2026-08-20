import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ListeningProgressPage from "./ListeningProgressPage.jsx";
import { listeningAPI } from "../api/index.js";

vi.mock("../api/index.js", () => ({
  listeningAPI: { progress: vi.fn() },
}));

const mockUser = { id: "u1", name: "测试用户" };

describe("ListeningProgressPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeningAPI.progress.mockResolvedValue({
      sessions: 6,
      averageScore: 85,
      averageAccuracy: 89,
      durationMs: 720000,
      byActivity: [{ activityType: "practice", averageAccuracy: 91 }],
      recent: [{ id: "r1", activityType: "practice", accuracy: 91, createdAt: Date.now(), durationMs: 60000 }],
    });
  });

  it("renders the hero title for everyone", () => {
    render(<ListeningProgressPage onNavigate={vi.fn()} />);
    expect(screen.getByText("听得清楚，读得明白。")).toBeInTheDocument();
  });

  it("shows the empty state for guests without fetching data", () => {
    render(<ListeningProgressPage onNavigate={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("还没有真实听读练习记录");
    expect(listeningAPI.progress).not.toHaveBeenCalled();
  });

  it("renders real stats and the recent-records list for a logged-in user", async () => {
    render(<ListeningProgressPage onNavigate={vi.fn()} user={mockUser} />);

    await waitFor(() => expect(screen.getByText("训练场次")).toBeInTheDocument());
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("准确率 91%")).toBeInTheDocument();
  });

  it("shows an error state and retries when loading fails", async () => {
    listeningAPI.progress.mockRejectedValueOnce(new Error("听读成长数据加载失败"));

    render(<ListeningProgressPage onNavigate={vi.fn()} user={mockUser} />);

    expect(await screen.findByText("听读成长数据加载失败")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));

    await waitFor(() => expect(screen.getByText("训练场次")).toBeInTheDocument());
  });

  it("navigates to basics practice from the quick actions", () => {
    const onNavigate = vi.fn();
    render(<ListeningProgressPage onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("button", { name: /继续基础听辨/ }));

    expect(onNavigate).toHaveBeenCalledWith("listening-basics");
  });
});
