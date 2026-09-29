import type { CSSProperties, ReactNode } from 'react'
import type { WellCompareSummary } from './useWellCompareData'
import { wellLabel } from './chartUtils'
import s from './WellsCompare.module.css'

type CssVars = CSSProperties & { [key: `--${string}`]: string | number }

export function DashboardLegend({
  wells,
  colorFor,
  visibility,
  onToggle,
}: {
  wells: WellCompareSummary[]
  colorFor: (wellId: string) => string
  visibility: Record<string, boolean>
  onToggle: (wellId: string) => void
}) {
  return (
    <div className={s.legend}>
      {wells.map((item) => (
        <button
          className={visibility[item.well.well_id] === false ? `${s.legendItem} ${s.legendHidden}` : s.legendItem}
          key={item.well.well_id}
          onClick={() => onToggle(item.well.well_id)}
          type='button'
        >
          <i style={{ '--wcp-color': colorFor(item.well.well_id) } as CssVars} aria-hidden />
          {wellLabel(item)}
        </button>
      ))}
    </div>
  )
}

export function DashboardPanelHeading({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className={s.panelHeading}>
      <h3>{title}</h3>
      {detail && <span>{detail}</span>}
    </div>
  )
}

export function EmptyChart({ text }: { text: string }) {
  return <div className={s.emptyPanel}>{text}</div>
}

export function ChartTooltip({ children }: { children: ReactNode }) {
  return <div className={s.tooltip}>{children}</div>
}
