import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PhoneticSentencePage from "./PhoneticSentencePage.jsx";

describe("PhoneticSentencePage", () => {
  it("renders the rebuilt sentence framework", () => {
    render(<PhoneticSentencePage hideTopBar />);

    expect(screen.getByText("读出句子的节奏。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "韵律" })).toBeInTheDocument();
    expect(screen.getByText("重读与弱读")).toBeInTheDocument();
    expect(screen.getByText("停顿")).toBeInTheDocument();
    expect(screen.getByText("语调")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "语流现象" })).toBeInTheDocument();
    expect(screen.getByText("连读")).toBeInTheDocument();
    expect(screen.getByText("失去爆破")).toBeInTheDocument();
    expect(screen.getByText("同化")).toBeInTheDocument();
  });
});
