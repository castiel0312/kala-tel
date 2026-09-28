import { Skel } from './kit/primitives'
import s from './shell.module.css'

/**
 * Route-level fallback for a screen whose code is still arriving. It holds the shell's own geometry
 * — a page band, a metric row and a work surface — so the workspace does not collapse and jump when
 * the screen mounts. The label says what is being fetched, because a blank panel reads as a fault.
 */
export function ScreenFallback({ label }: { label: string }) {
  return (
    <div className={s.pageScroll} aria-busy="true" aria-live="polite">
      <div className={s.phead} style={{ margin: 'calc(var(--nw-page-pad) * -1) calc(var(--nw-page-pad) * -1) 0' }}>
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <div className={s.phead__eyebrow}>
            <span className={s.phead__num}>···</span>
          </div>
          <h1 className={s.phead__title}>{label}</h1>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 'var(--nw-gap)', flex: '0 0 auto' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skel h={34} />
          <Skel h={34} />
          <Skel h={34} />
        </div>
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skel h={120} />
          <Skel h={120} />
        </div>
      </div>
    </div>
  )
}
