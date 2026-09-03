import { translate, type SupportedLocale } from "@productivity-police/i18n";

export type ContentSurfaceAction = "ALLOW" | "TRACK" | "WARN" | "BLOCK";

export interface ContentSurfaceInput {
  action: ContentSurfaceAction;
  locale: SupportedLocale;
}

export interface ContentSurfaceModel {
  readonly kind: "warning" | "blocker";
  readonly role: "status" | "alertdialog";
  readonly blocking: boolean;
  readonly title: string;
  readonly body: string;
}

const HOST_ID = "productivity-police-surface-host";

export function createContentSurfaceModel(
  input: ContentSurfaceInput,
): Readonly<ContentSurfaceModel> | null {
  if (input.action === "WARN") {
    return Object.freeze({
      kind: "warning",
      role: "status",
      blocking: false,
      title: translate(input.locale, "access.warningTitle"),
      body: translate(input.locale, "access.warningBody"),
    });
  }
  if (input.action === "BLOCK") {
    return Object.freeze({
      kind: "blocker",
      role: "alertdialog",
      blocking: true,
      title: translate(input.locale, "access.blockedTitle"),
      body: translate(input.locale, "access.blockedBody"),
    });
  }
  return null;
}

export function renderContentSurface(
  document: Document,
  input: ContentSurfaceInput,
): void {
  document.getElementById(HOST_ID)?.remove();
  document.documentElement.dataset.productivityPoliceDecision = input.action;

  const model = createContentSurfaceModel(input);
  if (model === null) {
    return;
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.dataset.productivityPoliceSurface = model.kind;
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = styles;

  const surface = document.createElement("section");
  surface.className = `surface ${model.kind}`;
  surface.setAttribute("role", model.role);
  if (model.blocking) {
    surface.setAttribute("aria-modal", "true");
    surface.tabIndex = -1;
  } else {
    surface.setAttribute("aria-live", "polite");
  }

  const label = document.createElement("span");
  label.className = "label";
  label.textContent = "Productivity Police";
  const title = document.createElement("h1");
  title.textContent = model.title;
  const body = document.createElement("p");
  body.textContent = model.body;
  surface.append(label, title, body);
  shadow.append(style, surface);
  document.documentElement.append(host);

  if (model.blocking) {
    surface.focus({ preventScroll: true });
  }
}

const styles = `
  :host {
    --pp-bg: oklch(1 0 0);
    --pp-ink: oklch(0.18 0.015 32.1);
    --pp-muted: oklch(0.43 0.025 32.1);
    --pp-block: oklch(0.57 0.19 29);
    --pp-warning: oklch(0.82 0.15 82);
    all: initial;
    color: var(--pp-ink);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    position: fixed;
    z-index: 2147483646;
  }

  :host:has(.blocker) {
    inset: 0;
  }

  :host:has(.warning) {
    inset: 24px 24px auto auto;
    max-width: min(400px, calc(100vw - 32px));
    pointer-events: none;
  }

  .surface {
    box-sizing: border-box;
    color: var(--pp-ink);
  }

  .blocker {
    align-items: flex-start;
    background: var(--pp-bg);
    border-top: 6px solid var(--pp-block);
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: center;
    min-height: 100vh;
    padding: clamp(32px, 8vw, 112px);
    width: 100%;
  }

  .warning {
    background: var(--pp-bg);
    border: 2px solid var(--pp-warning);
    border-radius: 12px;
    padding: 18px 20px;
    animation: pp-enter 180ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .label {
    color: var(--pp-block);
    display: block;
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    margin-bottom: 12px;
  }

  .warning .label {
    color: oklch(0.42 0.11 72);
  }

  h1 {
    font-size: 1.75rem;
    letter-spacing: -0.02em;
    line-height: 1.15;
    margin: 0;
    max-width: 24ch;
    text-wrap: balance;
  }

  .blocker h1 {
    font-size: clamp(2rem, 5vw, 4.5rem);
  }

  p {
    color: var(--pp-muted);
    font-size: 1rem;
    line-height: 1.55;
    margin: 14px 0 0;
    max-width: 58ch;
    text-wrap: pretty;
  }

  @keyframes pp-enter {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 520px) {
    :host:has(.warning) { inset: 16px 16px auto; }
    .blocker { padding: 28px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .warning { animation: none; }
  }
`;
