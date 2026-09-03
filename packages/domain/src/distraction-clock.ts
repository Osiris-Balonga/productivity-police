import type { ScheduleState } from "./schedule";
import type { WebsiteRuleResolution } from "./website-rules";

export interface DistractionClockState {
  activeTabId?: number;
  siteId?: string;
  startedAt?: string;
  lastAccountedAt?: string;
}

export interface ClockObservation {
  enabled: boolean;
  scheduleState: ScheduleState;
  websiteResolution: WebsiteRuleResolution;
  overrideActive: boolean;
  activeTab: boolean;
  focusedWindow: boolean;
  idle: boolean;
  tabId?: number;
  siteId?: string;
  localDate: string;
}

export interface AccountingDelta {
  localDate: string;
  siteId: string;
  seconds: number;
}

export interface ClockTransition {
  state: DistractionClockState;
  accounting?: AccountingDelta;
}

function hasActiveSession(
  state: DistractionClockState,
): state is Required<DistractionClockState> {
  return (
    state.activeTabId !== undefined &&
    state.siteId !== undefined &&
    state.startedAt !== undefined &&
    state.lastAccountedAt !== undefined
  );
}

export function isDistractionClockState(
  value: unknown,
): value is DistractionClockState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const state = value as DistractionClockState;
  const definedFields = [
    state.activeTabId,
    state.siteId,
    state.startedAt,
    state.lastAccountedAt,
  ].filter((field) => field !== undefined).length;

  if (definedFields === 0) {
    return true;
  }

  return (
    hasActiveSession(state) &&
    Number.isInteger(state.activeTabId) &&
    state.activeTabId >= 0 &&
    state.siteId.length > 0 &&
    Number.isFinite(Date.parse(state.startedAt)) &&
    Number.isFinite(Date.parse(state.lastAccountedAt))
  );
}

export function shouldCountDistraction(
  observation: ClockObservation,
): observation is ClockObservation &
  Required<Pick<ClockObservation, "tabId" | "siteId">> {
  return (
    observation.enabled &&
    observation.scheduleState === "ON_DUTY" &&
    observation.websiteResolution === "BLACKLIST" &&
    !observation.overrideActive &&
    observation.activeTab &&
    observation.focusedWindow &&
    !observation.idle &&
    observation.tabId !== undefined &&
    observation.siteId !== undefined
  );
}

function transition(
  priorState: DistractionClockState,
  observation: ClockObservation,
  now: Date,
  recoverElapsed: boolean,
): ClockTransition {
  if (!isDistractionClockState(priorState)) {
    throw new RangeError("Invalid distraction clock state");
  }
  if (!Number.isFinite(now.getTime())) {
    throw new RangeError("A valid transition instant is required");
  }

  let accounting: AccountingDelta | undefined;
  if (recoverElapsed && hasActiveSession(priorState)) {
    const elapsed = Math.max(
      0,
      (now.getTime() - Date.parse(priorState.lastAccountedAt)) / 1_000,
    );
    if (elapsed > 0) {
      accounting = {
        localDate: observation.localDate,
        siteId: priorState.siteId,
        seconds: elapsed,
      };
    }
  }

  let state: DistractionClockState = {};
  if (shouldCountDistraction(observation)) {
    const timestamp = now.toISOString();
    const sameSession =
      hasActiveSession(priorState) &&
      priorState.activeTabId === observation.tabId &&
      priorState.siteId === observation.siteId;
    state = {
      activeTabId: observation.tabId,
      siteId: observation.siteId,
      startedAt: sameSession ? priorState.startedAt : timestamp,
      lastAccountedAt: timestamp,
    };
  }

  return accounting === undefined ? { state } : { state, accounting };
}

export function transitionDistractionClock(
  priorState: DistractionClockState,
  observation: ClockObservation,
  now: Date,
): ClockTransition {
  return transition(priorState, observation, now, true);
}

export function resumeDistractionClock(
  persistedState: DistractionClockState,
  observation: ClockObservation,
  now: Date,
): ClockTransition {
  return transition(persistedState, observation, now, false);
}
