import { useEffect, useState } from 'react'

/** Viewport width hook used for the layout switch, not for styling. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window === 'undefined' ? false : window.matchMedia(query).matches))
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatches(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return matches
}

export const useIsDesktop = () => useMediaQuery('(min-width: 1200px)')
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1199px)')
export const useIsMobile = () => useMediaQuery('(max-width: 767px)')

/** Wall clock for the operation bar. Ticks every second; cheap. */
export function useClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])
  return now
}

export function useLocalSelection<T extends string>(key: string, fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return fallback
    return (new URLSearchParams(window.location.search).get(key) as T) ?? fallback
  })
  useEffect(() => {
    const url = new URL(window.location.href)
    if (value == null) url.searchParams.delete(key)
    else url.searchParams.set(key, value)
    window.history.replaceState(null, '', url)
  }, [key, value])
  return [value, setValue]
}
