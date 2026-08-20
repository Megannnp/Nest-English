import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PrepExamOnboardingModal from "./PrepExamOnboardingModal.jsx";

const { usersAPIMock } = vi.hoisted(() => ({
  usersAPIMock: {
    updateProfile: vi.fn(),
  },
}));

vi.mock("../../api/index.js", () => ({
  usersAPI: usersAPIMock,
}));

const DISMISSED_KEY = "nest_prep_exam_onboarding_dismissed";

describe("PrepExamOnboardingModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("shows for a brand-new student without an explicit exam preference", () => {
    render(
      <PrepExamOnboardingModal
        user={{ id: "u1", role: "student", preferences: {} }}
        onNavigate={vi.fn()}
        onUserUpdate={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog", { name: "选择备考考试" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /高考/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /IELTS/ })).toBeInTheDocument();
  });

  it("does not show for a student who already selected an exam", () => {
    render(
      <PrepExamOnboardingModal
        user={{ id: "u1", role: "student", preferences: { prepExamId: "ielts" } }}
        onNavigate={vi.fn()}
        onUserUpdate={vi.fn()}
      />
    );

    expect(screen.queryByRole("dialog", { name: "选择备考考试" })).not.toBeInTheDocument();
  });

  it("does not show for teacher / parent / admin roles", () => {
    const { unmount } = render(
      <PrepExamOnboardingModal
        user={{ id: "t1", role: "teacher", preferences: {} }}
        onNavigate={vi.fn()}
        onUserUpdate={vi.fn()}
      />
    );
    expect(screen.queryByRole("dialog", { name: "选择备考考试" })).not.toBeInTheDocument();
    unmount();

    render(
      <PrepExamOnboardingModal
        user={{ id: "p1", role: "parent", preferences: {} }}
        onNavigate={vi.fn()}
        onUserUpdate={vi.fn()}
      />
    );
    expect(screen.queryByRole("dialog", { name: "选择备考考试" })).not.toBeInTheDocument();
  });

  it("persists the selected exam and closes without hijacking the current page", async () => {
    usersAPIMock.updateProfile.mockResolvedValue({ id: "u1", role: "student", preferences: { prepExamId: "ielts" } });
    const onNavigate = vi.fn();
    const onUserUpdate = vi.fn();

    render(
      <PrepExamOnboardingModal
        user={{ id: "u1", role: "student", preferences: {} }}
        onNavigate={onNavigate}
        onUserUpdate={onUserUpdate}
      />
    );

    const ieltsButton = screen.getByRole("button", { name: /IELTS/ });
    ieltsButton.click();

    await waitFor(() => {
      expect(usersAPIMock.updateProfile).toHaveBeenCalledWith({
        preferences: { prepExamId: "ielts" },
      });
    });

    expect(window.localStorage.getItem("nest_prep_exam_id")).toBe("ielts");
    expect(window.localStorage.getItem(DISMISSED_KEY)).toBe("1");
    expect(onUserUpdate).toHaveBeenCalled();
    // 选择考试不跳转，避免打断用户当前页面
    expect(onNavigate).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "选择备考考试" })).not.toBeInTheDocument();
    });
  });

  it("supports skipping and marks the onboarding as dismissed", async () => {
    render(
      <PrepExamOnboardingModal
        user={{ id: "u1", role: "student", preferences: {} }}
        onNavigate={vi.fn()}
        onUserUpdate={vi.fn()}
      />
    );

    screen.getByRole("button", { name: "先跳过" }).click();

    expect(window.localStorage.getItem(DISMISSED_KEY)).toBe("1");
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "选择备考考试" })).not.toBeInTheDocument();
    });
  });
});