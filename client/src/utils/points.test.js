import { describe, expect, it } from "vitest";

import { getLocalDateKey } from "./points.js";

describe("getLocalDateKey", () => {
  it("formats the local calendar date without time components", () => {
    const date = new Date(2026, 5, 22, 23, 59, 58, 123);

    expect(getLocalDateKey(date)).toBe("2026-06-22");
  });
});
