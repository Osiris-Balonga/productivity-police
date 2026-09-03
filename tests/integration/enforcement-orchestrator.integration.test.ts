import { describe, expect, it } from "vitest";

import {
  reevaluateOpenTabs,
  type EnforcementDecisionMessage,
} from "../../apps/extension/src/background/enforcement-orchestrator";

describe("Chrome enforcement orchestration", () => {
  it("ENF-08 immediately sends BLOCK to an already open tab when allowance reaches zero", async () => {
    const messages: {
      tabId: number;
      message: EnforcementDecisionMessage;
    }[] = [];

    await reevaluateOpenTabs(
      {
        enabled: true,
        scheduleState: "ON_DUTY",
        rules: {
          rules: [
            {
              id: "video-site",
              name: "Video Site",
              domain: "video.test",
              list: "blacklist",
              createdAt: "2026-09-03T00:00:00.000Z",
            },
          ],
        },
        usedSeconds: 600,
        allowanceSeconds: 600,
        locale: "en",
      },
      [{ id: 7, url: "https://video.test/watch" }],
      (tabId, message) => {
        messages.push({ tabId, message });
        return Promise.resolve();
      },
    );

    expect(messages).toEqual([
      {
        tabId: 7,
        message: {
          type: "ENFORCEMENT_DECISION",
          decision: {
            action: "BLOCK",
            reason: "ALLOWANCE_EXHAUSTED",
          },
          locale: "en",
        },
      },
    ]);
  });
});
