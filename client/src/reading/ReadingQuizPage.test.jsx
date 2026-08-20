import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ReadingQuizPage from "./ReadingQuizPage.jsx";
import { readingAPI } from "../api/index.js";

vi.mock("../api/index.js", () => ({
  readingAPI: {
    generateQuiz: vi.fn(),
    recordPractice: vi.fn(),
  },
}));

function selectGenreAndDifficulty() {
  fireEvent.click(screen.getByRole("button", { name: "说明文" }));
  fireEvent.click(screen.getByRole("button", { name: "简单" }));
}

describe("ReadingQuizPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    readingAPI.generateQuiz.mockResolvedValue({
      passage: "Libraries are changing to serve their communities better.",
      questions: [
        {
          id: 1,
          question: "What is the passage mainly about?",
          options: ["A. Libraries", "B. Sports", "C. Weather", "D. Music"],
          answer: "A",
          explanation: "The passage focuses on libraries.",
          optionsAnalysis: { A: "正确：短文主题是图书馆。", B: "错误", C: "错误", D: "错误" },
        },
      ],
    });
    readingAPI.recordPractice.mockResolvedValue({});
  });

  it("renders the setup steps for genre and difficulty", () => {
    render(<ReadingQuizPage hideTopBar onNavigate={vi.fn()} />);

    expect(screen.getByText("即测即评，AI 出全新短文。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "说明文" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "说明文" }));
    expect(screen.getByText("选择难度")).toBeInTheDocument();
  });

  it("generates a quiz and shows the passage with the first question", async () => {
    render(<ReadingQuizPage hideTopBar onNavigate={vi.fn()} />);

    selectGenreAndDifficulty();

    await waitFor(() => {
      expect(readingAPI.generateQuiz).toHaveBeenCalledWith({ genre: "说明文", difficulty: "简单" });
    });
    expect(await screen.findByText(/Libraries are changing/)).toBeInTheDocument();
    expect(screen.getByText("What is the passage mainly about?")).toBeInTheDocument();
  });

  it("shows an error and allows retry when quiz generation fails", async () => {
    readingAPI.generateQuiz.mockRejectedValueOnce(new Error("生成失败"));

    render(<ReadingQuizPage hideTopBar onNavigate={vi.fn()} />);
    selectGenreAndDifficulty();

    expect(await screen.findByText(/出题失败，请重试/)).toBeInTheDocument();
  });

  it("answers the question, reveals analysis, and records the result for a logged-in user", async () => {
    const onNavigate = vi.fn();
    render(<ReadingQuizPage hideTopBar user={{ id: "u1" }} onNavigate={onNavigate} />);
    selectGenreAndDifficulty();
    await screen.findByText("What is the passage mainly about?");

    fireEvent.click(screen.getByRole("button", { name: "A. Libraries" }));
    expect(screen.getByText("正确：短文主题是图书馆。")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看结果" }));

    expect(await screen.findByText("共 1 题，答对 1 题")).toBeInTheDocument();
    await waitFor(() => {
      expect(readingAPI.recordPractice).toHaveBeenCalledWith(expect.objectContaining({
        mode: "quiz",
        genre: "说明文",
        questionType: "AI速测",
        passageIds: ["ai-reading-quiz"],
        correctCount: 1,
        totalCount: 1,
        answers: [expect.objectContaining({
          questionType: "阅读理解",
          selected: "A",
          answer: "A",
          correct: true,
        })],
        wrongItems: [],
        durationMs: expect.any(Number),
      }));
    });
    expect(await screen.findByText("练习记录已保存")).toBeInTheDocument();
  });

  it("records wrong quiz items with an inferred question type", async () => {
    readingAPI.generateQuiz.mockResolvedValueOnce({
      passage: "Libraries are changing to serve their communities better.",
      questions: [
        {
          id: 1,
          question: "What is the passage mainly about?",
          options: ["A. Libraries", "B. Sports", "C. Weather", "D. Music"],
          answer: "A",
          explanation: "题型：主旨题 | The passage focuses on libraries.",
          optionsAnalysis: { A: "正确：短文主题是图书馆。", B: "错误", C: "错误", D: "错误" },
        },
      ],
    });

    const onNavigate = vi.fn();
    render(<ReadingQuizPage hideTopBar user={{ id: "u1" }} onNavigate={onNavigate} />);
    selectGenreAndDifficulty();
    await screen.findByText("What is the passage mainly about?");

    fireEvent.click(screen.getByRole("button", { name: "B. Sports" }));
    fireEvent.click(screen.getByRole("button", { name: "查看结果" }));

    expect(await screen.findByText(/优先修复 主旨题/)).toBeInTheDocument();
    await waitFor(() => {
      expect(readingAPI.recordPractice).toHaveBeenCalledWith(expect.objectContaining({
        questionType: "主旨题",
        wrongItems: [expect.objectContaining({
          questionType: "主旨题",
          selected: "B",
          answer: "A",
          stem: "What is the passage mainly about?",
        })],
      }));
    });

    fireEvent.click(screen.getByRole("button", { name: "练同类薄弱点" }));
    expect(sessionStorage.getItem("nest_reading_practice_mode")).toBe("review");
    expect(onNavigate).toHaveBeenCalledWith("reading-practice");
  });

  it("disables result actions while saving the reading record", async () => {
    readingAPI.recordPractice.mockReturnValueOnce(new Promise(() => {}));
    render(<ReadingQuizPage hideTopBar user={{ id: "u1" }} onNavigate={vi.fn()} />);
    selectGenreAndDifficulty();
    await screen.findByText("What is the passage mainly about?");

    fireEvent.click(screen.getByRole("button", { name: "A. Libraries" }));
    fireEvent.click(screen.getByRole("button", { name: "查看结果" }));

    expect(await screen.findByText("正在保存练习记录…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再测一篇" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "换一篇速测" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "结束练习" })).toBeDisabled();
  });

  it("does not record a result for a guest and prompts login", async () => {
    const onLoginClick = vi.fn();
    render(<ReadingQuizPage hideTopBar onLoginClick={onLoginClick} onNavigate={vi.fn()} />);
    selectGenreAndDifficulty();
    await screen.findByText("What is the passage mainly about?");

    fireEvent.click(screen.getByRole("button", { name: "A. Libraries" }));
    fireEvent.click(screen.getByRole("button", { name: "查看结果" }));

    expect(await screen.findByText(/当前以游客身份练习/)).toBeInTheDocument();
    expect(readingAPI.recordPractice).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /登录后可自动保存记录/ }));
    expect(onLoginClick).toHaveBeenCalled();
  });

  it("restarts a fresh quiz from the result screen", async () => {
    render(<ReadingQuizPage hideTopBar onNavigate={vi.fn()} />);
    selectGenreAndDifficulty();
    await screen.findByText("What is the passage mainly about?");

    fireEvent.click(screen.getByRole("button", { name: "A. Libraries" }));
    fireEvent.click(screen.getByRole("button", { name: "查看结果" }));
    await screen.findByText("共 1 题，答对 1 题");

    fireEvent.click(screen.getByRole("button", { name: "再测一篇" }));

    expect(screen.getByText("选择文体")).toBeInTheDocument();
  });
});
