import { describe, expect, it } from "vitest";

import { SessionTabOverrideRegistry } from "../../apps/extension/src/background/tab-override-registry";
import { MemoryStorageArea } from "../../packages/storage/src";

const rules = {
  rules: [
    {
      id: "video-site",
      name: "Video Site",
      domain: "videos.example.com",
      list: "blacklist" as const,
      createdAt: "2026-09-03T00:00:00.000Z",
    },
  ],
};

describe("tab override lifecycle", () => {
  it("OVR-05 removes the override when its tab closes", async () => {
    const registry = new SessionTabOverrideRegistry(new MemoryStorageArea());
    await registry.save({
      tabId: 7,
      siteId: "video-site",
      canonicalDomain: "videos.example.com",
      justification: "Required reference material",
      grantedAt: "2026-09-03T10:00:00.000Z",
    });

    await registry.remove(7);

    await expect(registry.get(7)).resolves.toBeUndefined();
  });

  it("OVR-08 removes an active override after cross-domain navigation", async () => {
    const registry = new SessionTabOverrideRegistry(new MemoryStorageArea());
    await registry.save({
      tabId: 7,
      siteId: "video-site",
      canonicalDomain: "videos.example.com",
      justification: "Required reference material",
      grantedAt: "2026-09-03T10:00:00.000Z",
    });

    await registry.reconcile(
      [{ id: 7, url: "https://work.example.com/reference" }],
      rules,
    );

    await expect(registry.list()).resolves.toEqual([]);
  });

  it("OVR-09 restores only overrides whose tab and site are still valid", async () => {
    const area = new MemoryStorageArea({
      tabOverrides: [
        {
          tabId: 7,
          siteId: "video-site",
          canonicalDomain: "videos.example.com",
          justification: "Required reference material",
          grantedAt: "2026-09-03T10:00:00.000Z",
        },
        {
          tabId: 8,
          siteId: "video-site",
          canonicalDomain: "videos.example.com",
          justification: "Closed tab",
          grantedAt: "2026-09-03T10:00:00.000Z",
        },
        {
          tabId: 9,
          siteId: "removed-video-site",
          canonicalDomain: "videos.example.com",
          justification: "Removed rule",
          grantedAt: "2026-09-03T10:00:00.000Z",
        },
      ],
    });

    const restored = await new SessionTabOverrideRegistry(area).reconcile(
      [
        { id: 7, url: "https://videos.example.com/watch/1" },
        { id: 9, url: "https://videos.example.com/watch/2" },
      ],
      rules,
    );

    expect(restored).toEqual([
      expect.objectContaining({ tabId: 7, siteId: "video-site" }),
    ]);
  });
});
