import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CampManagementPage from "./CampManagementPage.jsx";
import { campAPI } from "../api/index.js";

vi.mock("../api/index.js", () => ({
  campAPI: {
    adminListCourses: vi.fn().mockResolvedValue([]),
    adminGetCourse: vi.fn(),
    teacherListCourses: vi.fn(),
  },
}));

describe("CampManagementPage", () => {
  it("loads courses through admin camp APIs", async () => {
    render(<CampManagementPage />);

    expect(await screen.findByRole("heading", { name: "课程上架、发布和运营维护" })).toBeInTheDocument();
    expect(campAPI.adminListCourses).toHaveBeenCalledTimes(1);
    expect(campAPI.teacherListCourses).not.toHaveBeenCalled();
  });
});
