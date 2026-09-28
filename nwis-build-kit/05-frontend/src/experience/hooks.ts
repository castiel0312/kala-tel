import { useCallback, useEffect, useRef, useState } from 'react'
import { SCROLL_ID, useNwis } from './useNwis'

/**
 * Tracks which section owns the viewport. Uses the scroll container rather than the window,
 * because the experience owns its own scrollport and the utility routes never render it.
 */
export function useScrollSpy(ids: string[], headerHeight = 68): { active: string; scrolled: boolean } {
  const [active, setActive] = useState(ids[0] ?? '')
  const [scrolled, setScrolled] = useState(false)
  const frame = useRef(0)

  const measure = useCallback(() => {
    const root = document.getElementById(SCROLL_ID)
    if (!root) return
    const top = root.scrollTop
    setScrolled(top > 24)
    const probe = top + headerHeight + 140
    let current = ids[0] ?? ''
    for (const id of ids) {
      const el = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
      if (el && el.offsetTop <= probe) current = id
    }
    // At the very bottom the last section owns the view even if it is short.
    const last = ids[ids.length - 1]
    if (last && top + root.clientHeight >= root.scrollHeight - 4) current = last
    setActive(current)
  }, [ids, headerHeight])

  useEffect(() => {
    const root = document.getElementById(SCROLL_ID)
    if (!root) return
    const onScroll = () => {
      cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(measure)
    }
    onScroll()
    root.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame.current)
      root.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [measure])

  return { active, scrolled }
}

/**
 * One-shot reveal. Fires once when the element first enters the viewport, so a section that
 * has already been read does not re-animate on the way back up. Returns a ref and a flag;
 * the caller decides which class to apply.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(rootMargin = '-12% 0px -12% 0px') {
  const ref = useRef<T | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true)
            io.disconnect()
          }
        }
      },
      { rootMargin, threshold: 0.05 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])

  return { ref, shown }
}

/** True once the element has been near the viewport. Gates the heavy lazy mounts. */
export function useNearViewport<T extends HTMLElement = HTMLDivElement>(rootMargin = '600px 0px') {
  const ref = useRef<T | null>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setNear(true)
      return
    }
    const io = new IntersectionObserver((entries) => setNear(entries.some((e) => e.isIntersecting)), { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])

  return { ref, near }
}

/** Section number for the eyebrow, e.g. "02". */
export function sectionNo(n: number): string {
  return String(n).padStart(2, '0')
}

/** "2 min ago" style stamp for a live timestamp. */
export function ago(ts: string | number | undefined, now: number): string {
  if (!ts) return '—'
  const t = typeof ts === 'number' ? ts : Date.parse(ts)
  if (!Number.isFinite(t)) return '—'
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s} s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  return `${Math.round(m / 60)} h ago`
}

/** True when the reader has asked for less motion; used to skip scripted sequences. */
export function useStill(): boolean {
  return useNwis().reducedMotion
}
