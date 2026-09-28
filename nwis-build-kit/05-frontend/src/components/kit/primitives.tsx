import type { CSSProperties, ReactNode } from 'react'
import s from './kit.module.css'

/* ============================================================================
   Panels and section furniture.
   A panel is a data surface, not a card: 1px rule, 2px corner, no shadow.
   ========================================================================== */

export function Panel({
  children,
  title,
  meta,
  tone = 'light',
  head,
  bodyClass,
  className,
  style,
  grow,
  flush,
  fill,
  signal,
  id,
}: {
  children?: ReactNode
  title?: ReactNode
  meta?: ReactNode
  tone?: 'light' | 'black' | 'paper'
  /** raw node rendered in the header instead of `title` (keeps header height stable) */
  head?: ReactNode
  bodyClass?: string
  className?: string
  style?: CSSProperties
  grow?: boolean
  flush?: boolean
  /** body hands its whole height to the child — maps, PDF viewers, anything that must fill */
  fill?: boolean
  signal?: 'signal' | 'danger' | 'ok' | false
  id?: string
}) {
  const cls = [
    s.panel,
    tone === 'black' && s['panel--black'],
    tone === 'paper' && s['panel--paper'],
    grow && s['panel--grow'],
    flush && s['panel--flush'],
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const hasHead = Boolean(head ?? title)
  return (
    <section className={cls} style={style} id={id}>
      {hasHead && (
        <header
          className={[
            s.panelHead,
            signal === 'signal' && s['panelHead--signal'],
            signal === 'danger' && s['panelHead--danger'],
            signal === 'ok' && s['panelHead--ok'],
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {head ?? <h2 className={s.panelTitle}>{title}</h2>}
          {meta != null && <div className={s.panelHeadMeta}>{meta}</div>}
        </header>
      )}
      {children != null && (
        <div className={[s.panelBody, bodyClass, flush && s['panelBody--tight'], fill && s['panelBody--fill']].filter(Boolean).join(' ')}>
          {children}
        </div>
      )}
    </section>
  )
}

/** Black section title strip. Used to open a region of a screen. */
export function Band({ title, meta, signal }: { title: ReactNode; meta?: ReactNode; signal?: boolean }) {
  return (
    <div className={s.band}>
      {signal && <span className={s.hazard} style={{ width: 26, height: 4 }} aria-hidden />}
      <span className={s.band__title}>{title}</span>
      {meta != null && <span className={s.band__meta}>{meta}</span>}
    </div>
  )
}

export function MicroLabel({
  children,
  rule = true,
  onBlack,
  meta,
  dim,
  as: As = 'div',
}: {
  children: ReactNode
  rule?: boolean
  onBlack?: boolean
  meta?: ReactNode
  dim?: boolean
  as?: 'div' | 'span' | 'h2' | 'h3' | 'legend'
}) {
  return (
    <As
      className={[s.micro, onBlack && s['micro--onBlack'], !onBlack && s['micro--signal'], dim && s['micro--rule--dim']]
        .filter(Boolean)
        .join(' ')}
    >
      {rule && <span className={[s.micro__rule, dim && s['micro__rule--dim']].filter(Boolean).join(' ')} aria-hidden />}
      {/* A label has to be able to give way inside a flex row: as a bare child it kept its
          intrinsic width and pushed whatever sat beside it out of the panel. */}
      <span className={s.micro__text}>{children}</span>
      {meta != null && <span className={s.micro__meta}>{meta}</span>}
    </As>
  )
}

export function HazardStripe({ size = 'md', vertical }: { size?: 'sm' | 'md' | 'thin'; vertical?: boolean }) {
  return (
    <div
      className={[s.hazard, size === 'sm' && s['hazard--sm'], size === 'thin' && s['hazard--thin'], vertical && s['hazard--v']]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    />
  )
}

/* ------------------------------------------------------------------ chips -- */

export type ChipTone = 'grey' | 'ink' | 'yellow' | 'outline' | 'red' | 'redGhost' | 'green' | 'greenGhost' | 'yellowGhost'

/** 2D / 3D camera switch. Shared so every Mapbox surface reads the same way. */
export function CameraBar({
  mode,
  onChange,
  onBlack,
}: {
  mode: '2d' | '3d'
  onChange: (m: '2d' | '3d') => void
  onBlack?: boolean
}) {
  return (
    <div className={[s.cameraBar, onBlack ? s['cameraBar--black'] : ''].filter(Boolean).join(' ')} role="group" aria-label="Camera">
      <button
        type="button"
        className={s.camBtn}
        aria-pressed={mode === '2d'}
        onClick={() => onChange('2d')}
        title="2D — flatten to a north-up plan; wells and operational layers stay"
      >
        2D
      </button>
      <button
        type="button"
        className={s.camBtn}
        aria-pressed={mode === '3d'}
        onClick={() => onChange('3d')}
        title="3D — pitch the camera, drape Mapbox terrain on it, orbit the well field"
      >
        3D
      </button>
    </div>
  )
}

export function Chip({ children, tone = 'grey', title }: { children: ReactNode; tone?: ChipTone; title?: string }) {
  const map: Record<ChipTone, string | undefined> = {
    grey: s['chip--grey'],
    ink: s['chip--ink'],
    yellow: s['chip--yellow'],
    outline: s['chip--outline'],
    red: s['chip--red'],
    redGhost: s['chip--redGhost'],
    green: s['chip--green'],
    greenGhost: s['chip--greenGhost'],
    yellowGhost: s['chip--yellowGhost'],
  }
  return (
    <span className={`${s.chip} ${map[tone] ?? ''}`} title={title}>
      {children}
    </span>
  )
}

const RISK_TONE: Record<string, ChipTone | undefined> = {
  HIGH: 'red',
  MEDIUM: 'yellowGhost',
  LOW: 'greenGhost',
  NONE: 'grey',
}

export function RiskChip({ level, probability }: { level?: string; probability?: number }) {
  const l = (level ?? 'NONE').toUpperCase()
  return (
    <Chip tone={RISK_TONE[l] ?? 'grey'}>
      {l}
      {probability != null && <span className="mono" style={{ marginLeft: 2 }}>{probability}%</span>}
    </Chip>
  )
}

const STATUS_TONE: Record<string, ChipTone | undefined> = {
  DRILLING: 'yellow',
  ACT_NOW: 'red',
  WATCH: 'yellowGhost',
  MONITOR: 'yellowGhost',
  STABLE: 'greenGhost',
  CONFIRMED: 'greenGhost',
  VERIFIED: 'greenGhost',
  DONE: 'greenGhost',
  OPEN: 'yellowGhost',
  ACK: 'greenGhost',
  Producing: 'greenGhost',
  Suspended: 'grey',
  Abandoned: 'grey',
  Plugged: 'grey',
}

export function StatusChip({ status, title }: { status?: string; title?: string }) {
  if (!status) return null
  return (
    <Chip tone={STATUS_TONE[status] ?? 'grey'} title={title}>
      {status}
    </Chip>
  )
}

/* ------------------------------------------------------------------- live -- */

export function LiveIndicator({
  state,
  label,
  onBlack,
  title,
}: {
  state: 'live' | 'warn' | 'alarm' | 'off' | 'connecting'
  label?: string
  onBlack?: boolean
  title?: string
}) {
  const dot =
    state === 'live'
      ? s['liveDot--live']
      : state === 'warn'
        ? s['liveDot--warn']
        : state === 'alarm'
          ? s['liveDot--alarm']
          : s['liveDot--off']
  return (
    <span
      className={[s.live, onBlack && 'on-black'].filter(Boolean).join(' ')}
      title={title}
      style={onBlack ? { color: 'var(--nw-ink-2)' } : undefined}
    >
      <span className={[s.liveDot, dot].filter(Boolean).join(' ')} aria-hidden />
      {label ?? (state === 'live' ? 'Live' : state === 'connecting' ? 'Linking' : 'Offline')}
    </span>
  )
}

/* --------------------------------------------------------------- controls -- */

export function Button({
  children,
  variant = 'default',
  size,
  block,
  onBlack,
  ...rest
}: {
  children: ReactNode
  variant?: 'default' | 'primary' | 'ghost' | 'danger' | 'on'
  size?: 'sm'
  block?: boolean
  /** for controls sitting on a black section, where the default chrome would disappear */
  onBlack?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = [
    s.btn,
    variant === 'primary' && s['btn--primary'],
    variant === 'ghost' && s['btn--ghost'],
    variant === 'danger' && s['btn--danger'],
    variant === 'on' && s['btn--on'],
    size === 'sm' && s['btn--sm'],
    block && s['btn--block'],
    onBlack && s['btn--onBlack'],
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  onBlack,
  ariaLabel,
}: {
  value: T
  options: { value: T; label: ReactNode; title?: string }[]
  onChange: (v: T) => void
  onBlack?: boolean
  ariaLabel?: string
}) {
  return (
    <div className={[s.seg, onBlack && s['seg--onBlack']].filter(Boolean).join(' ')} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={s.segBtn}
          aria-pressed={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  children,
  title,
  onBlack,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children: ReactNode
  title?: string
  onBlack?: boolean
}) {
  return (
    <button
      type="button"
      className={[s.switchRow, onBlack && s['switchRow--onBlack']].filter(Boolean).join(' ')}
      aria-pressed={checked}
      title={title}
      onClick={() => onChange(!checked)}
    >
      <span className={s.switchBox} aria-hidden />
      <span>{children}</span>
    </button>
  )
}

export function Field({
  value,
  onChange,
  placeholder,
  icon,
  ariaLabel,
  autoFocus,
  onKeyDown,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  icon?: ReactNode
  ariaLabel?: string
  autoFocus?: boolean
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
}) {
  return (
    <div className={s.field}>
      {icon}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}

/* ----------------------------------------------------------------- states -- */

export function EmptyState({
  title = 'No data for current filter',
  body,
  actions,
}: {
  title?: string
  body?: string
  actions?: ReactNode
}) {
  return (
    <div className={s.empty} role="status">
      <HazardStripe size="sm" />
      <span className={s.empty__title}>{title}</span>
      {body && <p className={s.empty__body}>{body}</p>}
      {actions && <div className={s.empty__actions}>{actions}</div>}
    </div>
  )
}

export function ErrorStrip({
  title = 'Data connection lost',
  body,
  action,
  onAction,
}: {
  title?: string
  body?: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className={s.errStrip} role="alert">
      <span className={s.errStrip__title}>{title}</span>
      {body && <span className={s.errStrip__body}>{body}</span>}
      {action && onAction && (
        <button type="button" className={s.errStrip__action} onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  )
}

export function Skel({ w, h = 10, ink }: { w?: number | string; h?: number; ink?: boolean }) {
  return <div className={[s.skel, ink && s['skel--ink']].filter(Boolean).join(' ')} style={{ width: w ?? '100%', height: h }} />
}

/** Skeleton that preserves the exact geometry of a metric strip. */
export function MetricSkeleton({ n = 4, height = 52 }: { n?: number; height?: number }) {
  return (
    <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: '1fr', border: '1px solid var(--nw-border)' }}>
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          style={{
            padding: '8px 12px',
            borderRight: i < n - 1 ? '1px solid var(--nw-border)' : 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            height,
            justifyContent: 'center',
          }}
        >
          <Skel w={44} h={7} />
          <Skel w={68} h={14} />
        </div>
      ))}
    </div>
  )
}

/* ----------------------------------------------------------------- legend -- */

export function Legend({ children, onBlack }: { children: ReactNode; onBlack?: boolean }) {
  return (
    <div
      className={s.legend}
      style={onBlack ? { color: 'var(--nw-ink-2)' } : undefined}
      role="list"
    >
      {children}
    </div>
  )
}

export function LegendItem({
  color,
  label,
  shape = 'box',
  onBlack,
}: {
  color: string
  label: ReactNode
  shape?: 'box' | 'line' | 'dot'
  onBlack?: boolean
}) {
  return (
    <span className={s.legendItem} role="listitem">
      <span
        className={[s.legendSwatch, shape === 'line' && s['legendSwatch--line'], shape === 'dot' && s['legendSwatch--dot']]
          .filter(Boolean)
          .join(' ')}
        style={{ background: color, borderColor: onBlack ? 'transparent' : undefined }}
        aria-hidden
      />
      {label}
    </span>
  )
}

/* ------------------------------------------------------------- provenance -- */

export type Provenance = 'LIVE' | 'DEMO' | 'PUBLIC' | 'HISTORICAL' | 'SYNTHETIC' | 'DERIVED'

const PROV_CLASS: Record<Provenance, string | undefined> = {
  LIVE: s['prov--live'],
  DEMO: s['prov--demo'],
  PUBLIC: s['prov--public'],
  HISTORICAL: s['prov--hist'],
  SYNTHETIC: s['prov--synth'],
  DERIVED: s['prov--synth'],
}

const PROV_TITLE: Record<Provenance, string | undefined> = {
  LIVE: 'Live from the NWIS feed',
  DEMO: 'Demo data — not Oil India production data',
  PUBLIC: 'Public dataset',
  HISTORICAL: 'Historical archive record',
  SYNTHETIC: 'Synthetic value generated for this prototype',
  DERIVED: 'Derived from measured API values',
}

export function ProvenanceTag({ kind, label }: { kind: Provenance; label?: string }) {
  return (
    <span className={`${s.prov} ${PROV_CLASS[kind] ?? ''}`} title={PROV_TITLE[kind] ?? ''}>
      {label ?? kind}
    </span>
  )
}

export { s as kitStyles }
