import { describe, expect, it } from "vitest";

import { getUniverseTheme } from "./universe-themes";

describe("universe themes", () => {
  it("provides complete and distinct Student and Pro theme tokens", () => {
    const student = getUniverseTheme("student");
    const pro = getUniverseTheme("pro");

    expect(Object.keys(student.tokens)).toEqual(Object.keys(pro.tokens));
    expect(student.tokens).not.toEqual(pro.tokens);
    expect(student.fontFamily).toContain("Georgia");
    expect(pro.fontFamily).toContain("Inter");
  });
});
