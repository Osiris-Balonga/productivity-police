import { describe, expect, it } from "vitest";

import {
  confirmOverrideRequest,
  isTabOverrideValid,
  startOverrideRequest,
  submitOverrideRequest,
} from "./override-workflow";

const grantedAt = new Date("2026-09-03T10:00:00.000Z");

function readyForJustification() {
  return confirmOverrideRequest(
    confirmOverrideRequest(startOverrideRequest(7, "video-site")),
  );
}

describe("override workflow", () => {
  it("OVR-01 remains blocked after only the first confirmation", () => {
    const request = confirmOverrideRequest(
      startOverrideRequest(7, "video-site"),
    );

    expect(request.stage).toBe("SECOND_CONFIRMATION");
    expect(request.override).toBeUndefined();
  });

  it("OVR-02 refuses two confirmations without a justification", () => {
    expect(
      submitOverrideRequest(readyForJustification(), "   ", grantedAt).override,
    ).toBeUndefined();
  });

  it("OVR-03 grants an override to the requested tab and site", () => {
    expect(
      submitOverrideRequest(
        readyForJustification(),
        "Required reference material",
        grantedAt,
      ),
    ).toMatchObject({
      stage: "GRANTED",
      override: {
        tabId: 7,
        siteId: "video-site",
        justification: "Required reference material",
        grantedAt: "2026-09-03T10:00:00.000Z",
      },
      activity: {
        type: "OVERRIDE_GRANTED",
        tabId: 7,
        siteId: "video-site",
        justification: "Required reference material",
      },
    });
  });

  it("OVR-04 does not apply a tab A override to tab B", () => {
    const override = submitOverrideRequest(
      readyForJustification(),
      "Required reference material",
      grantedAt,
    ).override;

    expect(override).toBeDefined();
    expect(isTabOverrideValid(override, 7, "video-site")).toBe(true);
    expect(isTabOverrideValid(override, 8, "video-site")).toBe(false);
  });

  it("OVR-06 grants access without restoring exhausted allowance", () => {
    const usage = Object.freeze({ usedSeconds: 600, allowanceSeconds: 600 });

    submitOverrideRequest(
      readyForJustification(),
      "Required reference material",
      grantedAt,
    );

    expect(usage).toEqual({ usedSeconds: 600, allowanceSeconds: 600 });
  });

  it("OVR-07 has no daily cap and emits one activity per grant", () => {
    const grants = [7, 8, 9].map((tabId) => {
      const request = confirmOverrideRequest(
        confirmOverrideRequest(startOverrideRequest(tabId, "video-site")),
      );
      return submitOverrideRequest(request, `Need ${String(tabId)}`, grantedAt);
    });

    expect(grants.every((grant) => grant.override !== undefined)).toBe(true);
    expect(grants.map((grant) => grant.activity?.type)).toEqual([
      "OVERRIDE_GRANTED",
      "OVERRIDE_GRANTED",
      "OVERRIDE_GRANTED",
    ]);
  });
});
