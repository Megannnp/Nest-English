import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PhoneticAnnotatorPanel, { buildExportHtml } from "./PhoneticAnnotatorPanel.jsx";

const { phoneticsAPIMock } = vi.hoisted(() => ({
  phoneticsAPIMock: {
    analyzeText: vi.fn(),
    recordProgress: vi.fn(),
  },
}));

vi.mock("../api/index.js", () => ({
  phoneticsAPI: phoneticsAPIMock,
}));

describe("PhoneticAnnotatorPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    phoneticsAPIMock.recordProgress.mockResolvedValue({});
  });

  it("analyzes input text and renders the annotated sentence row", async () => {
    phoneticsAPIMock.analyzeText.mockResolvedValue({
      sentences: [
        {
          text: "The prize was awarded.",
          tokens: [
            { word: "The", ipa: "ðə", stress: "weak", linkNext: false, dropPlosionEnd: false, pauseAfter: false, intonationAfter: null, trailingPunct: "" },
            { word: "prize", ipa: "praɪz", stress: "strong", linkNext: false, dropPlosionEnd: false, pauseAfter: false, intonationAfter: null, trailingPunct: "" },
            { word: "was", ipa: "wəz", stress: "weak", linkNext: true, dropPlosionEnd: false, pauseAfter: false, intonationAfter: null, trailingPunct: "" },
            { word: "awarded", ipa: "əˈwɔːrdɪd", stress: "strong", linkNext: false, dropPlosionEnd: false, pauseAfter: false, intonationAfter: "fall", trailingPunct: "." },
          ],
        },
      ],
    });

    render(<PhoneticAnnotatorPanel mode="sentence" />);

    fireEvent.change(screen.getByLabelText("英文句子"), { target: { value: "The prize was awarded." } });
    fireEvent.click(screen.getByRole("button", { name: "生成语音标注" }));

    await waitFor(() => expect(phoneticsAPIMock.analyzeText).toHaveBeenCalledWith({ text: "The prize was awarded." }));
    expect(await screen.findByText("prize")).toBeInTheDocument();
    expect(screen.getByText("/praɪz/")).toBeInTheDocument();
    expect(document.querySelector(".ph-annot-row__marked-text")).toHaveTextContent("The prize was‿ awarded.↘");
    expect(screen.getByTitle("语调走向")).toHaveTextContent("↘");
    expect(screen.getByTitle("连读")).toBeInTheDocument();
  });

  it("records discourse analysis in phonetics progress", async () => {
    phoneticsAPIMock.analyzeText.mockResolvedValue({
      sentences: [
        {
          text: "The prize was awarded.",
          tokens: [
            { word: "The", ipa: "ðə", stress: "weak", trailingPunct: "" },
            { word: "prize", ipa: "praɪz", stress: "strong", trailingPunct: "" },
          ],
        },
      ],
    });

    render(<PhoneticAnnotatorPanel mode="discourse" user={{ id: "user-1" }} />);

    fireEvent.change(screen.getByLabelText("英文语篇"), { target: { value: "The prize was awarded." } });
    fireEvent.click(screen.getByRole("button", { name: "生成语篇标注" }));

    await waitFor(() => expect(phoneticsAPIMock.recordProgress).toHaveBeenCalledWith(expect.objectContaining({
      activityType: "discourse-practice",
      score: 100,
      accuracy: 100,
      metadata: expect.objectContaining({
        mode: "discourse",
        sentenceCount: 1,
        tokenCount: 2,
      }),
    })));
  });

  it("exports complete word/pdf annotation markup", () => {
    const html = buildExportHtml({
      sentences: [
        {
          text: "Would you sit down?",
          tokens: [
            { word: "Would", ipa: "wʊd", stress: "weak", assimilationNext: { type: "d+j", result: "dʒ" }, trailingPunct: "" },
            { word: "you", ipa: "jə", stress: "weak", trailingPunct: "" },
            { word: "sit", ipa: "sɪt", stress: "strong", dropPlosionEnd: true, trailingPunct: "" },
            { word: "down", ipa: "daʊn", stress: "strong", linkNext: true, intonationAfter: "rise", trailingPunct: "?" },
          ],
          explanations: [{ category: "同化", detail: "Would you 中发生同化。" }],
        },
      ],
    });

    expect(html).toContain("/wʊd/");
    expect(html).toContain('class="annotation-table"');
    expect(html).toContain('src="data:image/svg+xml');
    expect(html).not.toContain(`${window.location.origin}/logo-full.svg`);
    expect(html).toContain("Would");
    expect(html).toContain("○");
    expect(html).toContain("●");
    expect(html).toContain('class="plosion-mark">̚</span>');
    expect(html).toContain(".stress-cell { color: #b34f72;");
    expect(html).toContain("‿");
    expect(html).toContain("→");
    expect(html).toContain("↗");
    expect(html).toContain("同化：Would you 中发生同化。");
  });

  it("opens pdf export through a print iframe", async () => {
    phoneticsAPIMock.analyzeText.mockResolvedValue({
      sentences: [
        {
          text: "The prize was awarded.",
          tokens: [
            { word: "The", ipa: "ðə", stress: "weak", trailingPunct: "" },
            { word: "prize", ipa: "praɪz", stress: "strong", trailingPunct: "." },
          ],
        },
      ],
    });

    render(<PhoneticAnnotatorPanel mode="discourse" />);

    fireEvent.change(screen.getByLabelText("英文语篇"), { target: { value: "The prize was awarded." } });
    fireEvent.click(screen.getByRole("button", { name: "生成语篇标注" }));
    await screen.findByRole("button", { name: "导出 PDF" });

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "导出 PDF" }));

    expect(document.querySelector('iframe[title="语篇语音标注 PDF 导出"]')).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(1000);
    expect(document.querySelector('iframe[title="语篇语音标注 PDF 导出"]')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("shows an error message when analysis fails", async () => {
    phoneticsAPIMock.analyzeText.mockRejectedValue(new Error("AI语音标注与原文不匹配，请重试"));

    render(<PhoneticAnnotatorPanel mode="discourse" />);

    fireEvent.change(screen.getByLabelText("英文语篇"), { target: { value: "Some passage text." } });
    fireEvent.click(screen.getByRole("button", { name: "生成语篇标注" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("AI语音标注与原文不匹配，请重试");
  });
});
