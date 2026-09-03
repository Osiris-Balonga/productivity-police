export type OverrideStage =
  | "FIRST_CONFIRMATION"
  | "SECOND_CONFIRMATION"
  | "JUSTIFICATION_REQUIRED"
  | "GRANTED";

export interface TabOverride {
  readonly tabId: number;
  readonly siteId: string;
  readonly justification: string;
  readonly grantedAt: string;
}

export interface OverrideGrantedActivity {
  readonly type: "OVERRIDE_GRANTED";
  readonly occurredAt: string;
  readonly tabId: number;
  readonly siteId: string;
  readonly justification: string;
}

export interface OverrideRequest {
  readonly stage: OverrideStage;
  readonly tabId: number;
  readonly siteId: string;
  readonly override?: Readonly<TabOverride>;
  readonly activity?: Readonly<OverrideGrantedActivity>;
}

export function startOverrideRequest(
  tabId: number,
  siteId: string,
): Readonly<OverrideRequest> {
  return Object.freeze({ stage: "FIRST_CONFIRMATION", tabId, siteId });
}

export function confirmOverrideRequest(
  request: OverrideRequest,
): Readonly<OverrideRequest> {
  if (request.stage === "FIRST_CONFIRMATION") {
    return Object.freeze({ ...request, stage: "SECOND_CONFIRMATION" });
  }
  if (request.stage === "SECOND_CONFIRMATION") {
    return Object.freeze({ ...request, stage: "JUSTIFICATION_REQUIRED" });
  }
  return request;
}

export function submitOverrideRequest(
  request: OverrideRequest,
  justification: string,
  grantedAt: Date,
): Readonly<OverrideRequest> {
  const normalizedJustification = justification.trim();
  if (
    request.stage !== "JUSTIFICATION_REQUIRED" ||
    normalizedJustification.length === 0 ||
    !Number.isFinite(grantedAt.getTime())
  ) {
    return request;
  }

  const occurredAt = grantedAt.toISOString();
  const override = Object.freeze({
    tabId: request.tabId,
    siteId: request.siteId,
    justification: normalizedJustification,
    grantedAt: occurredAt,
  });
  const activity = Object.freeze({
    type: "OVERRIDE_GRANTED" as const,
    occurredAt,
    tabId: request.tabId,
    siteId: request.siteId,
    justification: normalizedJustification,
  });
  return Object.freeze({
    ...request,
    stage: "GRANTED",
    override,
    activity,
  });
}

export function isTabOverrideValid(
  override: TabOverride | undefined,
  tabId: number,
  siteId: string,
): boolean {
  return override?.tabId === tabId && override.siteId === siteId;
}
