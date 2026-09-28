import { useSyncExternalStore } from 'react'

/**
 * One ground line for the whole hero.
 *
 * The section measures the band between its own top edge and the ground line, because the ground
 * the machine stands on recedes *away* from the cut and receding goes up. The stage above needs
 * the same number: the rig's feet have to stand on that line, not on the edge of the stage's own
 * box, and the frame the model arrives in has to be cut along it.
 *
 * Two elements, one measurement. The section owns the measurement and publishes it here, as a
 * store the stage subscribes to and as a custom property for the things CSS positions, so
 * neither of them measures the line again and neither can be a frame out of date with the other.
 */

let groundPx = 0
const listeners = new Set<() => void>()

/** Called by the section with the band it measured, in px. */
export function publishGroundLine(px: number): void {
  if (!Number.isFinite(px) || Math.abs(px - groundPx) < 0.25) return
  groundPx = px
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The measured distance from the top of the section to the ground line. */
export function useGroundLine(): number {
  return useSyncExternalStore(subscribe, () => groundPx, () => 0)
}
