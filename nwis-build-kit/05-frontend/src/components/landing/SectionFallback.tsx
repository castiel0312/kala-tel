import type { CSSProperties } from 'react'
import type { SectionBore, SectionLayer } from '../../lib/section'
import type { SectionView } from './sectionView'
import s from './landing.module.css'

/**
 * The section without WebGL, and the section before WebGL.
 *
 * The hero cannot open on a black box, and the Three.js chunk is a network request the reader waits
 * for only once they have pressed the machine. This draws the same bands, the same contacts and the
 * same bores flat, through the same `view` — including the compressed skin, which is placed by
 * `yForLayer` here exactly as it is in the scene — so it is not a placeholder to be seen. It is the
 * same section with the relief left off.
 *
 * It is on screen in three situations, and in all three it is the finished composition rather than
 * a state:
 *
 * 1. on the landing page, where it *is* the picture — the reader arrives to a lit cross-section, and
 *    this is the cross-section;
 * 2. under the lit rock, through the moment the scene is assembled and for as long as it is open, so
 *    the two renderers hand over without the cut ever emptying;
 * 3. for good, if WebGL is unavailable or the reader asked for less motion.
 *
 * Each band carries its own `--at`, how far down the cut it begins, and reads the same `--nw-rock`
 * the lit section does. The bands are not switched on here — the ground is on the page before
 * anything is pressed — so the per-band `--at` is spent on the lit renderer's fill rather than on
 * this one's, and this picture is held back by a saturating filter that the landing page's `--nw-lit`
 * ramp lifts. Two renderings of one section that opened differently would be the one bug in this
 * arrangement that a reader would actually notice.
 */
export function SectionFallback({ view, layers, bores }: { view: SectionView; layers: SectionLayer[]; bores: SectionBore[] }) {
  const { width: w, height: h, rockLeft, rockRight } = view
  const rockW = rockRight - rockLeft
  const target = layers.find((l) => l.target)

  /** How deep into the cut a band begins, 0 at the top of the section and 1 at its foot. */
  const at = (l: SectionLayer) => Math.max(0, Math.min(1, (view.yForLayer(l) - view.groundY) / Math.max(1, h - view.groundY)))

  return (
    <svg className={s.fallback} viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden focusable="false">
      {/* the paper either side, so the flat picture is already the finished composition */}
      <g className={s.gutters}>
        <rect x={0} y={view.groundY} width={view.rulerW} height={h - view.groundY} />
        <rect x={rockRight} y={view.groundY} width={w - rockRight} height={h - view.groundY} />
      </g>

      {/* the rock: the compressed near-surface skin, then the true axis beneath the break */}
      {layers.map((l) => (
        <rect
          key={l.key}
          className={s.fallbackBand}
          style={{ '--at': at(l) } as CSSProperties}
          x={rockLeft}
          y={view.yForLayer(l)}
          width={rockW}
          height={Math.max(0, view.layerH(l))}
          fill={l.fill}
        />
      ))}

      {/* the target keeps its own mark, so the reservoir is findable without the scene's glow */}
      {target && (
        <path
          className={[s.fallbackTarget, s.stTarget].filter(Boolean).join(' ')}
          d={`M${rockLeft + 14} ${view.yForMd(target.fromMd)} L${rockLeft + 5} ${view.yForMd(target.fromMd)} L${rockLeft + 5} ${Math.min(
            h,
            view.yForMd(target.toMd),
          )} L${rockLeft + 14} ${Math.min(h, view.yForMd(target.toMd))}`}
        />
      )}

      <g className={s.fallbackContacts}>
        {layers.slice(1).map((l) => (
          <line key={l.key} x1={rockLeft} x2={rockRight} y1={view.yForLayer(l)} y2={view.yForLayer(l)} />
        ))}
      </g>
      <path className={[s.breakLine, s.stGround].filter(Boolean).join(' ')} d={breakPath(view)} />

      <g className={s.fallbackBores}>
        {bores
          .filter((b) => !b.active)
          .map((b) => {
            const x0 = view.xForKm(b.surfaceEastKm)
            const x1 = view.xForKm(b.bottomEastKm)
            const y1 = Math.min(h, view.yForMd(b.tdMd))
            return <line key={b.id} x1={x0} y1={view.groundY} x2={x1} y2={y1} />
          })}
      </g>

      {/* The well this cut is for, drawn with the casing rather than with its neighbours: it is the
          one bore in the picture that arrives before anything else does. */}
      <g className={s.fallbackBoreActive}>
        {bores
          .filter((b) => b.active)
          .map((b) => {
            const x0 = view.xForKm(b.surfaceEastKm)
            const x1 = view.xForKm(b.bottomEastKm)
            const y1 = Math.min(h, view.yForMd(b.tdMd))
            return <line key={b.id} x1={x0} y1={view.groundY} x2={x1} y2={y1} />
          })}
      </g>
    </svg>
  )
}

/** The chevrons a section convention uses for a depth discontinuity. */
function breakPath(view: SectionView): string {
  const n = Math.max(3, Math.round((view.rockRight - view.rockLeft) / 15))
  const step = (view.rockRight - view.rockLeft) / n
  const amp = 4.5
  let d = `M${view.rockLeft} ${view.breakY}`
  for (let i = 0; i < n; i++) {
    const x0 = view.rockLeft + i * step
    d += ` L${x0 + step / 2} ${view.breakY + (i % 2 === 0 ? amp : -amp)} L${x0 + step} ${view.breakY}`
  }
  return d
}
