import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, qk } from '../api/client'
import { useLive } from '../hooks/useLive'
import { useClock } from '../hooks/useViewport'
import { fmtM, pad2 } from '../lib/format'
import { Icon } from './kit/icons'
import { LiveIndicator, ProvenanceTag } from './kit'
import s from './shell.module.css'

/**
 * The operation bar. A control strip, not a header: identity on the left, the
 * well being drilled in the middle with the numbers that decide what happens
 * next, controls on the right. 50px tall, one yellow hairline underneath.
 */
export function TopOperationBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const navigate = useNavigate()
  const now = useClock()
  const { data: well } = useQuery({ queryKey: qk.activeWell, queryFn: api.activeWell, staleTime: 60_000 })
  const { data: live } = useQuery({ queryKey: qk.live(well?.id ?? '-'), queryFn: () => api.live(well!.id), enabled: Boolean(well) })
  const { data: alerts } = useQuery({
    queryKey: qk.alerts(well?.id ?? '-', 'open'),
    queryFn: () => api.alerts(well!.id, 'open'),
    enabled: Boolean(well),
    staleTime: 10_000,
  })
  const socket = useLive(well?.id, Boolean(well?.id))

  const openAlerts = (alerts?.alerts ?? []).filter((a) => !a.acknowledged).length
  const depth = live?.primary.find((p) => p.key === 'depth')?.value ?? well?.bit.mdM
  const source = live?.source ?? 'eRTMAC (WITSML)'
  const latency = live?.latencySeconds ?? 2

  const state = socket.status === 'open' ? 'live' : socket.status === 'connecting' ? 'warn' : 'off'

  return (
    <header className={`${s.top} on-black`}>
      <div className={s.brand}>
        <span className={s.brandMark} aria-hidden>
          N
        </span>
        <span className={s.brandText}>
          <span className={s.brandName}>NWIS</span>
          <span className={s.brandSub}>National Well Intelligence</span>
        </span>
      </div>

      <div className={s.telemetry}>
        <div className={s.tCell}>
          <span className={s.tLabel}>Feed</span>
          <LiveIndicator state={state} onBlack label={state === 'live' ? 'Live' : state === 'warn' ? 'Linking' : 'Offline'} />
        </div>
        <div className={`${s.tCell} ${s['tCell--hideSm']}`}>
          <span className={s.tLabel}>Active well</span>
          <span className={`${s.tValue} ${s['tValue--signal']}`}>{well?.id ?? '—'}</span>
        </div>
        <div className={s.tCell}>
          <span className={s.tLabel}>Depth</span>
          <span className={s.tValue}>
            {depth != null ? fmtM(depth).replace(' m', '') : '—'}
            <span className={s.tUnit}>m MD</span>
          </span>
        </div>
        <div className={s.tCell}>
          <span className={s.tLabel}>Formation</span>
          <span className={s.tValue}>{well?.currentFormation ?? '—'}</span>
        </div>
        <div className={`${s.tCell} ${s['tCell--hideMd']}`}>
          <span className={s.tLabel}>Next top</span>
          <span className={s.tValue}>
            {well?.nextFormation ? `${well.nextFormation.name} · ${well.nextFormation.distanceM} m` : '—'}
          </span>
        </div>
        <div className={`${s.tCell} ${s['tCell--hideMd']}`}>
          <span className={s.tLabel}>Connection</span>
          <span className={s.tValue}>
            {source.split(' ')[0]}
            <span className={s.tUnit}>{latency}s</span>
          </span>
        </div>
        <div className={`${s.tCell} ${s['tCell--grow']} ${s['tCell--hideSm']}`} style={{ justifyContent: 'center' }}>
          <ProvenanceTag kind="DEMO" />
        </div>
        <div className={s.tCell}>
          <span className={s.tLabel}>Rig time</span>
          <span className={s.tValue}>
            {pad2(now.getHours())}:{pad2(now.getMinutes())}
            <span className={s.tUnit}>IST</span>
          </span>
        </div>
      </div>

      <div className={s.topRight}>
        <button type="button" className={s.searchBtn} onClick={onOpenPalette} aria-label="Open global search and command palette">
          <Icon name="search" size={14} />
          <span className={s.topSearchLabel}>Search wells, events, documents…</span>
          <span className={s.searchKbd}>⌘K</span>
        </button>
        <button
          type="button"
          className={s.iconBtn}
          onClick={() => navigate('/#alerts')}
          aria-label={`Alerts${openAlerts ? `, ${openAlerts} unacknowledged` : ''}`}
        >
          <Icon name="alerts" size={15} />
          {openAlerts > 0 && <span className={s.badge}>{openAlerts}</span>}
        </button>
        <button
          type="button"
          className={`${s.iconBtn} ${s['iconBtn--on']}`}
          onClick={() => navigate('/#assistant')}
          aria-label="NWIS Assistant"
        >
          <Icon name="assistant" size={15} />
        </button>
        <div className={s.user}>
          <span className={s.avatar} aria-hidden>
            DE
          </span>
          <span>
            <span className={s.userName}>Drilling Eng</span>
            <br />
            <span className={s.userRole}>eRTMAC · rig 04</span>
          </span>
        </div>
      </div>
    </header>
  )
}
