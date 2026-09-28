import { useSyncExternalStore } from 'react'
import { basemapChoice, basemapId, subscribeBasemap, type BasemapChoice } from './basemap'

/**
 * The basemap the map is actually using.
 *
 * A hook rather than an import because the answer can change after the first render: a configured
 * Mapbox token is checked against the network once, and if it is refused the open basemap takes
 * over. A component that read `MAP_STYLE` once at module scope would be holding a style the map
 * has already given up on, and would keep asking Mapbox for a basemap nobody is drawing.
 */
export function useBasemapChoice(): BasemapChoice {
  return useSyncExternalStore(subscribeBasemap, basemapChoice, basemapChoice)
}

/** Which of the pair the reader asked for. Written by the control, read by the map. */
export function useBasemapId(): 'satellite' | 'streets' {
  return useSyncExternalStore(subscribeBasemap, basemapId, basemapId)
}
