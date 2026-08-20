import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PhoneticDiscoursePage from "./PhoneticDiscoursePage.jsx";

const playMock = vi.fn();
const playSequenceMock = vi.fn();

vi.mock("../hooks/useTTS.js", () => ({
  default: () => ({
    play: playMock,
    playSequence: playSequenceMock,
    playingKey: null,
    loadingKey: null,
    unsupported: false,
    errorMessage: "",
  }),
}));

describe("PhoneticDiscoursePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a clickable story with annotations", () => {
    render(<PhoneticDiscoursePage hideTopBar />);

    expect(screen.getByText("把语音放进语篇。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "语篇" })).toBeInTheDocument();
    expect(screen.getAllByText("The Tea Party").length).toBeGreaterThan(0);
    expect(screen.getByText("In the 18th century, many people lived in the American colonies.")).toBeInTheDocument();
    expect(screen.getByText("信息焦点：18th century、American colonies。")).toBeInTheDocument();
    expect(screen.getByText("1773年，美国殖民者为反对英国征税，将英国茶叶倒入波士顿港，成为美国独立战争的重要导火索。")).toBeInTheDocument();
  });

  it("plays the selected story audio", () => {
    render(<PhoneticDiscoursePage hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: "播放全文" }));

    expect(playSequenceMock).toHaveBeenCalledWith(
      "story-tea-party-full",
      expect.arrayContaining([expect.stringContaining("In the 18th century")]),
      0.8
    );
  });
});
