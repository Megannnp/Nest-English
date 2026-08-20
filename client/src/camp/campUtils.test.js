import { describe, expect, it } from "vitest";

import { canUseCampMockPayment, getCampCourseActionLabel, shouldShowCampDemoCode } from "./campUtils.js";

describe("camp utils", () => {
  it("only enables mock payment in dev-like environments", () => {
    expect(canUseCampMockPayment({ DEV: true })).toBe(true);
    expect(canUseCampMockPayment({ DEV: false })).toBe(false);
  });

  it("only shows demo redeem codes in dev-like environments", () => {
    expect(shouldShowCampDemoCode({ DEV: true })).toBe(true);
    expect(shouldShowCampDemoCode({ DEV: false })).toBe(false);
  });

  it("does not label paid enrollment as direct signup when mock payment is disabled", () => {
    expect(getCampCourseActionLabel({ status: "published" }, false)).toBe("使用兑换码");
    expect(getCampCourseActionLabel({ status: "published", enrolled: true }, false)).toBe("进入学习");
    expect(getCampCourseActionLabel({ status: "coming_soon" }, false)).toBe("即将开课");
  });
});
