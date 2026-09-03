import { describe, expect, it } from "vitest";

import { InMemoryTabOverrideRegistry } from "../../apps/extension/src/background/tab-override-registry";

describe("tab override lifecycle", () => {
  it("OVR-05 removes the override when its tab closes", () => {
    const registry = new InMemoryTabOverrideRegistry();
    registry.save({
      tabId: 7,
      siteId: "video-site",
      justification: "Required reference material",
      grantedAt: "2026-09-03T10:00:00.000Z",
    });

    registry.remove(7);

    expect(registry.get(7)).toBeUndefined();
  });
});
