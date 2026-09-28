import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './kit/icons'
import { HazardStripe, MicroLabel } from './kit'
import s from './shell.module.css'

/**
 * Page title band. Number, section, one line of context, and the controls that
 * belong to this screen only. Kept to 52px so the working area stays large.
 */
export function PageHeader({
  num,
  section,
  title,
  sub,
  aside,
  signal,
}: {
  num?: string
  section?: string
  title: ReactNode
  sub?: ReactNode
  aside?: ReactNode
  signal?: boolean
}) {
  return (
    <div className={s.phead}>
      {signal && <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2, backgroundImage: 'var(--nw-hazard-thin)', backgroundSize: '5.7px 5.7px' }} />}
      <div style={{ minWidth: 0 }}>
        {(num || section) && (
          <div className={s.phead__eyebrow}>
            <MicroLabel rule dim>{section ?? 'NWIS'}</MicroLabel>
            {num && <span className={s.phead__num}>{num}</span>}
          </div>
        )}
        <h1 className={s.phead__title}>{title}</h1>
        {sub && <p className={s.phead__sub}>{sub}</p>}
      </div>
      {aside && <div className={s.phead__aside}>{aside}</div>}
    </div>
  )
}

/** Small inline control cluster used inside page headers and panels. */
export function HeaderTools({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>{children}</div>
  )
}

/** A back affordance that uses the router, so the browser history stays correct. */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className={s.backLink} aria-label={`Back to ${label}`} title={`Back to ${label}`}>
      <Icon name="chevronLeft" size={14} />
      {label}
    </Link>
  )
}

export { HazardStripe }
