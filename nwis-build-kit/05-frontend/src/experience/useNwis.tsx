import { useQuery } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { api, qk } from '../api/client'
import { useActiveWell } from '../hooks/useActiveWell'
import { useLive, type LiveStatus } from '../hooks/useLive'
import type { LiveSnapshot } from '../api/types'
import { useClock, useMediaQuery } from '../hooks/useViewport'
import { SECTION_IDS } from './sections'

/**
 * Shared state for the single-page experience.
 *
 * Two rules keep the page coherent rather than a stack of unrelated widgets:
 *  1. `useLive` is called exactly once, here, so every section reads one WebSocket
 *     instead of each section opening its own.
 *  2. Every cross-section jump goes through `goTo`, so the map, the well list, the risk
 *     engine and the document viewer all move the same scroll container.
 */
export interface ExperienceFilters {
  radiusKm: number
  minSimilarity: number
  onlyRisk: boolean
  onlyLoss: boolean
  align: 'md' | 'tvdss' | 'formation'
}

export interface DocumentTarget {
  documentId: string
  page: number
}

interface NwisValue {
  /** The scroll container. Drawers lock this instead of the document body. */
  scrollEl: HTMLElement | null
  wellId: string | undefined
  well: ReturnType<typeof useActiveWell>
  /** Latest live frame: the WebSocket frame, or the REST snapshot while the socket opens. */
  frame: LiveSnapshot | null
  liveStatus: LiveStatus
  now: Date
  goTo: (id: string) => void
  selectedWellId: string | null
  selectWell: (id: string | null) => void
  doc: DocumentTarget
  /** Change the page without moving the reader — the viewer is already on screen. */
  setDoc: (target: DocumentTarget) => void
  openDocument: (documentId: string, page: number) => void
  filters: ExperienceFilters
  setFilter: <K extends keyof ExperienceFilters>(key: K, value: ExperienceFilters[K]) => void
  resetFilters: () => void
  reducedMotion: boolean
  isDesktop: boolean
}

const DEFAULT_FILTERS: ExperienceFilters = {
  radiusKm: 5,
  minSimilarity: 60,
  onlyRisk: false,
  onlyLoss: false,
  align: 'formation',
}

const NwisContext = createContext<NwisValue | null>(null)

export const SCROLL_ID = 'nwis-scroll'

export function NwisProvider({ children }: { children: ReactNode }) {
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null)
  const [selectedWellId, setSelectedWellId] = useState<string | null>(null)
  const [doc, setDocState] = useState<DocumentTarget>({ documentId: 'W-067_WCR_2019.pdf', page: 47 })
  const [filters, setFilters] = useState<ExperienceFilters>(DEFAULT_FILTERS)

  const well = useActiveWell()
  const wellId = well.data?.id
  // One socket for the whole page. The REST snapshot seeds the first paint so the live
  // section has real numbers before the socket's first frame lands.
  const { status: liveStatus, lastFrame } = useLive(wellId)
  const seed = useQuery({
    queryKey: qk.live(wellId ?? ''),
    queryFn: () => api.live(wellId as string),
    enabled: Boolean(wellId),
    staleTime: Infinity,
  })
  const frame = lastFrame ?? seed.data ?? null
  const now = useClock()
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  /**
   * Where a section has to sit in the scrollport. Every section carries a `scroll-margin-top`
   * to clear the sticky navigation — except the opening section, which is the top of the page
   * and must land at zero rather than be pushed up under a header it already sits below.
   */
  const targetTop = useCallback(
    (el: HTMLElement) => {
      const port = scrollEl
      if (!port || el.id === SECTION_IDS[0]) return 0
      return el.getBoundingClientRect().top + port.scrollTop - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0)
    },
    [scrollEl],
  )

  const goTo = useCallback(
    (id: string) => {
      const el = scrollEl?.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
      if (!el) return
      scrollEl?.scrollTo({ top: targetTop(el), behavior: reducedMotion ? 'auto' : 'smooth' })
      // Keep the keyboard with the reader after an in-page jump.
      el.querySelector<HTMLElement>('[data-section-focus]')?.focus({ preventScroll: true })
    },
    [scrollEl, reducedMotion, targetTop],
  )

  const setDoc = useCallback((target: DocumentTarget) => setDocState(target), [])

  /**
   * Deep links into the page. `/#risk` from a workbench, or a shared URL, has to land on the
   * right section inside the scrollport rather than the top of the document — and it has to
   * survive the ref callback that only exists after the first commit, so `scrollEl` is a
   * dependency rather than a captured null.
   */
  const { hash, key } = useLocation()
  /**
   * The browser resolves a fragment at first layout, when every section is still empty, and
   * leaves the scrollport parked at the wrong offset. `parked` records that the scrollport has
   * been taken over by us, and `landed` keeps a re-run of the same landing (React's dev
   * double-invoke, a late ref) on the cold path instead of degrading to a smooth jump.
   */
  const parked = useRef(false)
  const landed = useRef<string | null>(null)
  useEffect(() => {
    const id = hash ? decodeURIComponent(hash.slice(1)) : ''
    if (!id) return
    if (scrollEl && !parked.current) {
      parked.current = true
      window.scrollTo(0, 0)
      scrollEl.scrollTop = 0
    }
    const repeat = landed.current === id
    landed.current = id
    /** A landing from the top of the page is a cold deep link and must be exact, not animated. */
    const cold = repeat || (scrollEl?.scrollTop ?? 0) <= 2
    let frame = 0
    let timer = 0
    let cancelled = false

    const find = () => scrollEl?.querySelector<HTMLElement>(`#${CSS.escape(id)}`) ?? null
    const offsetOf = targetTop

    const land = () => {
      const el = find()
      if (!el) {
        // The section is in the page but may not be in the scrollport yet.
        if (!cancelled) frame = requestAnimationFrame(land)
        return
      }
      if (!cold) {
        goTo(id)
        return
      }
      // A cold deep link lands before the data has painted, so the sections above it are still
      // filling in and the target slides away underneath the reader. Land instantly, then hold
      // the target until the page stops moving — and get out of the way the moment the reader
      // scrolls for themselves.
      const port = scrollEl
      if (!port) return
      const startAt = offsetOf(el)
      port.scrollTo({ top: startAt, behavior: 'instant' })
      el.querySelector<HTMLElement>('[data-section-focus]')?.focus({ preventScroll: true })
      let placed = startAt
      const deadline = performance.now() + 6000
      const hold = () => {
        if (cancelled) return
        const target = find()
        if (target) {
          const top = offsetOf(target)
          if (Math.abs(port.scrollTop - top) > 8) {
            if (Math.abs(port.scrollTop - placed) > 8) return // the reader took over
            port.scrollTo({ top, behavior: 'instant' })
          }
          placed = top
        }
        if (performance.now() < deadline) settle()
      }
      const settle = () => {
        timer = window.setTimeout(hold, 120)
      }
      settle()
    }

    land()
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [hash, key, scrollEl, goTo, targetTop])

  const openDocument = useCallback(
    (documentId: string, page: number) => {
      setDocState({ documentId, page })
      goTo('documents')
    },
    [goTo],
  )

  const setFilter = useCallback(<K extends keyof ExperienceFilters>(key: K, value: ExperienceFilters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), [])

  const value = useMemo<NwisValue>(
    () => ({
      scrollEl,
      wellId,
      well,
      frame,
      liveStatus,
      now,
      goTo,
      selectedWellId,
      selectWell: setSelectedWellId,
      doc,
      setDoc,
      openDocument,
      filters,
      setFilter,
      resetFilters,
      reducedMotion,
      isDesktop,
    }),
    [scrollEl, wellId, well, frame, liveStatus, now, goTo, selectedWellId, doc, setDoc, openDocument, filters, setFilter, resetFilters, reducedMotion, isDesktop],
  )

  return (
    <NwisContext.Provider value={value}>
      <div
        id={SCROLL_ID}
        data-nwis-scroll=""
        className="nwis-scroll"
        ref={setScrollEl}
      >
        {children}
      </div>
    </NwisContext.Provider>
  )
}

export function useNwis(): NwisValue {
  const ctx = useContext(NwisContext)
  if (!ctx) throw new Error('useNwis must be used inside <NwisProvider>')
  return ctx
}

/** Offset wells for the current filters — one fetch shared by the map and the nearby-well section. */
export function useNearbyWells() {
  const { wellId, filters } = useNwis()
  return useQuery({
    queryKey: qk.offsets(wellId ?? '', { radius_km: filters.radiusKm, min_similarity: filters.minSimilarity, has_loss_events: filters.onlyLoss || undefined, sort: 'similarity' }),
    queryFn: () => api.offsets(wellId as string, { radius_km: filters.radiusKm, min_similarity: filters.minSimilarity, has_loss_events: filters.onlyLoss || undefined, sort: 'similarity' }),
    enabled: Boolean(wellId),
    staleTime: 5 * 60_000,
  })
}

/** Corridor for the current alignment, shared by the depth section and the risk timeline. */
export function useCorridor() {
  const { wellId, filters } = useNwis()
  const query = { align: filters.align, look_ahead_m: 250 }
  return useQuery({
    queryKey: qk.corridor(wellId ?? '', query),
    queryFn: () => api.corridor(wellId as string, query),
    enabled: Boolean(wellId),
    staleTime: 5 * 60_000,
  })
}

export { qk }
