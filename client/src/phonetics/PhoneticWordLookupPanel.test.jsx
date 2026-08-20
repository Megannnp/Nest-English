import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PhoneticWordLookupPanel from "./PhoneticWordLookupPanel.jsx";

const { phoneticsAPIMock } = vi.hoisted(() => ({
  phoneticsAPIMock: {
    analyzeWord: vi.fn(),
  },
}));

vi.mock("../api/index.js", () => ({
  phoneticsAPI: phoneticsAPIMock,
}));

describe("PhoneticWordLookupPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries a word and renders syllables, definitions and phrases", async () => {
    phoneticsAPIMock.analyzeWord.mockResolvedValue({
      word: "elephant",
      ipa: "ˈelɪfənt",
      syllables: [
        { text: "el", ipa: "ˈel", stressed: true },
        { text: "e", ipa: "ɪ", stressed: false },
        { text: "phant", ipa: "fənt", stressed: false },
      ],
      syllableTeaching: "elephant 共 3 个音节。",
      definitions: [{ pos: "n.", meaning: "大象" }],
      phrases: [
        { phrase: "a herd of elephants", ipa: "ə hɜːd əv elɪfənts", teaching: "herd of 之间发生连读。" },
      ],
    });

    render(<PhoneticWordLookupPanel />);

    fireEvent.change(screen.getByLabelText("英文单词"), { target: { value: "elephant" } });
    fireEvent.click(screen.getByRole("button", { name: "查询" }));

    await waitFor(() => expect(phoneticsAPIMock.analyzeWord).toHaveBeenCalledWith({ word: "elephant" }));
    expect(await screen.findByText("elephant")).toBeInTheDocument();
    expect(screen.getByText("el")).toBeInTheDocument();
    expect(screen.getByText("phant")).toBeInTheDocument();
    expect(screen.getByText("elephant 共 3 个音节。")).toBeInTheDocument();
    expect(screen.getByText("大象")).toBeInTheDocument();
    expect(screen.getByText("a herd of elephants")).toBeInTheDocument();
    expect(screen.getByText("herd of 之间发生连读。")).toBeInTheDocument();
  });

  it("shows an error message when the lookup fails", async () => {
    phoneticsAPIMock.analyzeWord.mockRejectedValue(new Error("AI查词的音节拆分与原词不匹配，请重试"));

    render(<PhoneticWordLookupPanel />);

    fireEvent.change(screen.getByLabelText("英文单词"), { target: { value: "elephant" } });
    fireEvent.click(screen.getByRole("button", { name: "查询" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("AI查词的音节拆分与原词不匹配，请重试");
  });
});
