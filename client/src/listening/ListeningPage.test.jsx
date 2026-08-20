import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ListeningPage from "./ListeningPage.jsx";
import { listeningAPI } from "../api/index.js";

const audioMocks = vi.hoisted(() => ({
  play: vi.fn().mockResolvedValue(true),
}));

vi.mock("../api/index.js", () => ({
  listeningAPI: {
    content: vi.fn().mockResolvedValue({}),
    recordProgress: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("../hooks/useDictionaryAudio.js", () => ({
  default: () => ({
    playingKey: null,
    play: audioMocks.play,
    unsupported: false,
  }),
}));

vi.mock("../hooks/useScrollReveal.js", () => ({
  default: () => ({ current: null }),
}));

describe("ListeningPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests listening content with the selected prep exam system id", async () => {
    render(
      <ListeningPage
        user={{ id: "student-1", role: "student" }}
        activePage="listening-practice"
        prepExamId="cet6"
        hideTopBar
      />
    );

    await waitFor(() => {
      expect(listeningAPI.content).toHaveBeenCalledWith({ systemId: "system-cet6" });
    });
  });

  it("records practice dictation checks", async () => {
    render(
      <ListeningPage
        user={{ id: "student-1", role: "student" }}
        activePage="listening-practice"
        prepExamId="cet6"
        hideTopBar
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "生成练习" }));
    const dictation = await screen.findByPlaceholderText("输入你听到的句子…");
    fireEvent.change(dictation, { target: { value: "__wrong__" } });
    fireEvent.click(screen.getByRole("button", { name: "核对答案" }));

    await waitFor(() => {
      expect(listeningAPI.recordProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: "practice-dictation",
          score: 0,
          accuracy: 0,
          metadata: expect.objectContaining({
            prepExamId: "cet6",
            systemId: "system-cet6",
          }),
        })
      );
    });
  });

  it("records incorrect word dictation attempts", async () => {
    render(
      <ListeningPage
        user={{ id: "student-1", role: "student" }}
        activePage="listening-basics"
        hideTopBar
      />
    );

    const input = await screen.findAllByPlaceholderText("听后输入单词…");
    fireEvent.change(input[0], { target: { value: "__wrong__" } });
    fireEvent.click(screen.getAllByRole("button", { name: "核对" })[0]);

    await waitFor(() => {
      expect(listeningAPI.recordProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: "basics-word",
          score: 0,
          accuracy: 0,
        })
      );
    });
  });

  it("shows a visible warning when listening progress fails to save", async () => {
    listeningAPI.recordProgress.mockRejectedValueOnce(new Error("network down"));
    render(
      <ListeningPage
        user={{ id: "student-1", role: "student" }}
        activePage="listening-basics"
        hideTopBar
      />
    );

    const input = await screen.findAllByPlaceholderText("听后输入单词…");
    fireEvent.change(input[0], { target: { value: "__wrong__" } });
    fireEvent.click(screen.getAllByRole("button", { name: "核对" })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent("练习记录保存失败");
  });

  it("does not record the same word attempt twice", async () => {
    render(
      <ListeningPage
        user={{ id: "student-1", role: "student" }}
        activePage="listening-basics"
        hideTopBar
      />
    );

    const input = await screen.findAllByPlaceholderText("听后输入单词…");
    fireEvent.change(input[0], { target: { value: "__wrong__" } });
    const checkButton = screen.getAllByRole("button", { name: "核对" })[0];
    fireEvent.click(checkButton);
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(listeningAPI.recordProgress).toHaveBeenCalledTimes(1);
    });
  });

  it("uses the pair words in minimal-pair playback keys", async () => {
    render(
      <ListeningPage
        user={{ id: "student-1", role: "student" }}
        activePage="listening-basics"
        hideTopBar
      />
    );

    const playButtons = await screen.findAllByRole("button", { name: "播放辨音音频" });
    fireEvent.click(playButtons[0]);

    expect(audioMocks.play).toHaveBeenCalledWith(
      expect.stringMatching(/^pair-[a-z]+-[a-z]+-1$/),
      expect.any(String)
    );
    expect(audioMocks.play.mock.calls[0][0]).not.toContain("/ɪ/ vs /iː/");
  });

  it("aligns sentence diff after a missing word", async () => {
    const { container } = render(
      <ListeningPage
        user={{ id: "student-1", role: "student" }}
        activePage="listening-advanced"
        hideTopBar
      />
    );

    const textarea = await screen.findByPlaceholderText("第 1 句…");
    fireEvent.change(textarea, {
      target: { value: "Reading is one the best habits a person can develop." },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /核对第 \d+ 句答案/ })[0]);

    const missingWords = [...container.querySelectorAll(".ls-diff-word--missing")].map(node => node.textContent.trim());
    const okWords = [...container.querySelectorAll(".ls-diff-word--ok")].map(node => node.textContent.trim());

    expect(missingWords).toEqual(["of"]);
    expect(okWords).toEqual(expect.arrayContaining(["the", "best", "habits"]));
  });
});
