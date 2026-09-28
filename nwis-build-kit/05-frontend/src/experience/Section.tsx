import { type ReactNode } from 'react'
import { useReveal } from './hooks'
import s from './section.module.css'

/**
 * The section shell. Every section on the page uses it, which is what keeps thirteen very
 * different pieces of content on one typographic spine: one eyebrow, one rule, one title
 * scale, one lede width. The title carries `tabIndex={-1}` so an in-page jump moves the
 * keyboard to the section the reader asked for.
 */
export function Section({
  id,
  no,
  eyebrow,
  title,
  lede,
  tone = 'paper',
  children,
  actions,
  bleed,
}: {
  id: string
  no: string
  eyebrow: string
  title: string
  lede?: string
  tone?: 'paper' | 'white' | 'black'
  children: ReactNode
  actions?: ReactNode
  /** Full-bleed content (the map), inside the padded shell. */
  bleed?: boolean
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={[s.section, s[`section--${tone}`], bleed && s.sectionBleed].filter(Boolean).join(' ')}
    >
      <header className={s.head}>
        <div className={s.headText}>
          <div className={s.eyebrow}>
            <span className={s.eyebrowNo}>{no}</span>
            <span>{eyebrow}</span>
          </div>
          <h2 className={s.title} id={`${id}-title`} tabIndex={-1} data-section-focus>
            {title}
          </h2>
          {lede && <p className={s.lede}>{lede}</p>}
        </div>
        {actions && <div className={s.headActions}>{actions}</div>}
      </header>
      <Reveal>{children}</Reveal>
    </section>
  )
}

/**
 * Reveal wrapper. The rule: enter from below by 18px over 520ms, once, and only if the
 * reader has not asked for reduced motion — which the global motion rule already enforces,
 * so this only has to decide when the class flips.
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={[s.reveal, shown && s.revealShown, className].filter(Boolean).join(' ')}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

/** A labelled figure: one dominant mark, a caption, and a stated unit. */
export function Figure({
  label,
  value,
  unit,
  note,
  tone,
}: {
  label: string
  value: ReactNode
  unit?: string
  note?: ReactNode
  tone?: 'ink' | 'signal' | 'danger'
}) {
  return (
    <figure className={[s.figure, tone === 'signal' && s.figureSignal, tone === 'danger' && s.figureDanger].filter(Boolean).join(' ')}>
      <figcaption className="label">{label}</figcaption>
      <p className={[s.figureValue, 'display'].join(' ')}>
        {value}
        {unit && <span className={s.figureUnit}>{unit}</span>}
      </p>
      {note && <p className={s.figureNote}>{note}</p>}
    </figure>
  )
}

/** Where a number came from. Every figure that touches the API carries one of these. */
export function Source({ children, kind = 'API' }: { children: ReactNode; kind?: string }) {
  return (
    <p className={s.source}>
      <span className={s.sourceKind}>{kind}</span>
      {children}
    </p>
  )
}
