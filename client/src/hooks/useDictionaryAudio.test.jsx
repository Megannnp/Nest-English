import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import useDictionaryAudio from "./useDictionaryAudio.js";

describe("useDictionaryAudio", () => {
  let originalSpeechSynthesis;
  let originalUtterance;

  beforeEach(() => {
    originalSpeechSynthesis = window.speechSynthesis;
    originalUtterance = window.SpeechSynthesisUtterance;
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel: vi.fn(),
        getVoices: vi.fn(() => []),
        speak: vi.fn(),
      },
    });
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: originalSpeechSynthesis,
    });
    window.SpeechSynthesisUtterance = originalUtterance;
    vi.restoreAllMocks();
  });

  it("uses TTS directly for sentence text and cancels it on stop", async () => {
    const { result } = renderHook(() => useDictionaryAudio());

    await act(async () => {
      await result.current.play("sentence-1", "The students are studying in the library.", 0.8);
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.stop();
    });

    expect(window.speechSynthesis.cancel).toHaveBeenCalledTimes(1);
  });
});
