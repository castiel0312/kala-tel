import { Suspense, lazy } from 'react'
import { Skel } from '../kit/primitives'

/**
 * Mapbox GL JS and deck.gl are the two largest dependencies in the product and only three routes
 * draw a map, so the map surface is fetched on demand and held by a frame of the same size while it
 * loads.
 */
const MapCanvas = lazy(() => import('./MapCanvas').then((m) => ({ default: m.MapCanvas })))

type MapCanvasProps = React.ComponentProps<typeof import('./MapCanvas').MapCanvas>

export function LazyMapCanvas(props: MapCanvasProps) {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, height: '100%' }}>
          <Skel h={12} w="42%" />
          <Skel h={12} w="28%" />
          <Skel h={12} w="35%" />
        </div>
      }
    >
      <MapCanvas {...props} />
    </Suspense>
  )
}
