import { describe, expect, it } from "vitest";

import {
  createContentSurfaceKey,
  createContentSurfaceModel,
} from "./content-surface";

describe("enforcement content surfaces", () => {
  it("ENF-06 renders WARN as a non-blocking status", () => {
    expect(
      createContentSurfaceModel({
        action: "WARN",
        locale: "en",
        universe: "student",
      }),
    ).toEqual({
      kind: "warning",
      role: "status",
      blocking: false,
      title: "Distraction allowance almost exhausted",
      body: "Return to your work before access is blocked.",
    });
  });

  it("renders BLOCK as a modal blocker and permissive decisions as no surface", () => {
    expect(
      createContentSurfaceModel({
        action: "BLOCK",
        locale: "en",
        universe: "student",
      }),
    ).toEqual({
      kind: "blocker",
      role: "alertdialog",
      blocking: true,
      title: "Distraction allowance exhausted",
      body: "This site is blocked during your work period.",
    });
    expect(
      createContentSurfaceModel({
        action: "ALLOW",
        locale: "en",
        universe: "student",
      }),
    ).toBeNull();
    expect(
      createContentSurfaceModel({
        action: "TRACK",
        locale: "en",
        universe: "student",
      }),
    ).toBeNull();
  });

  it("keeps a stable identity while the same override surface is refreshed", () => {
    const firstGrant = (): Promise<boolean> => Promise.resolve(true);
    const replacementGrant = (): Promise<boolean> => Promise.resolve(false);

    expect(
      createContentSurfaceKey({
        action: "BLOCK",
        locale: "en",
        universe: "student",
        siteId: "site-1",
        grantOverride: firstGrant,
      }),
    ).toBe(
      createContentSurfaceKey({
        action: "BLOCK",
        locale: "en",
        universe: "student",
        siteId: "site-1",
        grantOverride: replacementGrant,
      }),
    );
    expect(
      createContentSurfaceKey({
        action: "BLOCK",
        locale: "en",
        universe: "student",
        siteId: "site-1",
      }),
    ).not.toBe(
      createContentSurfaceKey({
        action: "BLOCK",
        locale: "en",
        universe: "student",
        siteId: "site-2",
      }),
    );
    expect(
      createContentSurfaceKey({
        action: "BLOCK",
        locale: "en",
        universe: "student",
        siteId: "site-1",
      }),
    ).not.toBe(
      createContentSurfaceKey({
        action: "BLOCK",
        locale: "en",
        universe: "pro",
        siteId: "site-1",
      }),
    );
  });
});
