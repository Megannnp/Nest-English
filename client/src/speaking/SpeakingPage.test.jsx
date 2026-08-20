import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SpeakingPage from "./SpeakingPage.jsx";
import { speakingAPI } from "../api/index.js";
import { createRealtimeAsrSession } from "../writing/core/realtimeAsrClient.js";

vi.mock("../api/index.js", () => ({
  speakingAPI: {
    questions: vi.fn().mockResolvedValue([]),
    recordProgress: vi.fn().mockResolvedValue({}),
    progress: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("../hooks/useScrollReveal.js", () => ({
  default: () => ({ current: null }),
}));

vi.mock("../writing/core/realtimeAsrClient.js", () => ({
  createRealtimeAsrSession: vi.fn(),
}));

describe("SpeakingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    speakingAPI.questions.mockResolvedValue([]);
    speakingAPI.recordProgress.mockResolvedValue({});
    speakingAPI.progress.mockResolvedValue(null);
    createRealtimeAsrSession.mockReset();
  });

  it("renders a real speaking practice workspace", async () => {
    render(<SpeakingPage hideTopBar />);

    expect(await screen.findByRole("button", { name: "开始录音" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("录音转写会显示在这里，也可以手动输入英文回答。")).toBeInTheDocument();
    expect(screen.getByText("查看参考表达")).toBeInTheDocument();
  });

  it("requests speaking questions with the selected prep exam system id", async () => {
    render(<SpeakingPage hideTopBar prepExamId="toefl" />);

    await waitFor(() => {
      expect(speakingAPI.questions).toHaveBeenCalledWith(20, { systemId: "system-toefl" });
    });
  });

  it("generates feedback and records signed-in practice", async () => {
    speakingAPI.progress.mockResolvedValue({
      sessions: 1,
      averageScore: 72,
      durationMs: 60000,
      recent: [{ id: "r1", activityType: "opinion", transcript: "I think sports help students relax.", score: 72, createdAt: 1783750000000 }],
    });
    render(<SpeakingPage hideTopBar user={{ id: "student-1" }} prepExamId="ielts" />);

    fireEvent.change(screen.getByPlaceholderText("录音转写会显示在这里，也可以手动输入英文回答。"), {
      target: {
        value: "I think students should do sports every day because it keeps us healthy and helps us relax after school.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成反馈" }));

    expect(await screen.findByText("即时反馈")).toBeInTheDocument();
    await waitFor(() => {
      expect(speakingAPI.recordProgress).toHaveBeenCalledWith(expect.objectContaining({
        transcript: expect.stringContaining("students should do sports"),
        score: expect.any(Number),
        metadata: expect.objectContaining({
          prepExamId: "ielts",
          systemId: "system-ielts",
        }),
      }));
    });
    expect(await screen.findByText("练习历史")).toBeInTheDocument();
    expect(screen.getByText("I think sports help students relax.")).toBeInTheDocument();
  });

  it("loads progress for signed-in users", async () => {
    speakingAPI.progress.mockResolvedValue({
      sessions: 2,
      averageScore: 86,
      durationMs: 120000,
      recent: [{ id: "r1", activityType: "conversation", transcript: "Hello, my name is Anna.", score: 86, createdAt: 1783750000000 }],
    });

    render(<SpeakingPage hideTopBar user={{ id: "student-1" }} />);

    expect(await screen.findByText("练习历史")).toBeInTheDocument();
    expect(screen.getByText("Hello, my name is Anna.")).toBeInTheDocument();
    expect(speakingAPI.progress).toHaveBeenCalled();
  });

  it("records question-bank speaking activity types", async () => {
    speakingAPI.questions.mockResolvedValue([{
      id: "q-description",
      type: "description",
      prompt: "Describe your favorite room.",
      sampleAnswer: "",
      prepTime: 20,
      responseTime: 60,
    }]);

    render(<SpeakingPage hideTopBar user={{ id: "student-1" }} />);

    expect((await screen.findAllByText("Describe your favorite room.")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("描述表达").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByPlaceholderText("录音转写会显示在这里，也可以手动输入英文回答。"), {
      target: { value: "My favorite room is bright and quiet, so I can read books there every evening." },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成反馈" }));

    await waitFor(() => {
      expect(speakingAPI.recordProgress).toHaveBeenCalledWith(expect.objectContaining({
        activityType: "description",
        questionId: "q-description",
      }));
    });
  });

  it("does not save an empty practice attempt", async () => {
    render(<SpeakingPage hideTopBar user={{ id: "student-1" }} />);

    fireEvent.click(await screen.findByRole("button", { name: "生成反馈" }));

    expect(await screen.findByText("请先录音或输入英文回答，再生成反馈。")).toBeInTheDocument();
    expect(speakingAPI.recordProgress).not.toHaveBeenCalled();
  });

  it("does not save a too-short practice attempt", async () => {
    render(<SpeakingPage hideTopBar user={{ id: "student-1" }} />);

    fireEvent.change(screen.getByPlaceholderText("录音转写会显示在这里，也可以手动输入英文回答。"), {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: "生成反馈" }));

    expect(await screen.findByText("回答太短，请至少说出 5 个英文词。")).toBeInTheDocument();
    expect(speakingAPI.recordProgress).not.toHaveBeenCalled();
  });

  it("keeps multiple ASR segment results in the transcript", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn() },
      configurable: true,
    });
    window.WebSocket = window.WebSocket || function WebSocketStub() {};
    window.AudioContext = window.AudioContext || function AudioContextStub() {};

    let handlers;
    createRealtimeAsrSession.mockImplementationOnce(async (opts) => {
      handlers = opts;
      return { stop: vi.fn(), abort: vi.fn() };
    });

    render(<SpeakingPage hideTopBar />);

    fireEvent.click(await screen.findByRole("button", { name: "开始录音" }));
    await waitFor(() => expect(createRealtimeAsrSession).toHaveBeenCalled());

    await act(async () => {
      handlers.onResult({ definiteText: "First sentence.", definite: true });
      handlers.onResult({ definiteText: "Second sentence.", definite: true });
    });

    expect(screen.getByPlaceholderText("录音转写会显示在这里，也可以手动输入英文回答。")).toHaveValue("First sentence.\nSecond sentence.");
  });

  it("aborts a stale ASR session that resolves after reset", async () => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: vi.fn() },
      configurable: true,
    });
    window.WebSocket = window.WebSocket || function WebSocketStub() {};
    window.AudioContext = window.AudioContext || function AudioContextStub() {};

    let resolveSession;
    const staleHandle = { stop: vi.fn(), abort: vi.fn() };
    createRealtimeAsrSession.mockImplementationOnce(() => new Promise((resolve) => {
      resolveSession = resolve;
    }));

    render(<SpeakingPage hideTopBar />);

    fireEvent.click(await screen.findByRole("button", { name: "开始录音" }));
    await waitFor(() => expect(createRealtimeAsrSession).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "重练" }));

    await act(async () => {
      resolveSession(staleHandle);
    });

    expect(staleHandle.abort).toHaveBeenCalledTimes(1);
  });
});
