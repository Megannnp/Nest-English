import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ReadingTopBar from "./ReadingTopBar.jsx";

describe("ReadingTopBar", () => {
  it("shows growth for students and workbench for teachers", () => {
    const { rerender } = render(
      <ReadingTopBar user={{ id: "s1", role: "student" }} onNavigate={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: "练习记录" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "阅读工作台" })).not.toBeInTheDocument();

    rerender(<ReadingTopBar user={{ id: "t1", role: "teacher" }} onNavigate={vi.fn()} />);

    expect(screen.getByRole("button", { name: "阅读工作台" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "练习记录" })).not.toBeInTheDocument();
  });
});
