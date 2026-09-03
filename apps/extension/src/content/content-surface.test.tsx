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
      }),
    ).toEqual({
      kind: "blocker",
      role: "alertdialog",
      blocking: true,
      title: "Distraction allowance exhausted",
      body: "This site is blocked during your work period.",
    });
    expect(
      createContentSurfaceModel({ action: "ALLOW", locale: "en" }),
    ).toBeNull();
    expect(
      createContentSurfaceModel({ action: "TRACK", locale: "en" }),
    ).toBeNull();
  });

  it("keeps a stable identity while the same override surface is refreshed", () => {
    const firstGrant = (): Promise<boolean> => Promise.resolve(true);
    const replacementGrant = (): Promise<boolean> => Promise.resolve(false);

    expect(
      createContentSurfaceKey({
        action: "BLOCK",
        locale: "en",
        siteId: "site-1",
        grantOverride: firstGrant,
      }),
    ).toBe(
      createContentSurfaceKey({
        action: "BLOCK",
        locale: "en",
        siteId: "site-1",
        grantOverride: replacementGrant,
      }),
    );
    expect(
      createContentSurfaceKey({
        action: "BLOCK",
        locale: "en",
        siteId: "site-1",
      }),
    ).not.toBe(
      createContentSurfaceKey({
        action: "BLOCK",
        locale: "en",
        siteId: "site-2",
      }),
    );
  });
});
