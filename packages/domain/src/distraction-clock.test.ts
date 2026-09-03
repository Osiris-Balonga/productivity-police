import { describe, expect, it } from "vitest";

import {
  transitionDistractionClock,
  type ClockObservation,
  type DistractionClockState,
} from "./distraction-clock";

const countingObservation: ClockObservation = {
  enabled: true,
  scheduleState: "ON_DUTY",
  websiteResolution: "BLACKLIST",
  overrideActive: false,
  activeTab: true,
  focusedWindow: true,
  idle: false,
  tabId: 1,
  siteId: "video-site",
  localDate: "2026-09-03",
};

function at(seconds: number): Date {
  return new Date(Date.UTC(2026, 8, 3, 9, 0, seconds));
}

describe("distraction clock transitions", () => {
  it("ENF-12 accounts an active blacklisted tab in a focused window", () => {
    const started = transitionDistractionClock({}, countingObservation, at(0));
    const heartbeat = transitionDistractionClock(
      started.state,
      countingObservation,
      at(60),
    );

    expect(heartbeat.accounting).toEqual({
      localDate: "2026-09-03",
      siteId: "video-site",
      seconds: 60,
    });
  });

  it("ENF-13 does not account a background tab", () => {
    const result = transitionDistractionClock(
      {},
      { ...countingObservation, activeTab: false },
      at(0),
    );

    expect(result).toEqual({ state: {} });
  });

  it("ENF-14 keeps a single clock while the active tab changes", () => {
    const tabA = transitionDistractionClock({}, countingObservation, at(0));
    const tabBObservation: ClockObservation = {
      ...countingObservation,
      tabId: 2,
      siteId: "social-site",
    };
    const tabB = transitionDistractionClock(
      tabA.state,
      tabBObservation,
      at(60),
    );
    const backToTabA = transitionDistractionClock(
      tabB.state,
      countingObservation,
      at(120),
    );

    expect([tabB.accounting, backToTabA.accounting]).toEqual([
      { localDate: "2026-09-03", siteId: "video-site", seconds: 60 },
      { localDate: "2026-09-03", siteId: "social-site", seconds: 60 },
    ]);
  });

  it.each([
    ["idle user", { idle: true }],
    ["unfocused window", { focusedWindow: false }],
  ])("ENF-15 excludes time for an %s", (_label, change) => {
    const started = transitionDistractionClock({}, countingObservation, at(0));
    const paused = transitionDistractionClock(
      started.state,
      { ...countingObservation, ...change },
      at(30),
    );
    const stayedPaused = transitionDistractionClock(
      paused.state,
      { ...countingObservation, ...change },
      at(60),
    );

    expect(paused.accounting?.seconds).toBe(30);
    expect(stayedPaused).toEqual({ state: {} });
  });

  it("never mutates the prior clock state", () => {
    const state: DistractionClockState = {};
    transitionDistractionClock(state, countingObservation, at(0));
    expect(state).toEqual({});
  });
});
