import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPrepExamModule } from "./prepExamConfig.js";
import {
  PREP_EXAM_CHANGED_EVENT,
  PREP_EXAM_STORAGE_KEY,
  buildPrepExamProps,
  readSelectedPrepExamId,
  writeSelectedPrepExamId,
} from "./prepExamSelection.js";

describe("prep exam selection", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("falls back to the default exam and exposes app props", () => {
    expect(readSelectedPrepExamId()).toBe("gaokao");
    expect(buildPrepExamProps()).toMatchObject({
      prepExamId: "gaokao",
      prepExam: { label: "高考" },
    });
  });

  it("persists valid exam targets and emits a change event", () => {
    const handler = vi.fn();
    window.addEventListener(PREP_EXAM_CHANGED_EVENT, handler);

    expect(writeSelectedPrepExamId("ielts")).toBe("ielts");

    expect(window.localStorage.getItem(PREP_EXAM_STORAGE_KEY)).toBe("ielts");
    expect(readSelectedPrepExamId()).toBe("ielts");
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      detail: expect.objectContaining({ examId: "ielts" }),
    }));

    window.removeEventListener(PREP_EXAM_CHANGED_EVENT, handler);
  });

  it("prefers the logged-in user's prep exam over local guest selection", () => {
    window.localStorage.setItem(PREP_EXAM_STORAGE_KEY, "ielts");

    expect(readSelectedPrepExamId({ preferences: { prepExamId: "cet6" } })).toBe("cet6");
    expect(buildPrepExamProps({ preferences: { prepExamId: "cet6" } })).toMatchObject({
      prepExamId: "cet6",
      prepExam: { label: "六级" },
    });
  });

  it("resolves module branches for the selected exam", () => {
    expect(getPrepExamModule("gaokao", "reading")?.branches).toContain("七选五");
    expect(getPrepExamModule("ielts", "writing")?.branches).toContain("Band Descriptor");
  });
});
