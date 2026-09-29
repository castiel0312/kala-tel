import { useEffect, useRef, useState } from 'react'
import type { WellLocation } from './wellLocations'
import s from './WellsCompare.module.css'

// ── Constants ────────────────────────────────────────────────────────────────

const TILE_SIZE = 256
const ZOOM_MIN = 8
const ZOOM_MAX = 17
const ACCENT = 'var(--nw-yellow-deep)'
const OTHER_COLOR = 'var(--nw-text-3)'
const EARTH_RADIUS_M = 6_378_137

const SCALE_CANDIDATES_M = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1_000, 2_000, 5_000]

// ── Web Mercator helpers ──────────────────────────────────────────────────────

function lonToTileX(lon: number, z: number): number {
  return ((lon + 180) / 360) * Math.pow(2, z)
}

function latToTileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, z)
}

function metresPerPixel(lat: number, z: number): number {
  return (Math.cos((lat * Math.PI) / 180) * 2 * Math.PI * EARTH_RADIUS_M) / (Math.pow(2, z) * TILE_SIZE)
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocatedWell {
  name: string
  lat: number
  lon: number
  isReference: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

interface FieldMapProps {
  wells: WellLocation[]
  referenceName: string
}

export function FieldMap({ wells, referenceName }: FieldMapProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [stageW, setStageW] = useState(340)
  const [stageH, setStageH] = useState(255)

  useEffect(() => {
    const el = stageRef.current
    if (el === null) return
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry === undefined) return
      const { width, height } = entry.contentRect
      if (width > 0) setStageW(Math.round(width))
      if (height > 0) setStageH(Math.round(height))
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const located: LocatedWell[] = wells.flatMap((w) =>
    w.lat !== null && w.lon !== null
      ? [{ name: w.name, lat: w.lat, lon: w.lon, isReference: w.name === referenceName }]
      : [],
  )
  const missingCount = wells.length - located.length

  const refWell = wells.find((w) => w.name === referenceName)
  const refHasCoords = refWell !== undefined && refWell.lat !== null && refWell.lon !== null

  function autoZoom(w: number, h: number): number {
    if (located.length === 0) return 12
    if (located.length === 1) return 15
    const lats = located.map((p) => p.lat)
    const lons = located.map((p) => p.lon)
    const latMin = Math.min(...lats)
    const latMax = Math.max(...lats)
    const lonMin = Math.min(...lons)
    const lonMax = Math.max(...lons)
    for (let z = ZOOM_MAX; z >= ZOOM_MIN; z--) {
      const x0 = lonToTileX(lonMin, z) * TILE_SIZE
      const x1 = lonToTileX(lonMax, z) * TILE_SIZE
      const y0 = latToTileY(latMax, z) * TILE_SIZE
      const y1 = latToTileY(latMin, z) * TILE_SIZE
      const spanX = x1 - x0
      const spanY = y1 - y0
      const pad = 0.15
      if (spanX <= w * (1 - 2 * pad) && spanY <= h * (1 - 2 * pad)) return z
    }
    return ZOOM_MIN
  }

  const [zoom, setZoom] = useState<number>(() => autoZoom(stageW, stageH))

  const locatedKey = located.map((l) => `${l.lat},${l.lon}`).join('|')
  const prevLocatedKey = useRef(locatedKey)
  useEffect(() => {
    if (prevLocatedKey.current !== locatedKey) {
      prevLocatedKey.current = locatedKey
      setZoom(autoZoom(stageW, stageH))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locatedKey])

  const centreLat = located.length > 0 ? located.reduce((s, l) => s + l.lat, 0) / located.length : 0
  const centreLon = located.length > 0 ? located.reduce((s, l) => s + l.lon, 0) / located.length : 0

  const centreTileX = lonToTileX(centreLon, zoom)
  const centreTileY = latToTileY(centreLat, zoom)
  const originPxX = stageW / 2 - centreTileX * TILE_SIZE
  const originPxY = stageH / 2 - centreTileY * TILE_SIZE

  const tileColMin = Math.floor(-originPxX / TILE_SIZE)
  const tileColMax = Math.ceil((stageW - originPxX) / TILE_SIZE)
  const tileRowMin = Math.floor(-originPxY / TILE_SIZE)
  const tileRowMax = Math.ceil((stageH - originPxY) / TILE_SIZE)
  const maxTile = Math.pow(2, zoom) - 1

  const tiles: { col: number; row: number; left: number; top: number }[] = []
  for (let col = tileColMin; col <= tileColMax; col++) {
    for (let row = tileRowMin; row <= tileRowMax; row++) {
      if (row < 0 || row > maxTile) continue
      const wrappedCol = ((col % Math.pow(2, zoom)) + Math.pow(2, zoom)) % Math.pow(2, zoom)
      tiles.push({ col: wrappedCol, row, left: originPxX + col * TILE_SIZE, top: originPxY + row * TILE_SIZE })
    }
  }

  function wellSvgXY(lat: number, lon: number): { x: number; y: number } {
    const tx = lonToTileX(lon, zoom) * TILE_SIZE
    const ty = latToTileY(lat, zoom) * TILE_SIZE
    return { x: originPxX + tx, y: originPxY + ty }
  }

  const mpp = metresPerPixel(centreLat, zoom)
  const scaleBarMaxPx = 80
  const bestCandidate = SCALE_CANDIDATES_M.filter((m) => m / mpp <= scaleBarMaxPx)
    .reduce<number | null>((best, m) => (best === null || m > best ? m : best), null)
  const scaleM = bestCandidate ?? SCALE_CANDIDATES_M[0] ?? 1
  const scalePx = scaleM / mpp
  const scaleLabel = scaleM >= 1000 ? `${scaleM / 1000} km` : `${scaleM} m`

  const scaleX1 = 14
  const scaleX2 = scaleX1 + scalePx
  const scaleY = stageH - 18
  const northX = 22
  const northY = 32
  const arrowLen = 13

  return (
    <div className={s.map}>
      <div className={s.mapStageInner} ref={stageRef}>
        {refHasCoords ? (
          <>
            {tiles.map(({ col, row, left, top }) => (
              <img
                key={`${zoom}/${row}/${col}`}
                className={s.mapTile}
                src={`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${row}/${col}`}
                alt=''
                loading='lazy'
                width={TILE_SIZE}
                height={TILE_SIZE}
                style={{ left, top }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
            ))}

            <svg className={s.mapSvg} viewBox={`0 0 ${stageW} ${stageH}`} aria-hidden='true'>
              {located.filter((w) => !w.isReference).map((w) => {
                const { x, y } = wellSvgXY(w.lat, w.lon)
                return (
                  <g key={w.name}>
                    <circle cx={x} cy={y} r={5} fill={OTHER_COLOR} stroke='var(--nw-white)' strokeWidth={1.2} />
                    <text className={s.mapLabel} x={x + 7} y={y + 3}>{w.name}</text>
                  </g>
                )
              })}

              {located.filter((w) => w.isReference).map((w) => {
                const { x, y } = wellSvgXY(w.lat, w.lon)
                return (
                  <g key={w.name}>
                    <circle className={s.mapPulse} cx={x} cy={y} r={7} />
                    <circle cx={x} cy={y} r={7} fill={ACCENT} stroke='var(--nw-white)' strokeWidth={1.5} />
                    <text className={s.mapLabel} x={x + 9} y={y + 3} fontWeight='700'>{w.name}</text>
                  </g>
                )
              })}

              <line className={s.mapScalebar} x1={scaleX1} x2={scaleX2} y1={scaleY} y2={scaleY} />
              <line className={s.mapScalebar} x1={scaleX1} x2={scaleX1} y1={scaleY - 4} y2={scaleY + 4} />
              <line className={s.mapScalebar} x1={scaleX2} x2={scaleX2} y1={scaleY - 4} y2={scaleY + 4} />
              <text className={s.mapScalelabel} x={(scaleX1 + scaleX2) / 2} y={scaleY - 6} textAnchor='middle'>{scaleLabel}</text>

              <line className={s.mapNorth} x1={northX} x2={northX} y1={northY} y2={northY - arrowLen} />
              <path className={s.mapNorth} d={`M${northX - 4},${northY - arrowLen + 6} L${northX},${northY - arrowLen} L${northX + 4},${northY - arrowLen + 6}`} fill='none' />
              <text className={s.mapNorthLetter} x={northX} y={northY + 10} textAnchor='middle'>N</text>
            </svg>

            <div className={s.mapControls}>
              <button className={s.mapZoom} type='button' aria-label='Zoom in' disabled={zoom >= ZOOM_MAX} onClick={() => setZoom((z) => Math.min(z + 1, ZOOM_MAX))}>+</button>
              <button className={s.mapZoom} type='button' aria-label='Zoom out' disabled={zoom <= ZOOM_MIN} onClick={() => setZoom((z) => Math.max(z - 1, ZOOM_MIN))}>−</button>
            </div>

            <div className={s.mapAttribution}>Imagery: Esri, Maxar, Earthstar Geographics</div>
          </>
        ) : (
          <div className={s.mapUnavailable}>
            <strong>Unavailable</strong>
            <small>Add coordinates in wellLocations.ts</small>
          </div>
        )}
      </div>

      <div className={s.mapLegend}>
        <span className={s.mapLegendItem}>
          <span className={s.mapLegendDot} style={{ background: ACCENT }} />
          Reference well
        </span>
        <span className={s.mapLegendItem}>
          <span className={s.mapLegendDot} style={{ background: OTHER_COLOR }} />
          Other wells
        </span>
      </div>

      {missingCount > 0 && (
        <p className={s.mapFootnote}>
          {missingCount === 1 ? '1 well without location' : `${missingCount} wells without location`}
        </p>
      )}
    </div>
  )
}
