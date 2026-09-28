import { Suspense, lazy, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/ToastProvider'
import { AppShell } from './components/AppShell'
import { ScreenFallback } from './components/ScreenFallback'
import NwisExperience from './experience/NwisExperience'
import { WellCompare } from './screens/WellCompare'
import { RigMobile } from './screens/RigMobile'
import { NotFound } from './screens/NotFound'

/**
 * Two kinds of surface, and only two.
 *
 * The reading path is the experience at `/`: one page, one scrollport, no route change between
 * any two sections. It is imported eagerly because the sections keep their own heavy
 * dependencies behind `lazy` — Mapbox and deck.gl, cytoscape and pdf.js each mount only when
 * their section comes near the viewport, so the first paint needs none of them.
 *
 * The workbenches are the jobs that want a wide, keyboard-driven layout and a URL worth sending
 * to somebody: a parameter diff, the whole-store graph, the verification workspace. They keep
 * the operation bar and the rail, and the rail now lists the experience plus the workbenches.
 * The rig handset is a separate client with neither.
 */
const KnowledgeGraph = lazy(() => import('./screens/KnowledgeGraph').then((m) => ({ default: m.KnowledgeGraph })))
const DocumentIntel = lazy(() => import('./screens/DocumentIntel').then((m) => ({ default: m.DocumentIntel })))

/** One boundary for a whole screen, holding the workbench's own geometry while the route arrives. */
function LazyRoute({ label, children }: { label: string; children: React.ReactNode }) {
  return <Suspense fallback={<ScreenFallback label={label} />}>{children}</Suspense>
}

/** The experience owns the document title; the shell sets its own for the routes under it. */
function ExperienceRoute() {
  useEffect(() => {
    document.title = 'NWIS · Integrated Well Intelligence'
  }, [])
  return <NwisExperience />
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* The reading path, and the rig handset: no rail, no operation bar. */}
        <Route path="/" element={<ExperienceRoute />} />
        <Route path="/rig" element={<RigMobile />} />
        <Route element={<AppShell />}>
          <Route path="/compare" element={<WellCompare />} />
          <Route path="/compare/:offsetId" element={<WellCompare />} />
          <Route
            path="/graph"
            element={
              <LazyRoute label="Building the neighbourhood graph">
                <KnowledgeGraph />
              </LazyRoute>
            }
          />
          <Route
            path="/documents/:docId"
            element={
              <LazyRoute label="Opening the report">
                <DocumentIntel />
              </LazyRoute>
            }
          />
          <Route
            path="/documents/:docId/:page"
            element={
              <LazyRoute label="Opening the report">
                <DocumentIntel />
              </LazyRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}
