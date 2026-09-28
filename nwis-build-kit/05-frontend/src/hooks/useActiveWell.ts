import { useQuery } from '@tanstack/react-query'
import { api, qk } from '../api/client'

/**
 * The well the whole app is about. `wells/active` is the contract for the sidebar card,
 * the header chip and the hero blocks, so it is fetched once here and shared by the shell.
 */
export function useActiveWell() {
  return useQuery({
    queryKey: qk.activeWell,
    queryFn: api.activeWell,
    // The active well only changes when the demo is reset or a new well is picked.
    staleTime: 60_000,
  })
}

/** The active well id, or undefined while loading — screens should stay renderable without it. */
export function useWellId(): string | undefined {
  return useActiveWell().data?.id
}
