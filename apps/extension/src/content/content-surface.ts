import { translate, type SupportedLocale } from "@productivity-police/i18n";
import {
  confirmOverrideRequest,
  startOverrideRequest,
  submitOverrideRequest,
  type OverrideRequest,
} from "@productivity-police/domain";

export type ContentSurfaceAction = "ALLOW" | "TRACK" | "WARN" | "BLOCK";

export interface ContentSurfaceInput {
  action: ContentSurfaceAction;
  locale: SupportedLocale;
  siteId?: string | undefined;
  grantOverride?: ((justification: string) => Promise<boolean>) | undefined;
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
  if (
    model.kind === "blocker" &&
    input.siteId !== undefined &&
    input.grantOverride !== undefined
  ) {
    appendOverrideControls(document, surface, {
      ...input,
      siteId: input.siteId,
      grantOverride: input.grantOverride,
    });
  }
  shadow.append(style, surface);
  document.documentElement.append(host);

  if (model.blocking) {
    surface.focus({ preventScroll: true });
  }
}

function appendOverrideControls(
  document: Document,
  surface: HTMLElement,
  input: ContentSurfaceInput & {
    siteId: string;
    grantOverride: (justification: string) => Promise<boolean>;
  },
): void {
  const controls = document.createElement("div");
  controls.className = "override-controls";
  let request: Readonly<OverrideRequest> | undefined;

  const renderStage = (): void => {
    controls.replaceChildren();
    if (request === undefined) {
      const requestButton = createButton(
        document,
        translate(input.locale, "override.request"),
      );
      requestButton.addEventListener("click", () => {
        request = startOverrideRequest(0, input.siteId);
        renderStage();
      });
      controls.append(requestButton);
      return;
    }

    if (
      request.stage === "FIRST_CONFIRMATION" ||
      request.stage === "SECOND_CONFIRMATION"
    ) {
      const first = request.stage === "FIRST_CONFIRMATION";
      const prompt = document.createElement("div");
      prompt.className = "override-prompt";
      const heading = document.createElement("h2");
      heading.textContent = translate(
        input.locale,
        first ? "override.firstTitle" : "override.secondTitle",
      );
      const explanation = document.createElement("p");
      explanation.textContent = translate(
        input.locale,
        first ? "override.firstBody" : "override.secondBody",
      );
      const confirmButton = createButton(
        document,
        translate(
          input.locale,
          first ? "override.firstConfirm" : "override.secondConfirm",
        ),
      );
      confirmButton.addEventListener("click", () => {
        if (request !== undefined) {
          request = confirmOverrideRequest(request);
          renderStage();
        }
      });
      prompt.append(heading, explanation, confirmButton);
      controls.append(prompt);
      return;
    }

    if (request.stage === "JUSTIFICATION_REQUIRED") {
      const form = document.createElement("form");
      form.className = "override-form";
      const justificationLabel = document.createElement("label");
      justificationLabel.textContent = translate(
        input.locale,
        "override.justificationLabel",
      );
      const textarea = document.createElement("textarea");
      textarea.required = true;
      textarea.rows = 3;
      textarea.placeholder = translate(
        input.locale,
        "override.justificationPlaceholder",
      );
      const submitButton = createButton(
        document,
        translate(input.locale, "override.submit"),
      );
      submitButton.type = "submit";
      const error = document.createElement("p");
      error.className = "override-error";
      error.setAttribute("role", "alert");
      justificationLabel.append(textarea);
      form.append(justificationLabel, submitButton, error);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (request === undefined) {
          return;
        }
        const result = submitOverrideRequest(
          request,
          textarea.value,
          new Date(),
        );
        if (result.override === undefined) {
          textarea.reportValidity();
          return;
        }
        submitButton.disabled = true;
        void input
          .grantOverride(result.override.justification)
          .then((granted) => {
            if (granted) {
              document.getElementById(HOST_ID)?.remove();
              return;
            }
            submitButton.disabled = false;
            error.textContent = translate(input.locale, "override.error");
          });
      });
      controls.append(form);
    }
  };

  renderStage();
  surface.append(controls);
}

function createButton(document: Document, text: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  return button;
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

  .override-controls {
    margin-top: 32px;
    max-width: 520px;
    width: 100%;
  }

  .override-prompt,
  .override-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  h2 {
    font-size: 1.25rem;
    letter-spacing: -0.015em;
    line-height: 1.25;
    margin: 0;
  }

  label {
    display: flex;
    flex-direction: column;
    font-size: 0.9375rem;
    font-weight: 650;
    gap: 8px;
  }

  textarea {
    background: var(--pp-bg);
    border: 1px solid oklch(0.72 0.025 32.1);
    border-radius: 8px;
    box-sizing: border-box;
    color: var(--pp-ink);
    font: inherit;
    font-weight: 400;
    line-height: 1.45;
    min-height: 88px;
    padding: 12px;
    resize: vertical;
    width: 100%;
  }

  textarea:focus-visible,
  button:focus-visible {
    outline: 3px solid oklch(0.73 0.14 32.1);
    outline-offset: 3px;
  }

  button {
    align-self: flex-start;
    background: var(--pp-block);
    border: 0;
    border-radius: 8px;
    color: oklch(1 0 0);
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    min-height: 44px;
    padding: 10px 16px;
  }

  button:hover { background: oklch(0.52 0.19 29); }
  button:active { background: oklch(0.47 0.17 29); }
  button:disabled { cursor: wait; opacity: 0.62; }

  .override-error {
    color: oklch(0.48 0.18 29);
    min-height: 1.5em;
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
