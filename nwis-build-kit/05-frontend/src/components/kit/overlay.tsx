import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import s from './kit.module.css'

/* ============================================================================
   Drawer: the primary drill-down surface. Clicking a well, an event or a
   document source opens a drawer instead of navigating away.
   ========================================================================== */

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  eyebrow,
  children,
  footer,
  side = 'right',
  wide,
  signal = 'yellow',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  eyebrow?: ReactNode
  children: ReactNode
  footer?: ReactNode
  side?: 'right' | 'left'
  wide?: boolean
  signal?: 'yellow' | 'red' | 'none'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // The experience scrolls an inner container, not the body, so lock whatever actually scrolls.
    const locked = [document.body, ...document.querySelectorAll<HTMLElement>('[data-nwis-scroll]')]
    const prev = new Map(locked.map((el) => [el, el.style.overflow] as const))
    for (const el of locked) el.style.overflow = 'hidden'
    const t = setTimeout(() => {
      const focusable = ref.current?.querySelector<HTMLElement>('[data-autofocus],button,a[href],input,select,textarea')
      focusable?.focus()
    }, 30)
    return () => {
      document.removeEventListener('keydown', onKey)
      for (const el of locked) el.style.overflow = prev.get(el) ?? ''
      clearTimeout(t)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <>
      <div className={s.scrim} onClick={onClose} aria-hidden />
      <div
        className={[s.drawer, side === 'left' && s['drawer--left'], wide && s['drawer--wide']].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={ref}
      >
        <header
          className={s.drawerHead}
          style={signal === 'red' ? { borderBottomColor: 'var(--nw-red)' } : signal === 'none' ? { borderBottomColor: 'var(--nw-border-dark-2)' } : undefined}
        >
          <div style={{ minWidth: 0 }}>
            {eyebrow && (
              <div className="label" style={{ color: 'var(--nw-yellow)', fontSize: 'var(--nw-fs-micro)', marginBottom: 5 }}>
                {eyebrow}
              </div>
            )}
            <h2 className={s.drawerTitle} id={titleId}>
              {title}
            </h2>
            {subtitle && <div className={s.drawerSub}>{subtitle}</div>}
          </div>
          <button type="button" className={s.drawerClose} onClick={onClose} aria-label="Close panel">
            Close ✕
          </button>
        </header>
        <div className={s.drawerBody}>{children}</div>
        {footer && <div className={s.drawerFoot}>{footer}</div>}
      </div>
    </>,
    document.body,
  )
}

/* ============================================================================
   Tooltip — works on keyboard focus as well as hover.
   ========================================================================== */

interface TipState {
  x: number
  y: number
  content: ReactNode
}

export function Tooltip({ tip }: { tip: TipState | null }) {
  if (!tip) return null
  const style: React.CSSProperties = {
    left: Math.min(tip.x + 12, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 292),
    top: Math.max(8, tip.y - 12),
  }
  return createPortal(
    <div className={s.tip} style={style} role="tooltip">
      {tip.content}
    </div>,
    document.body,
  )
}

/** Attach to any element: hover + focus produce the same tip. */
export function useTooltip() {
  const [tip, setTip] = useState<TipState | null>(null)
  const show = useCallback((e: { clientX: number; clientY: number }, content: ReactNode) => {
    setTip({ x: e.clientX, y: e.clientY, content })
  }, [])
  const hide = useCallback(() => setTip(null), [])
  const bind = useCallback(
    (content: ReactNode) => ({
      onMouseMove: (e: React.MouseEvent) => show(e, content),
      onMouseLeave: hide,
      onFocus: (e: React.FocusEvent) => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
        show({ clientX: r.left + r.width / 2, clientY: r.top + r.height }, content)
      },
      onBlur: hide,
    }),
    [show, hide],
  )
  return { tip, bind, hide, show }
}

export function TipContent({ title, rows }: { title: string; rows: [string, ReactNode][] }) {
  return (
    <>
      <div className={s.tip__title}>{title}</div>
      {rows.map(([k, v], i) => (
        <div className={s.tip__row} key={i}>
          <span>{k}</span>
          <b>{v}</b>
        </div>
      ))}
    </>
  )
}
