import { Suspense, lazy } from 'react'
import { Section } from '../Section'
import { useNearViewport } from '../hooks'
import { SEC } from '../sections'

const sec = SEC.wellsCompare

/**
 * 10 · Well performance comparison.
 *
 * Cytoscape (Graph) sits above; the panel is data-heavy so it loads lazily:
 * the IntersectionObserver fires 600 px before it enters the viewport and
 * React.lazy fetches the chunk only then. The fallback reserves enough height
 * that the page doesn't jump when the panel arrives.
 */
const LazyPanel = lazy(() =>
  import('./wells-compare/WellComparePanel').then((m) => ({ default: m.WellComparePanel })),
)

export function WellsCompareSection() {
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
          <Suspense fallback={<div style={{ minHeight: 640 }} aria-hidden />}>
            <LazyPanel />
          </Suspense>
        ) : (
          <div style={{ minHeight: 640 }} aria-hidden />
        )}
      </div>
    </Section>
  )
}
