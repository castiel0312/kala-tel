import { useMemo } from 'react'
import { ToastRail } from '../components/ToastRail'
import { TopNav } from './TopNav'
import { Hero } from './Hero'
import { Footer } from './Footer'
import { SectionBoundary } from './SectionBoundary'
import { NwisProvider } from './useNwis'
import { AlertsSection } from './sections/AlertsSection'
import { AnalyticsSection } from './sections/AnalyticsSection'
import { AssistantSection } from './sections/AssistantSection'
import { CorridorSection } from './sections/CorridorSection'
import { DocumentsSection } from './sections/DocumentsSection'
import { GraphSection } from './sections/GraphSection'
import { WellsCompareSection } from './sections/WellsCompareSection'
import { WellRiskSection } from './sections/WellRiskSection'
import { LiveSection } from './sections/LiveSection'
import { MapSection } from './sections/MapSection'
import { MemorySection } from './sections/MemorySection'
import { PotentialWellsSection } from './sections/PotentialWellsSection'
import { RiskSection } from './sections/RiskSection'
import { WellsSection } from './sections/WellsSection'
import s from './experience.module.css'

/**
 * NWIS, as one page.
 *
 * Fourteen sections on a single scrollport, joined by one shared selection: the well you click
 * on the map is the well the corridor draws, the graph centres on, the document opens, and the
 * assistant reasons about. No route change between any two of them, so looking at the next
 * thing never costs you the place you were.
 *
 * The three deep-dive routes still exist for the jobs that genuinely need their own URL — the
 * rig tablet, the side-by-side parameter comparison, and the full-screen verification
 * workspace — but nothing in the reading path navigates away.
 */
export default function NwisExperience() {
  const sections = useMemo(
    () =>
      (
        [
          ['01 · Overview', <Hero key="hero" />],
          ['02 · Live drilling', <LiveSection key="live" />],
          ['03 · Mapbox 3D map', <MapSection key="map" />],
          ['04 · Nearby wells', <WellsSection key="wells" />],
          ['05 · Depth corridor', <CorridorSection key="corridor" />],
          ['06 · Predictive risk', <RiskSection key="risk" />],
          ['07 · Live alerts', <AlertsSection key="alerts" />],
          ['08 · Knowledge repository', <MemorySection key="memory" />],
          ['09 · Knowledge graph', <GraphSection key="graph" />],
<<<<<<< Updated upstream
          ['10 · Document intelligence', <DocumentsSection key="documents" />],
          ['11 · Historical analytics', <AnalyticsSection key="analytics" />],
          ['12 · Assistant', <AssistantSection key="assistant" />],
          ['13 · Potential wells', <PotentialWellsSection key="potential" />],
=======
          ['10 · Well performance comparison', <WellsCompareSection key="wells-compare" />],
          ['11 · Well risk profile', <WellRiskSection key="well-risk" />],
          ['12 · Document intelligence', <DocumentsSection key="documents" />],
          ['13 · Historical analytics', <AnalyticsSection key="analytics" />],
          ['14 · Assistant', <AssistantSection key="assistant" />],
>>>>>>> Stashed changes
        ] as [string, JSX.Element][]
      ).map(([label, node]) => (
        <SectionBoundary key={label} label={label}>
          {node}
        </SectionBoundary>
      )),
    [],
  )

  return (
    <NwisProvider>
      <a className={s.skipLink} href="#overview">
        Skip to the operational content
      </a>
      <TopNav />
      <main className={s.main} id="main">
        {sections}
        <Footer />
      </main>
      <ToastRail />
    </NwisProvider>
  )
}
