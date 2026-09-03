import type { Universe } from "@productivity-police/domain";

export interface UniverseThemeTokens {
  readonly background: string;
  readonly surface: string;
  readonly ink: string;
  readonly muted: string;
  readonly accent: string;
  readonly accentContrast: string;
  readonly line: string;
  readonly warning: string;
  readonly blocked: string;
}

export interface UniverseTheme {
  readonly id: Universe;
  readonly fontFamily: string;
  readonly tokens: Readonly<UniverseThemeTokens>;
}

const THEMES: Readonly<Record<Universe, Readonly<UniverseTheme>>> =
  Object.freeze({
    student: Object.freeze({
      id: "student",
      fontFamily: 'Georgia, "Times New Roman", serif',
      tokens: Object.freeze({
        background: "oklch(0.98 0 0)",
        surface: "oklch(1 0 0)",
        ink: "oklch(0.18 0 0)",
        muted: "oklch(0.43 0 0)",
        accent: "oklch(0.24 0 0)",
        accentContrast: "oklch(1 0 0)",
        line: "oklch(0.82 0 0)",
        warning: "oklch(0.73 0.14 82)",
        blocked: "oklch(0.55 0.2 29)",
      }),
    }),
    pro: Object.freeze({
      id: "pro",
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      tokens: Object.freeze({
        background: "oklch(0.97 0.01 252)",
        surface: "oklch(1 0 0)",
        ink: "oklch(0.22 0.04 258)",
        muted: "oklch(0.44 0.04 258)",
        accent: "oklch(0.48 0.18 258)",
        accentContrast: "oklch(1 0 0)",
        line: "oklch(0.84 0.025 258)",
        warning: "oklch(0.7 0.15 75)",
        blocked: "oklch(0.53 0.19 27)",
      }),
    }),
  });

export function getUniverseTheme(universe: Universe): Readonly<UniverseTheme> {
  return THEMES[universe];
}
