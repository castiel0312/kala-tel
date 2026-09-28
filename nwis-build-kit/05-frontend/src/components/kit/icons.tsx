import type { SVGProps } from 'react'

/* ============================================================================
   Icon set. 16px stroke geometry on a 24px grid, 1.6 stroke, square caps:
   instrument-panel line weight, not friendly-app rounding. Icons are only
   used where they carry meaning — a wellhead, a bit, a risk triangle.
   ========================================================================== */

const P = {
  /* navigation */
  command: 'M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 13h7v8H3z',
  nearby: 'M9 20l-5.5-8.2A6 6 0 1114 11.8L9 20zM9 9.6a1.6 1.6 0 100 3.2 1.6 1.6 0 000-3.2zM17 4v6M20 7h-6',
  well: 'M12 2v20M8 22h8M6 6h12M8 6l-2 4M16 6l2 4M9 12h6M10 16h4',
  compare: 'M4 6h7M4 12h7M4 18h7M14 4v16M17 8l3 4-3 4M20 4v16',
  risk: 'M12 3l9.5 17H2.5L12 3zM12 9v5M12 17.2v.6',
  alerts: 'M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6zM10 19a2 2 0 004 0',
  knowledge: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zM8 8h7M8 12h7M8 16h4',
  graph: 'M12 4.5a2 2 0 110 4 2 2 0 010-4zM5 15a2 2 0 110 4 2 2 0 010-4zM19 15a2 2 0 110 4 2 2 0 010-4zM11 8L6.5 14M13 8l4.5 6M7 17h10',
  documents: 'M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6z',
  docintel: 'M6 3h9l4 4v14H6V3zM15 3v4h4M9 12h7M9 16h5M9 8h3',
  analytics: 'M4 20V4M4 20h16M8 17V9M12 17V6M16 17v-6M20 17v-9',
  assistant: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM18.5 16.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z',
  mobile: 'M8 3h8v18H8zM11 18h2',

  /* interface */
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM16 16l4.5 4.5',
  close: 'M6 6l12 12M18 6L6 18',
  chevronRight: 'M9 5l7 7-7 7',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronDown: 'M5 9l7 7 7-7',
  arrowRight: 'M4 12h15M13 6l6 6-6 6',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5',
  check: 'M4 12.5l5 5L20 6.5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5z',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  reset: 'M4 12a8 8 0 108-8 8 8 0 00-6.5 3.3M4 4v5h5',
  target: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM12 2v3M12 19v3M2 12h3M19 12h3',
  cube3d: 'M12 2.5l8.5 4.7v9.6L12 21.5 3.5 16.8V7.2L12 2.5zM3.5 7.2L12 12l8.5-4.8M12 12v9.5',
  eye: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6zM12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z',
  eyeOff: 'M4 4l16 16M9.5 9.6A2.5 2.5 0 0012 14.5M6.3 6.6C3.7 8.2 2 12 2 12s4 6 10 6c1.8 0 3.4-.6 4.7-1.3M18.6 15.4C20.5 13.9 22 12 22 12s-4-6-10-6c-.8 0-1.5.1-2.2.3',
  pin: 'M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11zM12 7.6a2.4 2.4 0 100 4.8 2.4 2.4 0 000-4.8z',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5.4l3.4 2',
  file: 'M6 3h8l4 4v14H6V3zM14 3v4h4',
  download: 'M12 3v12M7 11l5 5 5-5M4 21h16',
  upload: 'M12 21V9M7 13l5-5 5 5M4 3h16',
  play: 'M7 4l12 8-12 8V4z',
  pause: 'M8 5v14M16 5v14',
  menu: 'M4 7h16M4 12h16M4 17h16',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M4 6h16M4 12h16M4 18h16',
  depth: 'M3 4h18M3 8h18M3 12h18M3 16h18M3 20h18',
  drill: 'M12 2v6M9 8h6M10.5 8v6l-2 3.5h7L13.5 14V8M9 17.5h6L16 21H8l1.5-3.5z',
  barrel: 'M8 3h8l1 3v12l-1 3H8l-1-3V6l1-3zM7 8h10M7 16h10M9 5.5h6M9 18.5h6',
  drop: 'M12 3s6 6.6 6 10.5A6 6 0 016 13.5C6 9.6 12 3 12 3z',
  arrowUp: 'M12 20V5M6 11l6-6 6 6',
  arrowDown: 'M12 4v15M6 13l6 6 6-6',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  link: 'M10 13a4 4 0 006 .5l2-2a4 4 0 10-5.6-5.6l-1 1M14 11a4 4 0 00-6-.5l-2 2A4 4 0 1011.6 18l1-1',
  keyboard: 'M3 7h18v10H3zM6.5 10.5h.01M10 10.5h.01M13.5 10.5h.01M17 10.5h.01M7 14h10',
  compass: 'M12 3a9 9 0 100 18 9 9 0 000-18zM15.5 8.5l-2 5-5 2 2-5 5-2z',
  scale: 'M12 3v18M5 8h14M7 8l-3 6h6L7 8zM17 8l-3 6h6l-3-6zM8 21h8',
} satisfies Record<string, string>

export type IconName = keyof typeof P

export function Icon({
  name,
  size = 16,
  strokeWidth = 1.6,
  fill = 'none',
  ...rest
}: {
  name: IconName | string
  size?: number
  /** Line weight, in the same units as the 24px grid. Instrument-panel weight by default. */
  strokeWidth?: number
  fill?: string
} & Omit<SVGProps<SVGSVGElement>, 'strokeWidth'>) {
  const d = P[name as IconName] ?? P.more
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
      focusable="false"
      style={{ flex: '0 0 auto' }}
      {...rest}
    >
      {d.split('M').filter(Boolean).map((seg, i) => (
        <path key={i} d={`M${seg}`} />
      ))}
    </svg>
  )
}
