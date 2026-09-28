import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { Icon, LiveIndicator, ProvenanceTag } from '../components/kit'
import { useNwis } from './useNwis'
import { useScrollSpy } from './hooks'
import { NAV_SECTIONS, SECTION_IDS } from './sections'
import s from './experience.module.css'

const ORDER = NAV_SECTIONS.reduce<Record<string, number>>((acc, sec, i) => {
  acc[sec.id] = i
  return acc
}, {})

/**
 * Fixed navigation. Anchors, not routes: the page never reloads and the scroll position is
 * never lost. The active item is whichever section owns the viewport, and the hairline at the
 * bottom doubles as a scroll progress read-out.
 */
export function TopNav() {
  const { goTo, liveStatus, well, frame } = useNwis()
  const { active, scrolled } = useScrollSpy(SECTION_IDS)
  const stripRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const [resetting, setResetting] = useState(false)

  // Keep the active anchor visible in the horizontal strip on narrow screens.
  // `scrollIntoView` cannot be used here: it walks every scrollable ancestor, so its `block`
  // axis would drag the page's own vertical scrollport and hijack a deep link.
  useEffect(() => {
    const strip = stripRef.current
    const el = strip?.querySelector<HTMLElement>('[data-active="true"]')
    if (!strip || !el) return
    const want = el.offsetLeft - (strip.clientWidth - el.offsetWidth) / 2
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    strip.scrollTo({ left: want, behavior: reduced ? 'auto' : 'smooth' })
  }, [active])

  const resetDemo = async () => {
    setResetting(true)
    try {
      await api.resetDemo()
      await queryClient.invalidateQueries()
    } finally {
      setResetting(false)
    }
  }

  const live = liveStatus === 'open'
  const progress = Math.round(((ORDER[active] ?? 0) / (NAV_SECTIONS.length - 1)) * 100)

  return (
    <header className={[s.nav, scrolled && s.navScrolled].filter(Boolean).join(' ')}>
      <a
        className={s.brand}
        href="#overview"
        onClick={(e) => {
          e.preventDefault()
          goTo('overview')
        }}
      >
        <span className={s.brandMark} aria-hidden />
        <span className={s.brandText}>
          <b>NWIS</b>
          <em>Neighbourhood Well Intelligence</em>
        </span>
      </a>

      <nav className={s.navStrip} aria-label="Sections" ref={stripRef}>
        {NAV_SECTIONS.map((sec) => {
          const on = sec.id === active
          return (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              data-active={on ? 'true' : undefined}
              aria-current={on ? 'true' : undefined}
              className={[s.navLink, on && s.navLinkOn].filter(Boolean).join(' ')}
              onClick={(e) => {
                e.preventDefault()
                goTo(sec.id)
              }}
            >
              <span className={s.navNo}>{sec.no}</span>
              {sec.nav}
            </a>
          )
        })}
      </nav>

      <div className={s.navRight}>
        <ProvenanceTag kind={live ? 'LIVE' : 'DEMO'} label={well.data?.id ?? 'connecting'} />
        <LiveIndicator state={live ? 'live' : liveStatus === 'connecting' ? 'connecting' : 'warn'} label="eRTMAC" />
        <button
          type="button"
          className={s.navGhost}
          onClick={resetDemo}
          disabled={resetting}
          title={frame ? 'Reset the demo feed to its opening state' : 'Resetting'}
        >
          <Icon name="reset" size={11} />
          <span className="srOnly">Reset demo feed</span>
        </button>
      </div>

      <div className={s.navProgress} aria-hidden>
        <span style={{ width: `${progress}%` }} />
      </div>
    </header>
  )
}
