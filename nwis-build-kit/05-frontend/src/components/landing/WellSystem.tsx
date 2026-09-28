import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, qk } from '../../api/client'
import { useNearbyWells, useNwis } from '../../experience/useNwis'
import { LiveIndicator } from '../kit'
import s from './landing.module.css'

/**
 * The well's own state, as readouts.
 *
 * Every number on this strip is on its way from somewhere else on the page already — the live
 * socket for the bit, `/risks` for the window, `/offsets` for the neighbourhood, `/events` for
 * what the engine aligned — so the strip is a second reading of the same cache rather than a
 * second request. Each cell is a link: the hero is a way into the section that has the detail,
 * not a place that holds it.
 *
 * The strip is also the last thing to arrive. It is mounted only once the well is open, because a
 * closed well has nothing to report: a row of numbers under a machine that has not been opened is
 * a dashboard, and this is not one. It used to carry the open/close control itself; that control
 * now lives on the machine and in the corner of the section, which is where a reader's hand
 * already is.
 */

const CORRIDOR_Q = { align: 'md', look_ahead_m: 250 } as const
const EVENT_Q = {} as const

const RISK_INK: Record<string, string> = {
  HIGH: 'var(--nw-red-on-black)',
  MEDIUM: 'var(--nw-yellow)',
  LOW: 'var(--nw-steel)',
}

const fmt = (n: number) => n.toLocaleString('en-GB')

export function WellSystem() {
  const { wellId, well, frame, liveStatus, goTo, filters } = useNwis()
  const nearby = useNearbyWells()
  const risks = useQuery({
    queryKey: qk.risks(wellId ?? ''),
    queryFn: () => api.risks(wellId as string),
    enabled: Boolean(wellId),
    staleTime: 60_000,
  })
  const events = useQuery({
    queryKey: qk.events(EVENT_Q),
    queryFn: () => api.events(EVENT_Q),
    staleTime: 5 * 60_000,
  })
  const corridor = useQuery({
    queryKey: qk.corridor(wellId ?? '', CORRIDOR_Q),
    queryFn: () => api.corridor(wellId as string, CORRIDOR_Q),
    enabled: Boolean(wellId),
    staleTime: 5 * 60_000,
  })

  const metric = useMemo(
    () => (key: string) => frame?.primary.find((m) => m.key === key)?.value ?? frame?.more.find((m) => m.key === key)?.value,
    [frame],
  )

  const top = risks.data?.risks?.[0]
  const offsets = nearby.data?.wells ?? []
  const aligned = useMemo(() => {
    const inWindow = (events.data?.events ?? []).filter((e) => e.alignedMdOnActiveM != null)
    return inWindow
  }, [events.data])
  const wellsWithEvents = useMemo(() => new Set(aligned.map((e) => e.wellId)).size, [aligned])
  const band = corridor.data?.predictedTop

  const depth = metric('depth')
  const rop = metric('rop')
  const ecd = metric('ecd')
  const torque = metric('torque')
  const next = band ?? (well.data?.nextFormation ? { name: well.data.nextFormation.name, depthM: well.data.nextFormation.topMdM } : null)
  const toNext = depth != null && next ? Math.round(next.depthM - depth) : null

  return (
    <div className={s.system}>
      <div className={s.systemBar}>
        <LiveIndicator state={liveStatus === 'open' ? 'live' : 'connecting'} onBlack label={`${wellId ?? 'connecting'} · ${well.data?.field ?? 'field'}`} />
        <span className={s.systemSrc}>
          MD-ALIGNED · {nearby.data?.count ?? 0} OFFSETS · {events.data?.count ?? 0} EVENTS INDEXED
        </span>
      </div>

      <div className={s.systemCells}>
        <Cell label="Bit depth" value={depth != null ? fmt(depth) : '—'} unit="m MD" note={rop != null ? `ROP ${rop} m/h` : 'awaiting socket'} onClick={() => goTo('live')} signal />

        <Cell
          label="Top risk"
          value={top ? top.name.toUpperCase() : '—'}
          note={
            top
              ? `${top.probability}% · ${fmt(top.windowMdM[0])}–${fmt(top.windowMdM[1])} m MD · ${
                  risks.data?.nextZone.metresAhead != null
                    ? `${risks.data.nextZone.metresAhead} m ahead`
                    : (top.status ?? '').replace('_', ' ')
                }`
              : 'no window in view'
          }
          ink={top ? RISK_INK[top.level] : undefined}
          onClick={() => goTo('risk')}
        />

        <Cell
          label="Next formation"
          value={next ? next.name.toUpperCase() : '—'}
          note={next ? `top at ${fmt(next.depthM)} m MD${toNext != null ? ` · ${toNext} m away` : ''}` : 'awaiting corridor'}
          onClick={() => goTo('corridor')}
        />

        <Cell
          label={`Offsets in ${filters.radiusKm} km`}
          value={offsets.length ? String(offsets.length) : '—'}
          note={
            offsets.length
              ? `${offsets.filter((o) => o.hasLossEvents).length} with loss history · best ${Math.max(...offsets.map((o) => o.similarity))}`
              : 'awaiting /offsets'
          }
          onClick={() => goTo('wells')}
        />

        <Cell
          label="Events aligned here"
          value={aligned.length ? String(aligned.length) : '—'}
          note={aligned.length ? `from ${wellsWithEvents} wells in this depth window` : 'awaiting /events'}
          onClick={() => goTo('corridor')}
        />

        <Cell
          label="Mud condition"
          value={ecd != null ? ecd.toFixed(3) : '—'}
          unit="g/cm³"
          note={torque != null ? `torque ${torque} kN·m${metric('flowOut') != null ? ` · returns ${metric('flowOut')}%` : ''}` : 'awaiting socket'}
          onClick={() => goTo('live')}
        />
      </div>
    </div>
  )
}

function Cell({
  label,
  value,
  unit,
  note,
  onClick,
  ink,
  signal,
}: {
  label: string
  value: string
  unit?: string
  note: string
  onClick: () => void
  ink?: string
  signal?: boolean
}) {
  return (
    <button type="button" className={s.systemCell} onClick={onClick} style={ink ? { borderTopColor: ink } : undefined}>
      <span className={s.systemLabel}>{label}</span>
      <span className={[s.systemValue, 'mono', signal && s['systemValue--signal']].filter(Boolean).join(' ')} style={ink ? { color: ink } : undefined}>
        {value}
        {unit && <span className={s.systemUnit}>{unit}</span>}
      </span>
      <span className={s.systemNote}>{note}</span>
    </button>
  )
}
