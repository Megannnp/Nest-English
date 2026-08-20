import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SpeakingProgressPage from "./SpeakingProgressPage.jsx";
import { speakingAPI } from "../api/index.js";

vi.mock("../api/index.js", () => ({
  speakingAPI: { progress: vi.fn() },
}));

const mockUser = { id: "u1", name: "测试用户" };

describe("SpeakingProgressPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    speakingAPI.progress.mockResolvedValue({
      sessions: 5,
      averageScore: 78,
      durationMs: 480000,
      byActivity: [{ activityType: "opinion", averageScore: 80 }],
      recent: [{ id: "r1", activityType: "opinion", score: 80, createdAt: Date.now(), durationMs: 60000 }],
    });
  });

  it("renders the hero title for everyone", () => {
    render(<SpeakingProgressPage onNavigate={vi.fn()} />);
    expect(screen.getByText("开口有记录，表达看得见进步。")).toBeInTheDocument();
  });

  it("shows the empty state for guests without fetching data", () => {
    render(<SpeakingProgressPage onNavigate={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("还没有真实口语练习记录");
    expect(speakingAPI.progress).not.toHaveBeenCalled();
  });

  it("renders real stats and recent records for a logged-in user", async () => {
    render(<SpeakingProgressPage onNavigate={vi.fn()} user={mockUser} />);

    await waitFor(() => expect(screen.getByText("练习场次")).toBeInTheDocument());
    expect(screen.getByText("78分")).toBeInTheDocument();
    expect(screen.getByText("得分 80")).toBeInTheDocument();
  });

  it("shows an error state and retries when loading fails", async () => {
    speakingAPI.progress.mockRejectedValueOnce(new Error("口语成长数据加载失败"));

    render(<SpeakingProgressPage onNavigate={vi.fn()} user={mockUser} />);

    expect(await screen.findByText("口语成长数据加载失败")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));

    await waitFor(() => expect(screen.getByText("练习场次")).toBeInTheDocument());
  });

  it("navigates to the practice page from the quick action", () => {
    const onNavigate = vi.fn();
    render(<SpeakingProgressPage onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("button", { name: /继续口语练习/ }));

    expect(onNavigate).toHaveBeenCalledWith("speaking");
  });
});
