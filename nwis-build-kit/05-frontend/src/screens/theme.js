/**
 * Colour + sizing rules for the 3D viewer.
 *
 * Node colour is driven by label so the graph stays readable without a legend,
 * and every value is overridable through the `palette` prop.
 */

export const DARK_THEME = {
  background: '#0b0f14',
  fog: '#0b0f14',
  grid: '#1b2a38',
  link: '#41607c',
  linkHighlight: '#f2c14e',
  linkDim: '#16222c',
  text: '#e8eef5',
  textMuted: '#8ea0b3',
  panel: 'rgba(14, 20, 27, 0.88)',
  panelBorder: 'rgba(120, 160, 200, 0.18)',
  accent: '#f2c14e',
  selection: '#f2c14e',
  hover: '#7fd1ff',
  danger: '#e06c5c',
  ok: '#5fd08a',
  warn: '#f0b429',
  nodeDefault: '#8fa3b8',
  nodeSelected: '#f2c14e',
  nodeDim: '#20272e',
  nodeNew: '#5fd08a',
  labelOpacity: 0.92,
  dimOpacity: 0.12,
  linkOpacity: 0.55,
  showLabelsByDefault: true,
};

export const LIGHT_THEME = {
  background: '#f5f7fa',
  fog: '#f5f7fa',
  grid: '#d7e0ea',
  link: '#9db0c4',
  linkHighlight: '#c8891a',
  linkDim: '#e3e9ef',
  text: '#16202b',
  textMuted: '#5b6b7c',
  panel: 'rgba(255, 255, 255, 0.92)',
  panelBorder: 'rgba(20, 40, 60, 0.12)',
  accent: '#c8891a',
  selection: '#c8891a',
  hover: '#1a7fb5',
  danger: '#c0392b',
  ok: '#1e8449',
  warn: '#b9770e',
  nodeDefault: '#5b6b7c',
  nodeSelected: '#c8891a',
  nodeDim: '#e3e9ef',
  nodeNew: '#1e8449',
  labelOpacity: 0.95,
  dimOpacity: 0.1,
  linkOpacity: 0.38,
  showLabelsByDefault: true,
};

/** Label -> colour. Anything unlisted falls back to a stable hash colour. */
export const LABEL_COLORS = {
  Well: '#4f9dff',
  Wellbore: '#6fb0ff',
  Field: '#8b7cff',
  Block: '#a08cff',
  Pad: '#b39dff',
  Rig: '#7f8ff5',
  Formation: '#f2b544',
  Member: '#f7cd72',
  Lithology: '#d99a3d',
  Reservoir: '#e07a3c',
  Fault: '#e0554a',
  FractureZone: '#c94a52',
  PressureZone: '#ff7ab8',
  StratigraphicUnit: '#e9c46a',
  OperationalEvent: '#38c9a1',
  MudLoss: '#2fb894',
  Kick: '#ff5f6d',
  StuckPipe: '#ff7a45',
  PackOff: '#ffa552',
  TorqueSpike: '#ffd166',
  PressureSpike: '#ff9f1c',
  WellboreInstability: '#c77dff',
  Fishing: '#8bd3dd',
  NPT: '#5bc0be',
  Cause: '#ef476f',
  Mitigation: '#06d6a0',
  LessonLearned: '#a0e57c',
  Document: '#8ecae6',
  Alert: '#ff477e',
  Unknown: '#8fa3b8',
};

const FALLBACK_PALETTE = [
  '#4f9dff', '#f2b544', '#38c9a1', '#ef476f', '#a0e57c',
  '#8ecae6', '#c77dff', '#ff9f1c', '#06d6a0', '#e07a3c',
];

/** Deterministic colour for labels the palette does not know about. */
export function hashColor(label) {
  const text = String(label || 'Unknown');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

export function colorForLabel(label, overrides) {
  if (overrides && overrides[label]) return overrides[label];
  return LABEL_COLORS[label] || hashColor(label);
}

/** Base radius from connectivity: hubs read bigger than leaves. */
export function sizeForNode(node, { min: minSize = 1.7, max: maxSize = 6.4, scale = 1 } = {}) {
  const degree = Math.log2(1 + (node?.degree || 0));
  return Math.min(maxSize, Math.max(minSize, minSize + degree * 0.8)) * scale;
}

export function getTheme(name) {
  return name === 'light' ? LIGHT_THEME : DARK_THEME;
}
