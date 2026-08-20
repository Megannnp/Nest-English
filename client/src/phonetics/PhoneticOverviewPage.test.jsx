import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PhoneticOverviewPage from "./PhoneticOverviewPage.jsx";

vi.mock("../hooks/useScrollReveal.js", () => ({
  default: () => ({ current: null }),
}));

describe("PhoneticOverviewPage", () => {
  it("renders the module home entry grid with all voice training entries", () => {
    render(<PhoneticOverviewPage hideTopBar />);

    expect(screen.getByText("筑巢语音")).toBeInTheDocument();
    expect(screen.getByText("从训练营、音素、音节到句子与语篇，形成循序渐进的标准发音训练路径。")).toBeInTheDocument();

    // 2×2 功能入口卡：训练营 / 音素训练 / 音节与朗读 / 句子与语篇
    expect(screen.getByRole("button", { name: /进入训练营/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /进入音素训练/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /进入音节与朗读/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /进入句子与语篇/ })).toBeInTheDocument();

    // 主按钮「进入 7 天语音训练营」
    expect(screen.getByRole("button", { name: "进入 7 天语音训练营" })).toBeInTheDocument();
  });

  it("navigates to the matching page when an entry card is clicked", () => {
    const onNavigate = vi.fn();
    render(<PhoneticOverviewPage onNavigate={onNavigate} hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: /进入音素训练/ }));
    expect(onNavigate).toHaveBeenCalledWith("phonetics-sound");
  });

  it("navigates to the camp when the primary action is clicked", () => {
    const onNavigate = vi.fn();
    render(<PhoneticOverviewPage onNavigate={onNavigate} hideTopBar />);

    fireEvent.click(screen.getByRole("button", { name: "进入 7 天语音训练营" }));
    expect(onNavigate).toHaveBeenCalledWith("phonetics-camp");
  });
});