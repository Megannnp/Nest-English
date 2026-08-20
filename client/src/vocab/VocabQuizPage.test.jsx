import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import VocabQuizPage from "./VocabQuizPage.jsx";

const { contentMock, recordProgressMock } = vi.hoisted(() => ({
  contentMock: vi.fn(),
  recordProgressMock: vi.fn(),
}));

vi.mock("../api/index.js", () => ({
  vocabularyAPI: {
    content: contentMock,
    recordProgress: recordProgressMock,
  },
}));

function answerCurrentQuestion() {
  const optionButton = screen
    .getAllByRole("button")
    .find((button) => button.className.includes("vc-course-quiz__option"));
  expect(optionButton).toBeTruthy();
  fireEvent.click(optionButton);
}

function advance() {
  const nextButton = screen.queryByRole("button", { name: "下一题" });
  if (nextButton) {
    fireEvent.click(nextButton);
    return true;
  }
  fireEvent.click(screen.getByRole("button", { name: "查看结果" }));
  return false;
}

function completeQuiz() {
  let hasMore = true;
  while (hasMore) {
    answerCurrentQuestion();
    hasMore = advance();
  }
}

describe("VocabQuizPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contentMock.mockResolvedValue(null);
    recordProgressMock.mockResolvedValue({});
  });

  it("renders the setup phase with reading/writing sections and categories", () => {
    render(<VocabQuizPage onNavigate={vi.fn()} />);

    expect(screen.getByText("选择检测方式，检验掌握程度。")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "词汇成长" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择题" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "闪卡" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "阅读词汇" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "写作词汇" })).toBeInTheDocument();
    expect(screen.getByText(/开始选择题（\d+ 题）/)).toBeInTheDocument();
  });

  it("requests vocab content with the selected prep exam system id", async () => {
    render(<VocabQuizPage onNavigate={vi.fn()} prepExamId="toefl" />);

    await waitFor(() => {
      expect(contentMock).toHaveBeenCalledWith({ systemId: "system-toefl" });
    });
  });

  it("switches between reading and writing word pools", () => {
    render(<VocabQuizPage onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "写作词汇" }));

    expect(screen.getByRole("button", { name: "写作词汇" }).className).toContain("vc-mode-btn--active");
  });

  it("runs a full quiz and shows the result screen", () => {
    render(<VocabQuizPage onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByText(/开始选择题（\d+ 题）/));
    expect(screen.getByText("词汇检测 · 选择题")).toBeInTheDocument();

    completeQuiz();

    expect(screen.getByText(/答对 \d+ \/ \d+ 题/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再测一组" })).toBeInTheDocument();
  });

  it("shows the setup controls after restarting from results", () => {
    const { container } = render(<VocabQuizPage onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByText(/开始选择题（\d+ 题）/));
    completeQuiz();
    fireEvent.click(screen.getByRole("button", { name: "再测一组" }));

    expect(screen.getByText(/开始选择题（\d+ 题）/)).toBeInTheDocument();
    expect(container.querySelector(".gm-analyzer-workspace")).toHaveClass("studio-revealed");
  });

  it("records quiz progress for a logged-in user after finishing", () => {
    render(<VocabQuizPage onNavigate={vi.fn()} user={{ id: "u1" }} />);

    fireEvent.click(screen.getByText(/开始选择题（\d+ 题）/));
    completeQuiz();

    expect(recordProgressMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activityType: "quiz",
        metadata: expect.objectContaining({ section: "reading", categoryId: "all" }),
      })
    );
  });

  it("shows a visible warning when quiz progress fails to save", async () => {
    recordProgressMock.mockRejectedValueOnce(new Error("network down"));
    render(<VocabQuizPage onNavigate={vi.fn()} user={{ id: "u1" }} />);

    fireEvent.click(screen.getByText(/开始选择题（\d+ 题）/));
    completeQuiz();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("network down");
    });
  });

  it("disables result actions while quiz progress is saving", () => {
    recordProgressMock.mockReturnValueOnce(new Promise(() => {}));
    render(<VocabQuizPage onNavigate={vi.fn()} user={{ id: "u1" }} />);

    fireEvent.click(screen.getByText(/开始选择题（\d+ 题）/));
    completeQuiz();

    expect(screen.getByText("正在保存练习记录…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再测一组" })).toBeDisabled();
  });

  it("starts a flashcard review from wrong quiz words", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      render(<VocabQuizPage onNavigate={vi.fn()} />);

      fireEvent.click(screen.getByText(/开始选择题（\d+ 题）/));
      completeQuiz();
      fireEvent.click(screen.getByRole("button", { name: "复习错词闪卡" }));

      expect(screen.getByText("闪卡检测")).toBeInTheDocument();
      expect(screen.getByText("点击翻面查看释义")).toBeInTheDocument();
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("does not record progress for guests", () => {
    render(<VocabQuizPage onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByText(/开始选择题（\d+ 题）/));
    completeQuiz();

    expect(recordProgressMock).not.toHaveBeenCalled();
  });

  it("starts flashcard mode from vocab quiz setup", () => {
    render(<VocabQuizPage onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "闪卡" }));
    fireEvent.click(screen.getByText(/开始闪卡（\d+ 词）/));

    expect(screen.getByText("闪卡检测")).toBeInTheDocument();
    expect(screen.getByText("点击翻面查看释义")).toBeInTheDocument();
  });
});
