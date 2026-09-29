/**
 * Styles are injected at runtime so the component drops into any React app
 * without a CSS import, a build-step change, or a stylesheet to remember.
 * Everything is scoped under `.g3d` and driven by CSS custom properties, so
 * theming works with inline style overrides.
 */

const CSS = `
.g3d {
  --g3d-bg: #0b0f14;
  --g3d-panel: rgba(14, 20, 27, 0.88);
  --g3d-border: rgba(120, 160, 200, 0.18);
  --g3d-text: #e8eef5;
  --g3d-muted: #8ea0b3;
  --g3d-accent: #f2c14e;
  --g3d-ok: #5fd08a;
  --g3d-warn: #f0b429;
  --g3d-danger: #e06c5c;
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 320px;
  overflow: hidden;
  border-radius: 10px;
  background: var(--g3d-bg);
  color: var(--g3d-text);
  font: 12px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  isolation: isolate;
}
.g3d * { box-sizing: border-box; }
.g3d-canvas { position: relative; flex: 1 1 auto; min-height: 0; }
.g3d-canvas canvas { display: block; outline: none; }
.g3d-canvas:focus-visible { outline: 2px solid var(--g3d-accent); outline-offset: -2px; }

.g3d-toolbar {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 8px 10px;
  background: var(--g3d-panel);
  border-bottom: 1px solid var(--g3d-border);
  backdrop-filter: blur(6px);
}
.g3d-toolbar--bottom { border-bottom: 0; border-top: 1px solid var(--g3d-border); }
.g3d-spacer { flex: 1 1 auto; }
.g3d-group { display: flex; align-items: center; gap: 4px; }
.g3d-label {
  font-size: 10px; font-weight: 700; letter-spacing: .07em;
  text-transform: uppercase; color: var(--g3d-muted);
}

.g3d-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 9px; min-height: 26px;
  border: 1px solid var(--g3d-border); border-radius: 7px;
  background: rgba(255,255,255,.04); color: var(--g3d-text);
  font: inherit; font-size: 11px; font-weight: 600; cursor: pointer;
  transition: background .12s ease, border-color .12s ease, color .12s ease;
  white-space: nowrap;
}
.g3d-btn:hover { background: rgba(255,255,255,.10); }
.g3d-btn:focus-visible { outline: 2px solid var(--g3d-accent); outline-offset: 1px; }
.g3d-btn[aria-pressed="true"], .g3d-btn--on {
  background: color-mix(in srgb, var(--g3d-accent) 22%, transparent);
  border-color: var(--g3d-accent); color: var(--g3d-text);
}
.g3d-btn--icon { padding: 4px 7px; }

.g3d-input {
  padding: 5px 9px; min-width: 150px; min-height: 26px;
  border: 1px solid var(--g3d-border); border-radius: 7px;
  background: rgba(0,0,0,.28); color: var(--g3d-text); font: inherit; font-size: 11px;
}
.g3d-input:focus-visible { outline: 2px solid var(--g3d-accent); outline-offset: 0; }
.g3d-input::placeholder { color: var(--g3d-muted); }

.g3d-select {
  padding: 4px 6px; min-height: 26px;
  border: 1px solid var(--g3d-border); border-radius: 7px;
  background: rgba(0,0,0,.28); color: var(--g3d-text); font: inherit; font-size: 11px;
}

.g3d-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 8px; border: 1px solid var(--g3d-border); border-radius: 999px;
  background: rgba(255,255,255,.04); color: var(--g3d-muted);
  font: inherit; font-size: 10.5px; font-weight: 650; cursor: pointer;
  transition: background .12s ease, color .12s ease, border-color .12s ease;
}
.g3d-chip:hover { background: rgba(255,255,255,.1); color: var(--g3d-text); }
.g3d-chip[aria-pressed="false"] { opacity: .42; }
.g3d-chip[aria-pressed="true"] { color: var(--g3d-text); background: rgba(255,255,255,.08); }
.g3d-chip:focus-visible { outline: 2px solid var(--g3d-accent); outline-offset: 1px; }
.g3d-dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }
.g3d-chip-count { color: var(--g3d-muted); font-variant-numeric: tabular-nums; }
.g3d-chip-scroll {
  display: flex; gap: 4px; flex-wrap: wrap; overflow-x: auto;
  padding: 6px 10px; background: var(--g3d-panel);
  border-bottom: 1px solid var(--g3d-border);
  scrollbar-width: thin;
}
.g3d-chip-scroll::-webkit-scrollbar { height: 6px; }
.g3d-chip-scroll::-webkit-scrollbar-thumb { background: var(--g3d-border); border-radius: 3px; }

.g3d-status { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 650; color: var(--g3d-muted); }
.g3d-pulse { width: 7px; height: 7px; border-radius: 50%; background: var(--g3d-muted); }
.g3d-pulse--live { background: var(--g3d-ok); animation: g3d-pulse 1.6s ease-in-out infinite; }
.g3d-pulse--polling { background: var(--g3d-warn); }
.g3d-pulse--connecting { background: var(--g3d-accent); animation: g3d-pulse .9s ease-in-out infinite; }
.g3d-pulse--offline, .g3d-pulse--error { background: var(--g3d-danger); }
.g3d-pulse--static { background: var(--g3d-muted); }
@keyframes g3d-pulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
@media (prefers-reduced-motion: reduce) { .g3d-pulse { animation: none !important; } }

.g3d-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 2px 7px; border-radius: 999px; border: 1px solid var(--g3d-border);
  font-size: 10px; font-weight: 700; color: var(--g3d-muted);
  font-variant-numeric: tabular-nums;
}
.g3d-badge--accent { color: var(--g3d-accent); border-color: color-mix(in srgb, var(--g3d-accent) 45%, transparent); }
.g3d-badge--ok { color: var(--g3d-ok); border-color: color-mix(in srgb, var(--g3d-ok) 45%, transparent); }
.g3d-badge--danger { color: var(--g3d-danger); border-color: color-mix(in srgb, var(--g3d-danger) 45%, transparent); }

.g3d-tooltip {
  position: absolute; z-index: 6; pointer-events: none;
  max-width: 280px; padding: 7px 9px;
  border: 1px solid var(--g3d-border); border-radius: 8px;
  background: var(--g3d-panel); color: var(--g3d-text);
  font-size: 11px; line-height: 1.4;
  box-shadow: 0 8px 26px rgba(0,0,0,.45);
  transform: translate(-50%, calc(-100% - 12px));
}
.g3d-tooltip-title { font-weight: 700; margin-bottom: 2px; word-break: break-word; }
.g3d-tooltip-meta { color: var(--g3d-muted); font-size: 10px; }
.g3d-tooltip-row { color: var(--g3d-muted); font-size: 10px; display: flex; gap: 6px; }

.g3d-panel {
  position: absolute; z-index: 5; top: 10px; right: 10px; width: 268px;
  max-height: calc(100% - 20px); display: flex; flex-direction: column;
  border: 1px solid var(--g3d-border); border-radius: 10px;
  background: var(--g3d-panel); backdrop-filter: blur(8px);
  box-shadow: 0 10px 30px rgba(0,0,0,.4);
  overflow: hidden;
}
.g3d-panel-head {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 9px; border-bottom: 1px solid var(--g3d-border);
}
.g3d-panel-title { font-size: 11px; font-weight: 700; flex: 1 1 auto; word-break: break-word; }
.g3d-panel-body { padding: 9px; overflow: auto; font-size: 11px; }
.g3d-kv { display: grid; grid-template-columns: minmax(72px, 38%) 1fr; gap: 3px 8px; }
.g3d-kv dt { color: var(--g3d-muted); font-size: 10px; overflow-wrap: anywhere; }
.g3d-kv dd { margin: 0; overflow-wrap: anywhere; }
.g3d-section-title {
  margin: 10px 0 4px; font-size: 10px; font-weight: 700;
  letter-spacing: .06em; text-transform: uppercase; color: var(--g3d-muted);
}
.g3d-rel { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; }
.g3d-rel-name { color: var(--g3d-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.g3d-empty { padding: 18px 12px; text-align: center; color: var(--g3d-muted); }
.g3d-hint { padding: 8px 10px; color: var(--g3d-muted); font-size: 10.5px; }
.g3d-hint kbd {
  padding: 1px 4px; border: 1px solid var(--g3d-border); border-radius: 4px;
  background: rgba(255,255,255,.06); font: inherit; font-size: 10px;
}

.g3d-activity { position: absolute; z-index: 5; left: 10px; bottom: 10px; display: flex; flex-direction: column; gap: 4px; pointer-events: none; }
.g3d-toast {
  padding: 4px 9px; border-radius: 999px; border: 1px solid var(--g3d-border);
  background: var(--g3d-panel); color: var(--g3d-text);
  font-size: 10.5px; font-weight: 650; box-shadow: 0 6px 18px rgba(0,0,0,.35);
  animation: g3d-toast-in .22s ease-out;
}
.g3d-toast--add { color: var(--g3d-ok); border-color: color-mix(in srgb, var(--g3d-ok) 40%, transparent); }
.g3d-toast--upd { color: var(--g3d-warn); border-color: color-mix(in srgb, var(--g3d-warn) 40%, transparent); }
.g3d-toast--err { color: var(--g3d-danger); border-color: color-mix(in srgb, var(--g3d-danger) 40%, transparent); }
@keyframes g3d-toast-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

.g3d-overlay {
  position: absolute; inset: 0; z-index: 7;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 10px; padding: 20px; text-align: center;
  background: color-mix(in srgb, var(--g3d-bg) 82%, transparent);
}
.g3d-overlay-title { font-size: 13px; font-weight: 700; }
.g3d-overlay-text { color: var(--g3d-muted); max-width: 380px; }
.g3d-spinner {
  width: 26px; height: 26px; border-radius: 50%;
  border: 2px solid var(--g3d-border); border-top-color: var(--g3d-accent);
  animation: g3d-spin .8s linear infinite;
}
@keyframes g3d-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .g3d-spinner { animation: none; } }

.g3d-legend {
  position: absolute; z-index: 4; left: 10px; top: 10px;
  display: flex; flex-direction: column; gap: 3px;
  max-height: 46%; overflow: auto;
  padding: 7px 9px; border: 1px solid var(--g3d-border); border-radius: 9px;
  background: var(--g3d-panel); backdrop-filter: blur(8px);
  box-shadow: 0 8px 24px rgba(0,0,0,.35);
}
.g3d-legend-item { display: flex; align-items: center; gap: 6px; font-size: 10.5px; }
.g3d-legend-name { color: var(--g3d-muted); }
.g3d-legend-name--on { color: var(--g3d-text); }

@media (max-width: 640px) {
  .g3d-panel { position: static; width: auto; max-height: 42%; border-radius: 0; border-left: 0; border-right: 0; }
  .g3d-legend { display: none; }
}
`;

let injected = false;

export function injectGraph3dStyles(doc = typeof document !== 'undefined' ? document : null) {
  if (injected || !doc) return;
  const style = doc.createElement('style');
  style.setAttribute('data-graph3d', '');
  style.textContent = CSS;
  doc.head.appendChild(style);
  injected = true;
}

export { CSS as GRAPH3D_CSS };
