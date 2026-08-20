import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import WritingRefineSentencePage from "./WritingRefineSentencePage.jsx";

const { saveFavoriteMock } = vi.hoisted(() => ({ saveFavoriteMock: vi.fn() }));

vi.mock("../api/index.js", () => ({
  writingProgressAPI: { saveFavorite: saveFavoriteMock },
}));

vi.mock("../components/shared/ModuleAssignmentSection.jsx", () => ({
  default: () => null,
}));

vi.mock("../hooks/useScrollReveal.js", () => ({
  default: () => ({ current: null }),
}));

function jsonResponse(content) {
  return { ok: true, json: async () => ({ content }) };
}

function selectTypeAndDifficulty() {
  fireEvent.click(screen.getByRole("button", { name: /描写心情/ }));
  fireEvent.click(screen.getByRole("button", { name: "下一步" }));
  fireEvent.click(screen.getByRole("button", { name: "简单" }));
}

describe("WritingRefineSentencePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    global.fetch = vi.fn();
  });

  it("walks through type and difficulty selection to generate a base sentence", async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse("She feels happy."));

    render(<WritingRefineSentencePage user={{ id: "u1" }} hideTopBar />);

    expect(screen.getByText("想练习哪种句子？")).toBeInTheDocument();
    selectTypeAndDifficulty();
    fireEvent.click(screen.getByRole("button", { name: "开始练习" }));

    expect(await screen.findByText("She feels happy.")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/grammar/practice",
      expect.objectContaining({ method: "POST" })
    );
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).purpose).toBe("writing_refine_sentence");
  });

  it("shows an error and lets the user retry when base-sentence generation fails", async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ msg: "生成失败" }) });

    render(<WritingRefineSentencePage user={{ id: "u1" }} hideTopBar />);

    selectTypeAndDifficulty();
    fireEvent.click(screen.getByRole("button", { name: "开始练习" }));

    expect(await screen.findByText("生成失败")).toBeInTheDocument();
  });

  it("fetches hints for the current draft and surfaces an error if that request fails", async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse("She feels happy."));

    render(<WritingRefineSentencePage user={{ id: "u1" }} hideTopBar />);
    selectTypeAndDifficulty();
    fireEvent.click(screen.getByRole("button", { name: "开始练习" }));
    await screen.findByText("She feels happy.");

    fireEvent.change(screen.getByPlaceholderText("在这里输入你扩充后的句子..."), {
      target: { value: "She feels very happy today." },
    });

    global.fetch.mockResolvedValueOnce(jsonResponse("加入具体的时间\n加入地点\n加入原因"));
    fireEvent.click(screen.getByRole("button", { name: /获取提示/ }));

    expect(await screen.findByText("加入具体的时间")).toBeInTheDocument();

    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ msg: "提示服务暂时不可用" }) });
    fireEvent.click(screen.getByRole("button", { name: /获取提示/ }));

    expect(await screen.findByText("提示服务暂时不可用")).toBeInTheDocument();
  });

  it("polishes the sentence and shows the before/after comparison", async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse("She feels happy."));

    render(<WritingRefineSentencePage user={{ id: "u1" }} hideTopBar />);
    selectTypeAndDifficulty();
    fireEvent.click(screen.getByRole("button", { name: "开始练习" }));
    await screen.findByText("She feels happy.");

    fireEvent.change(screen.getByPlaceholderText("在这里输入你扩充后的句子..."), {
      target: { value: "She feels very happy today." },
    });

    global.fetch.mockResolvedValueOnce(jsonResponse(
      "【润色句】\nShe felt overjoyed that morning.\n【说明】\n1. 用 overjoyed 替换 very happy，更生动。"
    ));
    fireEvent.click(screen.getByRole("button", { name: /AI 润色/ }));

    expect(await screen.findByText("She felt overjoyed that morning.")).toBeInTheDocument();
    expect(screen.getByText(/用 overjoyed 替换/)).toBeInTheDocument();
  });

  it("prompts login instead of saving a favorite for a guest", async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse("She feels happy."));
    const onLoginClick = vi.fn();

    render(<WritingRefineSentencePage onLoginClick={onLoginClick} hideTopBar />);
    selectTypeAndDifficulty();
    fireEvent.click(screen.getByRole("button", { name: "开始练习" }));
    await screen.findByText("She feels happy.");

    fireEvent.change(screen.getByPlaceholderText("在这里输入你扩充后的句子..."), {
      target: { value: "She feels very happy today." },
    });
    global.fetch.mockResolvedValueOnce(jsonResponse("【润色句】\nShe felt overjoyed.\n【说明】\n改动说明。"));
    fireEvent.click(screen.getByRole("button", { name: /AI 润色/ }));
    await screen.findByText("She felt overjoyed.");

    fireEvent.click(screen.getByRole("button", { name: "收藏句子" }));

    expect(onLoginClick).toHaveBeenCalled();
    expect(saveFavoriteMock).not.toHaveBeenCalled();
  });
});
