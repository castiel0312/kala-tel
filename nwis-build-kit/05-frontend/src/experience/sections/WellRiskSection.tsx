import { Suspense, lazy } from 'react'
import { Section } from '../Section'
import { useNearViewport } from '../hooks'
import { SEC } from '../sections'

const sec = SEC.wellRisk

/**
 * 11 · Well risk profile.
 *
 * The panel is compute-heavy (500-bin downsampling + smoothed risk profile)
 * so it loads lazily: the IntersectionObserver fires 600 px before the section
 * enters the viewport and React.lazy fetches the chunk only then. The fallback
 * reserves the panel's approximate final height so the page doesn't jump.
 */
const LazyPanel = lazy(() =>
  import('./well-risk/WellRiskPanel').then((m) => ({ default: m.WellRiskPanel })),
)

export function WellRiskSection() {
  const { ref, near } = useNearViewport<HTMLDivElement>()

  return (
    <Section
      id={sec.id}
      no={sec.no}
      eyebrow={sec.eyebrow}
      title={sec.title}
      lede={sec.lede}
      tone={sec.tone}
    >
      <div ref={ref}>
        {near ? (
          <Suspense fallback={<div style={{ minHeight: 720 }} aria-hidden />}>
            <LazyPanel />
          </Suspense>
        ) : (
          <div style={{ minHeight: 720 }} aria-hidden />
        )}
      </div>
    </Section>
  )
}
