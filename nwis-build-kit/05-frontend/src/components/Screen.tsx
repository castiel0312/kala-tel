import type { ReactNode } from 'react'
import { PageHeader } from './PageHeader'
import s from './shell.module.css'

/**
 * Every route inside the shell is a Screen: title band plus a working area.
 * `flush` removes the padding and scrolling so the screen owns its own panes
 * (maps, depth corridors, document viewers).
 */
export function Screen({
  num,
  section,
  title,
  sub,
  aside,
  children,
  flush,
  signal,
  areaClass,
  style,
}: {
  num?: string
  section?: string
  title: ReactNode
  sub?: ReactNode
  aside?: ReactNode
  children: ReactNode
  flush?: boolean
  signal?: boolean
  areaClass?: string
  style?: React.CSSProperties
}) {
  return (
    <>
      <PageHeader num={num} section={section} title={title} sub={sub} aside={aside} signal={signal} />
      <div className={[flush ? s.pageFlush : s.pageScroll, areaClass].filter(Boolean).join(' ')} style={style}>
        {children}
      </div>
    </>
  )
}

/** The common screen geometry: a big primary surface with a side column. */
export function SplitScreen({
  main,
  side,
  sideWidth = 320,
  bottom,
  minHeight,
}: {
  main: ReactNode
  side?: ReactNode
  sideWidth?: number
  bottom?: ReactNode
  minHeight?: number | string
}) {
  return (
    <>
      <div
        className={s.split}
        style={{ gridTemplateColumns: side ? `minmax(0,1fr) ${sideWidth}px` : 'minmax(0,1fr)', minHeight: minHeight ?? 0 }}
      >
        <div className={s.splitCol}>{main}</div>
        {side && <div className={s.splitCol}>{side}</div>}
      </div>
      {bottom}
    </>
  )
}
