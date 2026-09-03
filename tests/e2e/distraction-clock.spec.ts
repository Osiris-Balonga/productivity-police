import { createServer, type Server } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Worker,
} from "@playwright/test";

const extensionPath = resolve("dist/extension");
let server: Server;
let port: number;
let context: BrowserContext | undefined;
let worker: Worker;

test.beforeAll(async ({ browserName }, testInfo) => {
  testInfo.setTimeout(60_000);
  if (browserName !== "chromium") {
    throw new Error("Extension E2E tests require Chromium");
  }
  server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html" });
    response.end("<!doctype html><title>Synthetic distraction</title>");
  });
  await new Promise<void>((ready) => {
    server.listen(0, ready);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("The synthetic site server did not bind to a TCP port");
  }
  port = address.port;

  const userDataDirectory = await mkdtemp(
    resolve(tmpdir(), "productivity-police-e2e-"),
  );
  context = await chromium.launchPersistentContext(userDataDirectory, {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
});

test.afterAll(async () => {
  await context?.close();
  await new Promise<void>((done, reject) => {
    server.close((error) => {
      if (error === undefined) {
        done();
      } else {
        reject(error);
      }
    });
  });
});

test("E2E-07 alternates two blacklisted tabs without double counting", async ({
  browserName,
}, testInfo) => {
  testInfo.setTimeout(180_000);
  expect(browserName).toBe("chromium");
  if (context === undefined) {
    throw new Error("The extension browser context is unavailable");
  }
  await worker.evaluate(async () => {
    const weekdays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    await chrome.storage.local.set({
      productivityPolice: {
        schemaVersion: 1,
        settings: {
          enabled: true,
          schedule: {
            days: weekdays.map((weekday) => ({
              weekday,
              enabled: true,
              periods: [{ start: "00:00", end: "23:59" }],
            })),
          },
        },
        websiteRules: [
          {
            id: "site-a",
            name: "Site A",
            domain: "127.0.0.1",
            list: "blacklist",
            createdAt: "2026-09-03T00:00:00.000Z",
          },
          {
            id: "site-b",
            name: "Site B",
            domain: "localhost",
            list: "blacklist",
            createdAt: "2026-09-03T00:00:00.000Z",
          },
        ],
        usageByDate: {},
      },
    });
    chrome.idle.setDetectionInterval(300);
  });

  const tabA = await context.newPage();
  const tabB = await context.newPage();
  await tabA.goto(`http://127.0.0.1:${String(port)}/a`);
  await tabB.goto(`http://localhost:${String(port)}/b`);
  await tabA.bringToFront();

  await expect.poll(() => readActiveSite(worker)).toBe("site-a");
  await tabA.waitForTimeout(60_000);

  await tabB.bringToFront();
  await expect.poll(() => readActiveSite(worker)).toBe("site-b");
  await tabB.waitForTimeout(60_000);

  await tabA.bringToFront();
  await expect.poll(() => readTotalUsage(worker)).toBeGreaterThanOrEqual(118);

  const usage = await readUsage(worker);
  expect(usage.usedSeconds).toBeLessThan(130);
  expect(usage.bySiteSeconds["site-a"]).toBeGreaterThanOrEqual(59);
  expect(usage.bySiteSeconds["site-b"]).toBeGreaterThanOrEqual(59);
});

test("E2E-06 applies a work-period decision to an open tab without reload", async () => {
  if (context === undefined) {
    throw new Error("The extension browser context is unavailable");
  }

  await worker.evaluate(async () => {
    const weekdays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    await chrome.storage.local.set({
      productivityPolice: {
        schemaVersion: 1,
        settings: {
          enabled: true,
          dailyAllowanceMinutes: 0,
          schedule: {
            days: weekdays.map((weekday) => ({
              weekday,
              enabled: false,
              periods: [],
            })),
          },
        },
        websiteRules: [
          {
            id: "schedule-site",
            name: "Schedule Site",
            domain: "127.0.0.1",
            list: "blacklist",
            createdAt: "2026-09-03T00:00:00.000Z",
          },
        ],
        usageByDate: {},
      },
    });
  });

  const openTab = await context.newPage();
  await openTab.goto(`http://127.0.0.1:${String(port)}/schedule`);
  await expect
    .poll(() =>
      openTab.getAttribute("html", "data-productivity-police-decision"),
    )
    .toBe("ALLOW");
  const navigationStart = await openTab.evaluate(
    () => performance.getEntriesByType("navigation")[0]?.startTime,
  );

  await worker.evaluate(async () => {
    const values = await chrome.storage.local.get("productivityPolice");
    const envelope = values.productivityPolice as {
      settings: {
        schedule: {
          days: {
            weekday: string;
            enabled: boolean;
            periods: { start: string; end: string }[];
          }[];
        };
      };
    };
    envelope.settings.schedule.days = envelope.settings.schedule.days.map(
      (day) => ({
        ...day,
        enabled: true,
        periods: [{ start: "00:00", end: "23:59" }],
      }),
    );
    await chrome.storage.local.set({ productivityPolice: envelope });
  });

  await expect
    .poll(() =>
      openTab.getAttribute("html", "data-productivity-police-decision"),
    )
    .toBe("BLOCK");
  expect(
    await openTab.evaluate(
      () => performance.getEntriesByType("navigation")[0]?.startTime,
    ),
  ).toBe(navigationStart);
});

test("E2E-01 shows the blocker immediately for an exhausted blacklisted site", async () => {
  if (context === undefined) {
    throw new Error("The extension browser context is unavailable");
  }

  await worker.evaluate(async () => {
    const weekdays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    await chrome.storage.local.set({
      productivityPolice: {
        schemaVersion: 1,
        settings: {
          enabled: true,
          locale: "en",
          dailyAllowanceMinutes: 0,
          schedule: {
            days: weekdays.map((weekday) => ({
              weekday,
              enabled: true,
              periods: [{ start: "00:00", end: "23:59" }],
            })),
          },
        },
        websiteRules: [
          {
            id: "blocked-site",
            name: "Blocked Site",
            domain: "127.0.0.1",
            list: "blacklist",
            createdAt: "2026-09-03T00:00:00.000Z",
          },
        ],
        usageByDate: {},
      },
    });
  });

  const blockedTab = await context.newPage();
  await blockedTab.goto(`http://127.0.0.1:${String(port)}/blocked`);

  await expect(
    blockedTab.locator('[data-productivity-police-surface="blocker"]'),
  ).toBeVisible();
  await expect(blockedTab.getByRole("alertdialog")).toContainText(
    "Distraction allowance exhausted",
  );
});

test("E2E-02 completes an override in the current tab", async () => {
  await configureBlockedSite();
  const overriddenTab = await openAndGrantOverride("override-current");

  await expect(
    overriddenTab.locator('[data-productivity-police-surface="blocker"]'),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      overriddenTab.getAttribute("html", "data-productivity-police-decision"),
    )
    .toBe("ALLOW");
});

test("E2E-03 blocks a new tab after the overridden tab closes", async () => {
  await configureBlockedSite();
  const overriddenTab = await openAndGrantOverride("override-close");
  await overriddenTab.close();

  if (context === undefined) {
    throw new Error("The extension browser context is unavailable");
  }
  const reopenedTab = await context.newPage();
  await reopenedTab.goto(`http://127.0.0.1:${String(port)}/override-reopened`);
  await expect(
    reopenedTab.locator('[data-productivity-police-surface="blocker"]'),
  ).toBeVisible();
});

test("E2E-08 persists an override through worker suspension and expires it off-site", async () => {
  if (context === undefined) {
    throw new Error("The extension browser context is unavailable");
  }
  await configureBlockedSite();
  const overriddenTab = await openAndGrantOverride("override-worker-before");
  await expect.poll(() => readOverrideCount(worker)).toBe(1);

  const workerRestarted = context.waitForEvent("serviceworker");
  const devtools = await context.newCDPSession(overriddenTab);
  await devtools.send("ServiceWorker.enable");
  await devtools.send("ServiceWorker.stopAllWorkers");

  await overriddenTab.goto(
    `http://127.0.0.1:${String(port)}/override-worker-after`,
  );
  worker = await workerRestarted;
  await expect
    .poll(() =>
      overriddenTab.getAttribute("html", "data-productivity-police-decision"),
    )
    .toBe("ALLOW");
  await expect(
    overriddenTab.locator('[data-productivity-police-surface="blocker"]'),
  ).toHaveCount(0);

  await overriddenTab.goto(
    `http://localhost:${String(port)}/override-worker-off-site`,
  );
  await expect(
    overriddenTab.locator('[data-productivity-police-surface="blocker"]'),
  ).toBeVisible();
  await expect.poll(() => readOverrideCount(worker)).toBe(0);
});

async function configureBlockedSite(): Promise<void> {
  await worker.evaluate(async () => {
    const weekdays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    await chrome.storage.local.set({
      productivityPolice: {
        schemaVersion: 1,
        settings: {
          enabled: true,
          locale: "en",
          dailyAllowanceMinutes: 0,
          schedule: {
            days: weekdays.map((weekday) => ({
              weekday,
              enabled: true,
              periods: [{ start: "00:00", end: "23:59" }],
            })),
          },
        },
        websiteRules: [
          {
            id: "override-site",
            name: "Override Site",
            domain: "127.0.0.1",
            list: "blacklist",
            createdAt: "2026-09-03T00:00:00.000Z",
          },
          {
            id: "override-other-site",
            name: "Other Override Site",
            domain: "localhost",
            list: "blacklist",
            createdAt: "2026-09-03T00:00:00.000Z",
          },
        ],
        usageByDate: {},
        activity: [],
      },
    });
  });
}

async function openAndGrantOverride(path: string) {
  if (context === undefined) {
    throw new Error("The extension browser context is unavailable");
  }
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${String(port)}/${path}`);
  await page.getByRole("button", { name: "Request override" }).click();
  await page.getByRole("button", { name: "I understand" }).click();
  await page.getByRole("button", { name: "Continue anyway" }).click();
  await page
    .getByRole("textbox", { name: "Why is this access necessary?" })
    .fill("Required reference material");
  await page.getByRole("button", { name: "Unlock this tab" }).click();
  return page;
}

async function readActiveSite(background: Worker): Promise<string | undefined> {
  return background.evaluate(async () => {
    const values = await chrome.storage.session.get("distractionClockState");
    const state = values.distractionClockState as
      { siteId?: string } | undefined;
    return state?.siteId;
  });
}

async function readOverrideCount(background: Worker): Promise<number> {
  return background.evaluate(async () => {
    const values = await chrome.storage.session.get("tabOverrides");
    return Array.isArray(values.tabOverrides) ? values.tabOverrides.length : 0;
  });
}

interface StoredUsage {
  usedSeconds: number;
  bySiteSeconds: Record<string, number>;
}

async function readUsage(background: Worker): Promise<StoredUsage> {
  return background.evaluate(async () => {
    const values = await chrome.storage.local.get("productivityPolice");
    const envelope = values.productivityPolice as {
      usageByDate?: Record<string, StoredUsage>;
    };
    const usage = Object.values(envelope.usageByDate ?? {})[0];
    return usage ?? { usedSeconds: 0, bySiteSeconds: {} };
  });
}

async function readTotalUsage(background: Worker): Promise<number> {
  return (await readUsage(background)).usedSeconds;
}
