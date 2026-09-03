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

async function readActiveSite(background: Worker): Promise<string | undefined> {
  return background.evaluate(async () => {
    const values = await chrome.storage.session.get("distractionClockState");
    const state = values.distractionClockState as
      { siteId?: string } | undefined;
    return state?.siteId;
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
