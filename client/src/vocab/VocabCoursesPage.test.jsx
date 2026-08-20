import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import VocabCoursesPage from "./VocabCoursesPage.jsx";

const { contentMock, courseProgressMock, saveCourseProgressMock } = vi.hoisted(() => ({
  contentMock: vi.fn(),
  courseProgressMock: vi.fn(),
  saveCourseProgressMock: vi.fn(),
}));

vi.mock("../api/index.js", () => ({
  vocabularyAPI: {
    content: contentMock,
    courseProgress: courseProgressMock,
    saveCourseProgress: saveCourseProgressMock,
  },
}));

function clickNode(title) {
  const button = screen.getAllByRole("button").find((item) =>
    item.querySelector(".vc-course-node__title")?.textContent === title
  );
  expect(button).toBeTruthy();
  fireEvent.click(button);
}

describe("VocabCoursesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contentMock.mockResolvedValue(null);
    courseProgressMock.mockResolvedValue({ completedIds: [] });
    saveCourseProgressMock.mockResolvedValue({});
  });

  it("renders the vocab course tree with top-level nodes", () => {
    render(<VocabCoursesPage onNavigate={vi.fn()} />);

    expect(screen.getByText("不止背单词，更会记单词。")).toBeInTheDocument();
    expect(screen.getAllByText("词根词缀").length).toBeGreaterThan(0);
    expect(screen.getAllByText("语境记忆法").length).toBeGreaterThan(0);
  });

  it("requests course content with the selected prep exam system id", async () => {
    render(<VocabCoursesPage onNavigate={vi.fn()} prepExamId="kaoyan" />);

    await waitFor(() => {
      expect(contentMock).toHaveBeenCalledWith({ systemId: "system-postgraduate" });
    });
  });

  it("expands a top-level node to show its children", () => {
    render(<VocabCoursesPage onNavigate={vi.fn()} />);

    clickNode("词根词缀");

    expect(screen.getByText("常见前缀")).toBeInTheDocument();
  });

  it("records lesson view before quiz completion and completion after inline quiz", async () => {
    render(<VocabCoursesPage onNavigate={vi.fn()} user={{ id: "u1" }} />);

    await waitFor(() => expect(courseProgressMock).toHaveBeenCalled());

    clickNode("词根词缀");
    clickNode("常见前缀");

    expect(saveCourseProgressMock).toHaveBeenLastCalledWith({
      nodeId: "common-prefixes",
      status: "viewed",
      quizCorrect: 0,
      quizTotal: 0,
    });

    fireEvent.click(screen.getByRole("button", { name: /B\. 不、相反/ }));
    fireEvent.click(screen.getByRole("button", { name: "下一题" }));
    fireEvent.click(screen.getByRole("button", { name: /B\. 国际的，涉及多个国家/ }));
    fireEvent.click(screen.getByRole("button", { name: "查看结果" }));

    expect(saveCourseProgressMock).toHaveBeenLastCalledWith({
      nodeId: "common-prefixes",
      status: "completed",
      quizCorrect: 2,
      quizTotal: 2,
    });
  });

  it("shows a retry banner and clears it once the retried save succeeds", async () => {
    saveCourseProgressMock.mockRejectedValueOnce(new Error("network down"));
    saveCourseProgressMock.mockResolvedValueOnce({});

    render(<VocabCoursesPage onNavigate={vi.fn()} user={{ id: "u1" }} />);
    await waitFor(() => expect(courseProgressMock).toHaveBeenCalled());

    clickNode("词根词缀");
    clickNode("常见前缀");

    expect(await screen.findByRole("alert")).toHaveTextContent("进度保存失败");

    fireEvent.click(screen.getByRole("button", { name: "重试" }));

    await waitFor(() => expect(saveCourseProgressMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});
