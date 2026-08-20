import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PhoneticProgressPage from "./PhoneticProgressPage.jsx";
import { phoneticsAPI } from "../api/index.js";

vi.mock("../api/index.js", () => ({
  phoneticsAPI: { progress: vi.fn() },
}));

const mockUser = { id: "u1", name: "测试用户" };

describe("PhoneticProgressPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    phoneticsAPI.progress.mockResolvedValue({
      sessions: 5,
      averageScore: 90,
      averageAccuracy: 88,
      durationMs: 900000,
      byActivity: [{ activityType: "sound-practice", averageAccuracy: 95 }],
      recent: [{ id: "r1", activityType: "sound-practice", accuracy: 95, createdAt: Date.now(), durationMs: 60000 }],
    });
  });

  it("renders the hero title for everyone", () => {
    render(<PhoneticProgressPage onNavigate={vi.fn()} />);
    expect(screen.getByText("发音从音素到语流，成长一路可见。")).toBeInTheDocument();
  });

  it("shows the empty state for guests without fetching data", () => {
    render(<PhoneticProgressPage onNavigate={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("还没有真实语音练习记录");
    expect(phoneticsAPI.progress).not.toHaveBeenCalled();
  });

  it("renders real stats for a logged-in user", async () => {
    render(<PhoneticProgressPage onNavigate={vi.fn()} user={mockUser} />);

    await waitFor(() => expect(screen.getByText("训练次数")).toBeInTheDocument());
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("shows an error state and retries when loading fails", async () => {
    phoneticsAPI.progress.mockRejectedValueOnce(new Error("语音成长数据加载失败"));

    render(<PhoneticProgressPage onNavigate={vi.fn()} user={mockUser} />);

    expect(await screen.findByText("语音成长数据加载失败")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));

    await waitFor(() => expect(screen.getByText("训练次数")).toBeInTheDocument());
  });

  it("navigates to the sound practice page from the quick actions", () => {
    const onNavigate = vi.fn();
    render(<PhoneticProgressPage onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole("button", { name: /复习音素/ }));

    expect(onNavigate).toHaveBeenCalledWith("phonetics-sound");
  });
});
