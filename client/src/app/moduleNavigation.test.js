import { describe, expect, it, vi } from "vitest";

import {
  buildStudioModuleNavItems,
  getActiveModuleConfig,
  getModuleTabs,
  isBaseModule,
  isPrepModule,
} from "./moduleNavigation.js";

describe("module navigation config", () => {
  it("separates prep modules from reusable base modules", () => {
    expect(isPrepModule("reading")).toBe(true);
    expect(isPrepModule("vocab")).toBe(true);
    expect(isBaseModule("grammar")).toBe(true);
    expect(isBaseModule("phonetics")).toBe(true);
  });

  it("keeps practice record entries inside student module tabs", () => {
    expect(getModuleTabs("reading").map((item) => item.label)).toContain("练习记录");
    expect(getModuleTabs("vocab").map((item) => item.label)).toContain("练习记录");
    expect(getModuleTabs("speaking").map((item) => item.label)).toContain("练习记录");
  });

  it("keeps exam practice entries explicit without changing the shared UI component", () => {
    const navItems = buildStudioModuleNavItems("reading", {
      activePage: "reading-paper",
      onNavigate: vi.fn(),
      isTeacher: false,
    });
    const practiceDropdown = navItems.find((item) => item.label === "阅读练习")?.dropdown || [];

    expect(practiceDropdown.map((item) => item.label)).toContain("真题组卷");
    expect(practiceDropdown.find((item) => item.label === "真题组卷")?.active).toBe(true);
    expect(navItems.map((item) => item.label)).toContain("练习记录");
  });

  it("treats progress pages as module pages so the module nav can stay visible", () => {
    expect(getActiveModuleConfig("records")?.id).toBe("writing");
    expect(getActiveModuleConfig("reading-progress")?.id).toBe("reading");
    expect(getActiveModuleConfig("grammar-progress")?.id).toBe("grammar");
  });
});
