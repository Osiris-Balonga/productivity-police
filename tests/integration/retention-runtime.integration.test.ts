import { describe, expect, it, vi } from "vitest";

import { resetExtensionRuntime } from "../../apps/extension/src/background/retention-runtime";
import { MemoryStorageArea } from "../../packages/storage/src";

describe("extension data reset", () => {
  it("RET-05 clears local and session data before reevaluating open tabs", async () => {
    const local = new MemoryStorageArea({
      productivityPolice: { schemaVersion: 1 },
    });
    const session = new MemoryStorageArea({
      distractionClockState: { accumulatedSeconds: 42 },
      tabOverrides: [{ tabId: 7 }],
    });
    const reevaluate = vi.fn().mockResolvedValue(undefined);

    await resetExtensionRuntime(local, session, reevaluate);

    await expect(local.get("productivityPolice")).resolves.toEqual({});
    await expect(session.get("distractionClockState")).resolves.toEqual({});
    await expect(session.get("tabOverrides")).resolves.toEqual({});
    expect(reevaluate).toHaveBeenCalledOnce();
  });
});
