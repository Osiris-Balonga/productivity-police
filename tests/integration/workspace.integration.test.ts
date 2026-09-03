import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("extension workspace", () => {
  it("starts with a Manifest V3 shell and no product permissions", async () => {
    const manifest = JSON.parse(
      await readFile(
        new URL("../../apps/extension/public/manifest.json", import.meta.url),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(manifest.manifest_version).toBe(3);
    expect(manifest).not.toHaveProperty("permissions");
  });
});
