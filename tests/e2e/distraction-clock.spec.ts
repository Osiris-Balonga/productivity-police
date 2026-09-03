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
    ...(process.env.PLAYWRIGHT_CHROME_PATH === undefined
      ? {}
      : { executablePath: process.env.PLAYWRIGHT_CHROME_PATH }),
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

test("PP-028 opens a usable popup from a clean extension install", async () => {
  if (context === undefined) {
    throw new Error("The extension browser context is unavailable");
  }
  const extensionId = new URL(worker.url()).host;
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup/index.html`);

  await expect(popup.getByText("Local popup data is unavailable.")).toHaveCount(
    0,
  );
  await expect(
    popup.getByRole("button", {
      name: /^(Open dashboard|Ouvrir le tableau de bord)$/,
    }),
  ).toBeVisible();
  await expect
    .poll(() =>
      worker.evaluate(async () => {
        const values = await chrome.storage.local.get("productivityPolice");
        const envelope = values.productivityPolice as
          | {
              onboarding?: { completed?: boolean };
              settings?: { enabled?: boolean };
            }
          | undefined;
        return {
          configured: envelope?.onboarding?.completed,
          enabled: envelope?.settings?.enabled,
        };
      }),
    )
    .toEqual({ configured: false, enabled: false });
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

test("E2E-05 shows BREAK in the popup without consuming allowance", async () => {
  if (context === undefined) {
    throw new Error("The extension browser context is unavailable");
  }
  const now = new Date();
  const minute = now.getHours() * 60 + now.getMinutes();
  test.skip(
    minute < 2 || minute > 1437,
    "The schedule model cannot surround the first or final two minutes of a day",
  );
  const toTime = (value: number): string =>
    `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

  await worker.evaluate(
    async ({ firstEnd, secondStart }) => {
      const weekdays = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];
      const localDate = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      await chrome.storage.local.set({
        productivityPolice: {
          schemaVersion: 1,
          settings: {
            enabled: true,
            locale: "en",
            universe: "student",
            dailyAllowanceMinutes: 10,
            schedule: {
              days: weekdays.map((weekday) => ({
                weekday,
                enabled: true,
                periods: [
                  { start: "00:00", end: firstEnd },
                  { start: secondStart, end: "23:59" },
                ],
              })),
            },
          },
          websiteRules: [],
          usageByDate: {
            [localDate]: {
              localDate,
              usedSeconds: 180,
              bySiteSeconds: { video: 180 },
              warningTriggered: false,
              exhaustedTriggered: false,
            },
          },
        },
      });
    },
    { firstEnd: toTime(minute), secondStart: toTime(minute + 1) },
  );

  const extensionId = new URL(worker.url()).host;
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup/index.html`);
  await expect(popup.getByText("Break", { exact: true })).toBeVisible();
  const usageBefore = await readTotalUsage(worker);
  await popup.waitForTimeout(2_000);
  expect(await readTotalUsage(worker)).toBe(usageBefore);
});

test("E2E-04 rerenders blocker, dashboard, and popup after a locale change", async () => {
  if (context === undefined) {
    throw new Error("The extension browser context is unavailable");
  }
  await configureBlockedSite("fr", "pro");
  const extensionId = new URL(worker.url()).host;
  const blockedTab = await context.newPage();
  const dashboard = await context.newPage();
  const popup = await context.newPage();
  await blockedTab.goto(`http://127.0.0.1:${String(port)}/locale-change`);
  await dashboard.goto(
    `chrome-extension://${extensionId}/dashboard/index.html`,
  );
  await popup.goto(`chrome-extension://${extensionId}/popup/index.html`);

  await expect(blockedTab.getByRole("alertdialog")).toContainText(
    "Quota de distraction épuisé",
  );
  await expect(
    dashboard.getByRole("heading", {
      name: "La concentration du jour, clairement mesurée",
    }),
  ).toBeVisible();
  await expect(
    popup.getByRole("button", { name: "Ouvrir le tableau de bord" }),
  ).toBeVisible();
  await expect(popup.locator(".popup-shell")).toHaveAttribute(
    "data-universe",
    "pro",
  );

  await worker.evaluate(async () => {
    const values = await chrome.storage.local.get("productivityPolice");
    const envelope = values.productivityPolice as {
      settings: { locale: string; universe: string };
    };
    envelope.settings.locale = "en";
    envelope.settings.universe = "student";
    await chrome.storage.local.set({ productivityPolice: envelope });
  });

  await expect(blockedTab.getByRole("alertdialog")).toContainText(
    "Distraction allowance exhausted",
  );
  await expect(
    dashboard.getByRole("heading", {
      name: "Today’s focus, clearly measured",
    }),
  ).toBeVisible();
  await expect(
    popup.getByRole("button", { name: "Open dashboard" }),
  ).toBeVisible();
  await expect(popup.locator(".popup-shell")).toHaveAttribute(
    "data-universe",
    "student",
  );
  await expect(dashboard.locator(".app-shell")).toHaveAttribute(
    "data-universe",
    "student",
  );
  await expect(
    blockedTab.locator("#productivity-police-surface-host"),
  ).toHaveAttribute("data-productivity-police-universe", "student");
});

test("INT-10 refreshes provider caches immediately from Integrations", async () => {
  if (context === undefined) {
    throw new Error("The extension browser context is unavailable");
  }
  await configureBlockedSite("en", "pro");
  const extensionId = new URL(worker.url()).host;
  const dashboard = await context.newPage();
  await dashboard.goto(
    `chrome-extension://${extensionId}/dashboard/index.html#integrations`,
  );

  await dashboard.getByRole("button", { name: "Refresh now" }).click();

  await expect(dashboard.getByRole("status")).toHaveText("Refresh complete.");
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

  const devtools = await context.newCDPSession(overriddenTab);
  await devtools.send("ServiceWorker.enable");
  await devtools.send("ServiceWorker.stopAllWorkers");

  await overriddenTab.goto(
    `http://127.0.0.1:${String(port)}/override-worker-after`,
  );
  await expect
    .poll(() =>
      overriddenTab.getAttribute("html", "data-productivity-police-decision"),
    )
    .toBe("ALLOW");
  await expect(
    overriddenTab.locator('[data-productivity-police-surface="blocker"]'),
  ).toHaveCount(0);
  await expect.poll(() => readOverrideCount(worker)).toBe(1);

  await overriddenTab.goto(
    `http://localhost:${String(port)}/override-worker-off-site`,
  );
  await expect(
    overriddenTab.locator('[data-productivity-police-surface="blocker"]'),
  ).toBeVisible();
  await expect.poll(() => readOverrideCount(worker)).toBe(0);
});

test("E2E-09 materializes a missed weekly report once across worker restarts", async () => {
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
    const date = new Date();
    const day = date.getUTCDay();
    date.setUTCDate(date.getUTCDate() - ((day + 6) % 7) - 7);
    const localDate = date.toISOString().slice(0, 10);
    await chrome.storage.local.set({
      productivityPolice: {
        schemaVersion: 1,
        settings: {
          enabled: true,
          locale: "en",
          universe: "student",
          dailyAllowanceMinutes: 30,
          schedule: {
            days: weekdays.map((weekday) => ({
              weekday,
              enabled: weekday === "monday",
              periods:
                weekday === "monday" ? [{ start: "09:00", end: "17:00" }] : [],
            })),
          },
        },
        websiteRules: [],
        usageByDate: {
          [localDate]: {
            localDate,
            usedSeconds: 120,
            bySiteSeconds: { video: 120 },
            warningTriggered: false,
            exhaustedTriggered: false,
          },
        },
        activity: [],
        reports: [],
      },
    });
  });

  const wakeTab = await context.newPage();
  await suspendWorker(context, wakeTab);
  await wakeTab.goto(`http://127.0.0.1:${String(port)}/report-recovery-one`);
  await expect.poll(() => readReportCount(worker)).toBe(1);
  await suspendWorker(context, wakeTab);
  await wakeTab.goto(`http://127.0.0.1:${String(port)}/report-recovery-two`);
  await expect.poll(() => readReportCount(worker)).toBe(1);
});

async function configureBlockedSite(
  locale: "fr" | "en" = "en",
  universe: "student" | "pro" = "student",
): Promise<void> {
  await worker.evaluate(
    async ({ locale, universe }) => {
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
            locale,
            universe,
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
    },
    { locale, universe },
  );
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

async function suspendWorker(
  browserContext: BrowserContext,
  wakeTab: import("@playwright/test").Page,
): Promise<void> {
  const devtools = await browserContext.newCDPSession(wakeTab);
  await devtools.send("ServiceWorker.enable");
  await devtools.send("ServiceWorker.stopAllWorkers");
  await devtools.detach();
}

async function readReportCount(background: Worker): Promise<number> {
  return background.evaluate(async () => {
    const values = await chrome.storage.local.get("productivityPolice");
    const envelope = values.productivityPolice as { reports?: unknown[] };
    return envelope.reports?.length ?? 0;
  });
}
