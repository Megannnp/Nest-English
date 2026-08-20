import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import VocabFlashcard from "./VocabFlashcard.jsx";

const WORD = {
  word: "analyze",
  pos: "v.",
  phonetic: "/ˈænəlaɪz/",
  zh: "分析",
  example: "Analyze the evidence.",
  tip: "拆开来看",
};

describe("VocabFlashcard", () => {
  it("flips with keyboard and exposes action buttons", () => {
    render(<VocabFlashcard word={WORD} onKnow={vi.fn()} onReview={vi.fn()} />);

    fireEvent.keyDown(screen.getByRole("button", { name: /点击翻面查看释义/ }), { key: "Enter" });

    expect(screen.getByText("认识了 ✓")).toBeInTheDocument();
    expect(screen.getByText("再看看 ↩")).toBeInTheDocument();
  });
});
