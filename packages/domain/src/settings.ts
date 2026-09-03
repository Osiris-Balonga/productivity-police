import { validateWorkSchedule, type WorkSchedule } from "./schedule";
import type { Universe } from "./universe";

export interface ProductSettings {
  readonly enabled: boolean;
  readonly locale: "fr" | "en";
  readonly universe: Universe;
  readonly dailyAllowanceMinutes: number;
  readonly schedule: WorkSchedule;
}

export type ProductSettingsPatch = Partial<ProductSettings>;

export function applySettingsPatch(
  current: ProductSettings,
  patch: ProductSettingsPatch,
): Readonly<ProductSettings> {
  const next: ProductSettings = structuredClone({ ...current, ...patch });
  if (
    !Number.isFinite(next.dailyAllowanceMinutes) ||
    next.dailyAllowanceMinutes < 0
  ) {
    throw new RangeError("Daily allowance must be a non-negative number");
  }
  if (validateWorkSchedule(next.schedule).length > 0) {
    throw new RangeError("Work schedule is invalid");
  }
  return Object.freeze(next);
}

export function isProductSettings(value: unknown): value is ProductSettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.enabled === "boolean" &&
    (candidate.locale === "fr" || candidate.locale === "en") &&
    (candidate.universe === "student" || candidate.universe === "pro") &&
    typeof candidate.dailyAllowanceMinutes === "number" &&
    typeof candidate.schedule === "object" &&
    candidate.schedule !== null &&
    Array.isArray((candidate.schedule as Record<string, unknown>).days)
  );
}
