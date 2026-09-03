import type { Universe } from "./universe";

export type DialogueEvent =
  "WARNING" | "BLOCKED" | "OVERRIDE_GRANTED" | "WORK_PERIOD_ENDED";
export type DialogueSeverity = "gentle" | "firm" | "critical";
export type DialogueTimeOfDay = "morning" | "afternoon" | "evening";

export interface DialogueContext {
  readonly universe: Universe;
  readonly event: DialogueEvent;
  readonly severity: DialogueSeverity;
  readonly occurrence: number;
  readonly timeOfDay: DialogueTimeOfDay;
  readonly recentVariantIds: readonly string[];
}

export interface DialogueSelection {
  readonly variantId: string;
  readonly messageKey: string;
}

interface DialogueVariant extends DialogueSelection {
  readonly universe: Universe;
  readonly event: DialogueEvent;
  readonly severity: DialogueSeverity;
  readonly minimumOccurrence: number;
  readonly timeOfDay?: DialogueTimeOfDay;
}

const variants = [
  variant("student", "WARNING", "firm", 1, "warning.morning", "morning"),
  variant("student", "WARNING", "firm", 1, "warning.standard"),
  variant("student", "BLOCKED", "critical", 1, "blocked.standard.1"),
  variant("student", "BLOCKED", "critical", 1, "blocked.standard.2"),
  variant("student", "BLOCKED", "critical", 5, "blocked.frequent"),
  variant("student", "OVERRIDE_GRANTED", "firm", 1, "override.granted"),
  variant("student", "WORK_PERIOD_ENDED", "gentle", 1, "work.ended"),
  variant("pro", "WARNING", "firm", 1, "warning.morning", "morning"),
  variant("pro", "WARNING", "firm", 1, "warning.standard"),
  variant("pro", "BLOCKED", "critical", 1, "blocked.standard.1"),
  variant("pro", "BLOCKED", "critical", 1, "blocked.standard.2"),
  variant("pro", "BLOCKED", "critical", 5, "blocked.frequent"),
  variant("pro", "OVERRIDE_GRANTED", "firm", 1, "override.granted"),
  variant("pro", "WORK_PERIOD_ENDED", "gentle", 1, "work.ended"),
] as const satisfies readonly DialogueVariant[];

export function selectDialogue(
  context: DialogueContext,
): Readonly<DialogueSelection> {
  const occurrence = Math.max(1, Math.floor(context.occurrence));
  const compatible = variants.filter(
    (candidate) =>
      candidate.universe === context.universe &&
      candidate.event === context.event &&
      candidate.severity === context.severity &&
      candidate.minimumOccurrence <= occurrence &&
      (candidate.timeOfDay === undefined ||
        candidate.timeOfDay === context.timeOfDay),
  );
  if (compatible.length === 0) {
    throw new RangeError("No compatible dialogue variant");
  }

  const highestOccurrence = Math.max(
    ...compatible.map((candidate) => candidate.minimumOccurrence),
  );
  const occurrenceTier = compatible.filter(
    (candidate) => candidate.minimumOccurrence === highestOccurrence,
  );
  const temporalTier = occurrenceTier.some(
    (candidate) => candidate.timeOfDay === context.timeOfDay,
  )
    ? occurrenceTier.filter(
        (candidate) => candidate.timeOfDay === context.timeOfDay,
      )
    : occurrenceTier;
  const selected =
    temporalTier.find(
      (candidate) => !context.recentVariantIds.includes(candidate.variantId),
    ) ?? temporalTier[0];
  if (selected === undefined) {
    throw new RangeError("No compatible dialogue variant");
  }

  return Object.freeze({
    variantId: selected.variantId,
    messageKey: selected.messageKey,
  });
}

function variant(
  universe: Universe,
  event: DialogueEvent,
  severity: DialogueSeverity,
  minimumOccurrence: number,
  suffix: string,
  timeOfDay?: DialogueTimeOfDay,
): DialogueVariant {
  return {
    universe,
    event,
    severity,
    minimumOccurrence,
    ...(timeOfDay === undefined ? {} : { timeOfDay }),
    variantId: `${universe}.${suffix}`,
    messageKey: `dialogue.${universe}.${suffix}`,
  };
}
