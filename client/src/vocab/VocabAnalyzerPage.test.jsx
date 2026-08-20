import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import VocabAnalyzerPage from "./VocabAnalyzerPage.jsx";

const { analyzeWordMock, saveFavoriteMock } = vi.hoisted(() => ({
  analyzeWordMock: vi.fn(),
  saveFavoriteMock: vi.fn(),
}));

vi.mock("../api/index.js", () => ({
  vocabularyAPI: {
    analyzeWord: analyzeWordMock,
    saveFavorite: saveFavoriteMock,
  },
}));

describe("VocabAnalyzerPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    analyzeWordMock.mockResolvedValue({
      word: "perseverance",
      pos: "n.",
      phonetic: "/ˌpɜːsɪˈvɪərəns/",
      definition: "坚持不懈",
      etymology: "per- (through) + severus (strict)",
      collocations: ["show perseverance"],
      examples: ["Her perseverance paid off."],
      synonyms: ["persistence"],
      antonyms: ["laziness"],
      memoryTip: "联想马拉松选手咬牙坚持。",
    });
  });

  it("analyzes a word and renders the breakdown", async () => {
    render(<VocabAnalyzerPage />);

    fireEvent.click(screen.getByRole("button", { name: "分析单词" }));

    await waitFor(() => {
      expect(analyzeWordMock).toHaveBeenCalledWith("perseverance");
    });

    expect(await screen.findByText(/坚持不懈/)).toBeInTheDocument();
    expect(screen.getByText(/per- \(through\)/)).toBeInTheDocument();
    expect(screen.getByText("Her perseverance paid off.")).toBeInTheDocument();
  });

  it("shows an error message when analysis fails", async () => {
    analyzeWordMock.mockRejectedValueOnce(new Error("单词分析失败，请稍后重试"));

    render(<VocabAnalyzerPage />);
    fireEvent.click(screen.getByRole("button", { name: "分析单词" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("单词分析失败，请稍后重试");
  });

  it("requires login before saving a favorite", async () => {
    const onLoginClick = vi.fn();
    render(<VocabAnalyzerPage onLoginClick={onLoginClick} />);

    fireEvent.click(screen.getByRole("button", { name: "分析单词" }));
    await screen.findByText(/坚持不懈/);

    fireEvent.click(screen.getByRole("button", { name: "收藏这个词" }));

    expect(onLoginClick).toHaveBeenCalled();
    expect(saveFavoriteMock).not.toHaveBeenCalled();
  });

  it("saves a favorite for a logged-in user", async () => {
    saveFavoriteMock.mockResolvedValue({ id: "fav-1" });
    render(<VocabAnalyzerPage user={{ id: "u1" }} />);

    fireEvent.click(screen.getByRole("button", { name: "分析单词" }));
    await screen.findByText(/坚持不懈/);

    fireEvent.click(screen.getByRole("button", { name: "收藏这个词" }));

    await waitFor(() => {
      expect(saveFavoriteMock).toHaveBeenCalledWith(
        expect.objectContaining({ content: "perseverance" })
      );
    });
    expect(await screen.findByRole("button", { name: "已收藏" })).toBeInTheDocument();
  });
});
