export interface AllowanceWarningEvaluation {
  localDate: string;
  usedSeconds: number;
  allowanceSeconds: number;
  warningTriggered: boolean;
}

export interface AllowanceWarningResult {
  readonly localDate: string;
  readonly warningTriggered: boolean;
  readonly warningEmitted: boolean;
}

const WARNING_RATIO = 0.8;

export function evaluateAllowanceWarning(
  evaluation: AllowanceWarningEvaluation,
): Readonly<AllowanceWarningResult> {
  const ratio = evaluation.usedSeconds / evaluation.allowanceSeconds;
  const warningEmitted =
    !evaluation.warningTriggered &&
    evaluation.allowanceSeconds > 0 &&
    ratio >= WARNING_RATIO &&
    ratio < 1;

  return Object.freeze({
    localDate: evaluation.localDate,
    warningTriggered: evaluation.warningTriggered || warningEmitted,
    warningEmitted,
  });
}
