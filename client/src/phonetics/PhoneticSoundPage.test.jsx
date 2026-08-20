import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PhoneticSoundPage from "./PhoneticSoundPage.jsx";
import { phoneticsAPI } from "../api/index.js";

const { phonemePlayMock, dictPlayMock } = vi.hoisted(() => ({
  phonemePlayMock: vi.fn(),
  dictPlayMock: vi.fn(),
}));

vi.mock("../api/index.js", () => ({
  phoneticsAPI: { recordProgress: vi.fn() },
}));

vi.mock("../hooks/usePhonemeAudio.js", () => ({
  default: () => ({ playingKey: null, play: phonemePlayMock, stop: vi.fn() }),
}));

vi.mock("../hooks/useDictionaryAudio.js", () => ({
  default: () => ({ playingKey: null, play: dictPlayMock, stop: vi.fn(), unsupported: false }),
}));

describe("PhoneticSoundPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    phonemePlayMock.mockResolvedValue(true);
    dictPlayMock.mockResolvedValue(true);
    phoneticsAPI.recordProgress.mockResolvedValue({});
  });

  it("renders the vowel and consonant sections", () => {
    render(<PhoneticSoundPage hideTopBar />);

    expect(screen.getByText("认准音素，读对单词。")).toBeInTheDocument();
    expect(screen.getByText(/单元音/)).toBeInTheDocument();
    expect(screen.getByText(/双元音/)).toBeInTheDocument();
    expect(screen.getByText("清辅音 · 浊辅音 对照")).toBeInTheDocument();
    expect(screen.getByText("流音")).toBeInTheDocument();
    expect(screen.getByText("声门音")).toBeInTheDocument();
    expect(screen.queryByText("边音")).not.toBeInTheDocument();
    expect(screen.queryByText("气音")).not.toBeInTheDocument();
  });

  it("records sound practice progress when a logged-in user plays a phoneme", async () => {
    render(<PhoneticSoundPage hideTopBar user={{ id: "u1" }} activePage="phonetics-sound" />);

    fireEvent.click(screen.getByRole("button", { name: "/ɑː/" }));

    expect(phonemePlayMock).toHaveBeenCalledWith("ph-ipa-/ɑː/", "/ɑː/");
    await vi.waitFor(() => {
      expect(phoneticsAPI.recordProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: "sound-practice",
          metadata: expect.objectContaining({ page: "phonetics-sound", target: "phoneme" }),
        })
      );
    });
  });

  it("shows a visible warning when sound progress fails to save", async () => {
    phoneticsAPI.recordProgress.mockRejectedValueOnce(new Error("network down"));
    render(<PhoneticSoundPage hideTopBar user={{ id: "u1" }} activePage="phonetics-sound" />);

    fireEvent.click(screen.getByRole("button", { name: "/ɑː/" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("练习记录保存失败");
  });

  it("does not record progress for guests", async () => {
    render(<PhoneticSoundPage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: "/ɑː/" }));

    await vi.waitFor(() => expect(phonemePlayMock).toHaveBeenCalled());
    expect(phoneticsAPI.recordProgress).not.toHaveBeenCalled();
  });
});
