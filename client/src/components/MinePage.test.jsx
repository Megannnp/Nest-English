import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MinePage from "./MinePage.jsx";
import { usersAPI } from "../api/index.js";

vi.mock("../api/index.js", () => ({
  usersAPI: {
    updateProfile: vi.fn(),
  },
}));

vi.mock("../hooks/useScrollReveal.js", () => ({
  default: () => ({ current: null }),
}));

describe("MinePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    usersAPI.updateProfile.mockResolvedValue({
      id: "student-1",
      role: "student",
      realName: "Amy",
      preferences: { prepExamId: "ielts" },
    });
  });

  it("shows and saves the student's prep exam target", async () => {
    const onUserUpdate = vi.fn();

    render(
      <MinePage
        user={{ id: "student-1", role: "student", realName: "Amy", preferences: { prepExamId: "gaokao" } }}
        onNavigate={vi.fn()}
        onUserUpdate={onUserUpdate}
        handleLogout={vi.fn()}
      />
    );

    expect(screen.getByText("备考目标")).toBeInTheDocument();
    expect(screen.getByText("高考")).toBeInTheDocument();

    fireEvent.click(screen.getByText("备考目标"));
    fireEvent.click(screen.getByRole("button", { name: "IELTS" }));

    await waitFor(() => {
      expect(usersAPI.updateProfile).toHaveBeenCalledWith({
        preferences: { prepExamId: "ielts" },
      });
    });
    expect(window.localStorage.getItem("nest_prep_exam_id")).toBe("ielts");
    expect(onUserUpdate).toHaveBeenCalledWith(expect.objectContaining({
      preferences: { prepExamId: "ielts" },
    }));
  });

  it("falls back to the current local prep exam for older student profiles", () => {
    window.localStorage.setItem("nest_prep_exam_id", "cet6");

    render(
      <MinePage
        user={{ id: "student-1", role: "student", realName: "Amy", preferences: {} }}
        onNavigate={vi.fn()}
        onUserUpdate={vi.fn()}
        handleLogout={vi.fn()}
      />
    );

    expect(screen.getByText("备考目标")).toBeInTheDocument();
    expect(screen.getByText("六级")).toBeInTheDocument();
  });

  it("does not save again when the active prep exam is clicked", () => {
    render(
      <MinePage
        user={{ id: "student-1", role: "student", realName: "Amy", preferences: { prepExamId: "gaokao" } }}
        onNavigate={vi.fn()}
        onUserUpdate={vi.fn()}
        handleLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("备考目标"));
    fireEvent.click(screen.getByRole("button", { name: "高考" }));

    expect(usersAPI.updateProfile).not.toHaveBeenCalled();
  });

  it("prevents concurrent prep exam saves", () => {
    let resolveSave;
    usersAPI.updateProfile.mockImplementationOnce(() => new Promise((resolve) => {
      resolveSave = resolve;
    }));

    render(
      <MinePage
        user={{ id: "student-1", role: "student", realName: "Amy", preferences: { prepExamId: "gaokao" } }}
        onNavigate={vi.fn()}
        onUserUpdate={vi.fn()}
        handleLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("备考目标"));
    fireEvent.click(screen.getByRole("button", { name: "IELTS" }));
    fireEvent.click(screen.getByRole("button", { name: "TOEFL" }));

    expect(usersAPI.updateProfile).toHaveBeenCalledTimes(1);
    resolveSave({
      id: "student-1",
      role: "student",
      realName: "Amy",
      preferences: { prepExamId: "ielts" },
    });
  });
});
