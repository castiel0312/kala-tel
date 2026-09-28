/**
 * Formatting helpers.
 *
 * Number rendering is deliberately split: `fmtValue` keeps the precision the API sent
 * (a depth of 3124 must not become "3,124.0"), while `fmtFixed` is for cases where the
 * design fixes the number of decimals, such as a similarity percentage.
 */

const grouped = new Intl.NumberFormat('en-IN')

/** 3124 → "3,124" */
export function fmtInt(n: number): string {
  return grouped.format(n)
}

/** Metres as the designs write them: "3,124 m", or a range "3,180–3,240 m". */
export function fmtM(n: number): string {
  return `${grouped.format(n)} m`
}

export function fmtMRange(from: number, to: number): string {
  return `${grouped.format(from)}–${grouped.format(to)} m`
}

export function fmtKM(n: number): string {
  return `${n.toFixed(1)} km`
}

/** Drops trailing zeros: 1.450 → "1.45", 13.700 → "13.7", 97 → "97". */
export function fmtValue(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (Number.isInteger(n)) return grouped.format(n)
  return grouped.format(Number(n.toFixed(3)))
}

export function fmtFixed(n: number, dp: number): string {
  return n.toFixed(dp)
}

export function fmtPct(n: number): string {
  return `${Math.round(n)}%`
}

/** Signed value, for diffs and trends: 3.1 → "+3.1", −3 → "−3". */
export function fmtSigned(n: number, dp = 1): string {
  const s = Math.abs(n).toFixed(dp)
  return n < 0 ? `−${s}` : `+${s}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2019-03-14" → "14 Mar 2019" */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${MONTHS[m - 1]} ${y}`
}

/** "2026-09-26T20:27:50+05:30" → "20:27:50" */
export function fmtClock(iso: string): string {
  const t = iso.match(/T(\d{2}:\d{2}:\d{2})/)
  return t?.[1] ?? iso
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}
