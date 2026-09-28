import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, qk } from '../api/client'
import { NAV } from '../lib/nav'
import { Icon } from './kit/icons'
import { LiveIndicator, ProvenanceTag } from './kit'
import { useLive } from '../hooks/useLive'
import { fmtM } from '../lib/format'
import s from './shell.module.css'

/**
 * Black navigation rail. Compact icon + label, yellow left bar on the active
 * entry, and a live status footer so the operator always knows the feed state.
 */
export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const { data: well } = useQuery({ queryKey: qk.activeWell, queryFn: api.activeWell, staleTime: 60_000 })
  const { data: alerts } = useQuery({
    queryKey: qk.alerts(well?.id ?? 'active', 'open'),
    queryFn: () => api.alerts(well?.id ?? 'OIL-WELL-104', 'open'),
    enabled: Boolean(well?.id),
    staleTime: 10_000,
  })
  const live = useLive(well?.id, Boolean(well?.id))
  const openCount = (alerts?.alerts ?? []).filter((a) => !a.acknowledged).length

  return (
    <nav className={s.rail} aria-label="Primary">
      <div className={s.railScroll}>
        {NAV.map((group) => (
          <div className={s.railGroup} key={group.title}>
            <div className={s.railGroupTitle}>{group.title}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                className={({ isActive }) => [s.railItem, isActive ? s['railItem--on'] : ''].filter(Boolean).join(' ')}
                style={({ isActive }) => (isActive ? { background: 'var(--nw-charcoal-2)', color: 'var(--nw-ink)', fontWeight: 600 } : undefined)}
                title={item.label}
              >
                {({ isActive }) => (
                  <>
                    <span className={s.railItem__dot} aria-hidden />
                    <Icon name={item.icon} size={15} style={{ opacity: isActive ? 1 : 0.72 }} />
                    <span className={s.railItemLabel}>{item.label}</span>
                    <span className={s.railItem__num} />
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div className={s.railFoot}>
        <LiveIndicator
          state={live.status === 'open' ? 'live' : live.status === 'connecting' ? 'warn' : 'off'}
          onBlack
          label={collapsed ? undefined : live.status === 'open' ? 'eRTMAC live' : live.status === 'connecting' ? 'linking' : 'offline'}
        />
        <div className={s.footStat}>
          <span>DEPTH</span>
          <b>{well ? fmtM(well.bit.mdM) : '—'}</b>
        </div>
        <div className={s.footStat}>
          <span>FORMATION</span>
          <b>{well?.currentFormation ?? '—'}</b>
        </div>
        {/* Alerts are a section of the experience, not a workbench, so the count lives in the
            foot and jumps to that section rather than owning a rail slot. */}
        <NavLink to="/#alerts" className={s.footStat} title="Open the alerts section">
          <span>ALERTS</span>
          <b style={openCount > 0 ? { color: 'var(--nw-red-on-black)' } : undefined}>{openCount}</b>
        </NavLink>
        <ProvenanceTag kind="DEMO" label={collapsed ? undefined : 'Demo data'} />
      </div>
    </nav>
  )
}
