export const settingsStyles = `
  :root {
    color-scheme: light;
    font-synthesis: none;
    -webkit-font-smoothing: antialiased;
  }
  * { box-sizing: border-box; }
  body { margin: 0; }
  button, input, select { font: inherit; }
  button { min-height: 40px; transition: transform 120ms cubic-bezier(.2,0,0,1), background-color 120ms cubic-bezier(.2,0,0,1); }
  button:active { transform: scale(.96); }
  button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  .app-shell { background: var(--background); color: var(--ink); font-family: var(--font); min-height: 100vh; }
  .topbar { align-items: center; background: var(--surface); box-shadow: 0 1px 0 color-mix(in oklch, var(--line), transparent 15%); display: flex; justify-content: space-between; padding: 16px clamp(20px, 4vw, 56px); position: sticky; top: 0; z-index: 10; }
  .brand { font-weight: 760; letter-spacing: -.02em; }
  .nav { display: flex; gap: 4px; }
  .nav a { border-radius: 7px; color: var(--muted); min-height: 40px; padding: 10px 12px; text-decoration: none; }
  .nav a[aria-current=page] { background: color-mix(in oklch, var(--accent), transparent 90%); color: var(--ink); }
  main { margin: 0 auto; max-width: 1040px; padding: 56px clamp(20px, 5vw, 64px) 96px; }
  .page-heading { margin-bottom: 48px; }
  h1 { font-size: clamp(2.2rem, 5vw, 4.5rem); letter-spacing: -.035em; line-height: 1.02; margin: 0; max-width: 14ch; text-wrap: balance; }
  .lede { color: var(--muted); line-height: 1.6; max-width: 65ch; text-wrap: pretty; }
  form { display: flex; flex-direction: column; gap: 44px; }
  fieldset { border: 0; margin: 0; padding: 0; }
  legend { font-size: 1.3rem; font-weight: 750; margin-bottom: 18px; }
  .field-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
  label { color: var(--muted); display: flex; flex-direction: column; font-size: .9rem; font-weight: 650; gap: 7px; }
  input, select { background: var(--surface); border: 1px solid var(--line); border-radius: 8px; color: var(--ink); min-height: 44px; padding: 10px 12px; }
  .day-row, .site-row { align-items: end; border-top: 1px solid var(--line); display: grid; gap: 12px; padding: 16px 0; }
  .day-row { align-items: start; grid-template-columns: minmax(120px, .6fr) 2fr; }
  .site-row { grid-template-columns: 1fr 1.4fr minmax(130px, .7fr) auto; }
  .day-toggle { align-items: center; color: var(--ink); flex-direction: row; min-height: 44px; }
  .day-toggle input { min-height: 20px; width: 20px; }
  .periods { display: flex; flex-direction: column; gap: 10px; }
  .period-row { align-items: end; display: grid; gap: 10px; grid-template-columns: 1fr 1fr auto; }
  .remove { background: transparent; border: 0; color: var(--muted); cursor: pointer; padding: 8px 10px; }
  .secondary { align-self: flex-start; background: transparent; border: 1px solid var(--line); border-radius: 8px; color: var(--ink); cursor: pointer; padding: 8px 12px; }
  .actions { align-items: center; display: flex; gap: 16px; }
  .primary { background: var(--accent); border: 0; border-radius: 8px; color: var(--accent-contrast); cursor: pointer; font-weight: 750; padding: 11px 18px; }
  .feedback { color: var(--muted); margin: 0; min-height: 24px; }
  .feedback[data-error=true] { color: var(--blocked); }
  @media (max-width: 720px) {
    .topbar { align-items: flex-start; flex-direction: column; gap: 12px; }
    .nav { max-width: 100%; overflow-x: auto; }
    main { padding-top: 36px; }
    .day-row, .site-row, .period-row { align-items: stretch; grid-template-columns: 1fr; }
  }
  @media (prefers-reduced-motion: reduce) { button { transition-duration: 0ms; } }
`;
