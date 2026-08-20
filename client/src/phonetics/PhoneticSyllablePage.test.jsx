import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PhoneticSyllablePage from "./PhoneticSyllablePage.jsx";

describe("PhoneticSyllablePage", () => {
  it("renders the rebuilt syllable framework", () => {
    render(<PhoneticSyllablePage hideTopBar />);

    expect(screen.getByText("拆清音节结构。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "总览" })).toBeInTheDocument();
    expect(screen.getByText("音节是什么")).toBeInTheDocument();
    expect(screen.getByText("怎么划分音节")).toBeInTheDocument();
    expect(screen.getByText("怎么数音节")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "分类" })).toBeInTheDocument();
    expect(screen.getByText("开音节与闭音节")).toBeInTheDocument();
    expect(screen.getByText("主重读音节与次重读音节")).toBeInTheDocument();
  });
});
