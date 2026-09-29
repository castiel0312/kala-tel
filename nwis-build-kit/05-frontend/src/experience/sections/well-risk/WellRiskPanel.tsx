import { useCallback, useMemo, useRef, useState } from 'react'
import { RiskProfileCard, WellRiskGauge } from './WellRiskGauge'
import { WellSectionDiagram } from './WellSectionDiagram'
import { useWellRiskData } from './useWellRiskData'
import s from './WellRisk.module.css'

export interface WellRiskPanelProps {
  wellId?: string
  compact?: boolean
}

export function WellRiskPanel({ wellId, compact = false }: WellRiskPanelProps) {
  // Key on wellId so state fully resets when the well changes
  return <WellRiskPanelContent key={wellId ?? 'first-well'} wellId={wellId} compact={compact} />
}

function WellRiskPanelContent({ wellId, compact }: { wellId: string | undefined; compact: boolean }) {
  const data = useWellRiskData(wellId)
  const latestMd = data.profile.at(-1)?.md ?? 0
  const [selectedMd, setSelectedMd] = useState<number | null>(null)
  const [replaying, setReplaying] = useState(false)
  const frame = useRef<number | null>(null)
  const startTime = useRef<number | null>(null)
  const maxMd = Math.max(data.td, latestMd, 1)
  const md = selectedMd ?? latestMd
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  const replay = useCallback(() => {
    if (replaying) {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
      startTime.current = null
      setReplaying(false)
      return
    }
    if (reducedMotion) return
    setSelectedMd(0)
    setReplaying(true)
    startTime.current = null
    const animate = (time: number) => {
      if (startTime.current === null) startTime.current = time
      const progress = Math.min(1, (time - startTime.current) / 8000)
      setSelectedMd(progress * maxMd)
      if (progress >= 1) {
        frame.current = null
        startTime.current = null
        setReplaying(false)
      } else frame.current = requestAnimationFrame(animate)
    }
    frame.current = requestAnimationFrame(animate)
  }, [maxMd, reducedMotion, replaying])

  if (data.status === 'loading') {
    return (
      <div className={`${s.panelRoot}${compact ? ` ${s.compact}` : ''}`} aria-label='Loading well risk profile' aria-busy='true'>
        <div className={s.skeletonHeader}>
          <span className={`${s.skeleton} ${s.skeletonName}`} />
          <span className={`${s.skeleton} ${s.skeletonLabel}`} />
        </div>
        <div className={s.skeletonColumns}>
          <div className={s.skeletonSummary}>
            <div className={`${s.skeleton} ${s.skeletonLine}`} />
            <div className={`${s.skeleton} ${s.skeletonDial}`} />
            {[0, 1, 2, 3].map((item) => <div key={item} className={`${s.skeleton} ${s.skeletonFactor}`} />)}
          </div>
          <div className={`${s.skeleton} ${s.skeletonChart}`} />
        </div>
      </div>
    )
  }

  if (data.status === 'error') {
    return (
      <div className={s.errorPanel} role='alert'>
        <p>Could not reach the well data service</p>
        <button className={s.retryBtn} type='button' onClick={data.retry}>Retry</button>
      </div>
    )
  }

  return (
    <div className={`${s.panelRoot} ${s.panelLayout}${compact ? ` ${s.compact}` : ''}`}>
      <div className={s.panelPrimary}>
        <WellSectionDiagram
          profile={data.profile}
          trajectory={data.trajectory}
          bins={data.bins}
          events={data.events.map((event) => ({
            event_type: event.event_subtype ?? event.event_type,
            end_md: event.end_md,
            severity: event.severity,
            npt_hours: event.npt_hours,
          }))}
          selectedMd={md}
          td={data.td}
          onDepthChange={setSelectedMd}
        />
        <WellRiskGauge profile={data.profile} selectedMd={md} compact={compact} wellName={data.wellName} />
      </div>

      <div className={s.panelProfile}>
        <RiskProfileCard
          profile={data.profile}
          selectedMd={md}
          td={data.td}
          events={data.events.map((event) => ({
            event_type: event.event_subtype ?? event.event_type,
            end_md: event.end_md,
            severity: event.severity,
            npt_hours: event.npt_hours,
          }))}
          onDepthChange={setSelectedMd}
        />
        <div className={s.replayRow}>
          <button
            type='button'
            className={s.replayBtn}
            disabled={reducedMotion}
            onClick={replay}
          >
            {reducedMotion ? 'Replay unavailable with reduced motion' : replaying ? 'Pause replay' : 'Replay drilling'}
          </button>
          <span>Surface to {Math.round(maxMd).toLocaleString('en-US')} m · 8 sec</span>
        </div>
      </div>

      <p className={s.disclaimer}>Heuristic decision-support indicator, not a validated safety system.</p>
    </div>
  )
}
