import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { qk } from '../api/client'
import type { LiveSnapshot } from '../api/types'
import { useToasts } from '../components/ToastProvider'

export type LiveStatus = 'connecting' | 'open' | 'closed'

export interface UseLiveResult {
  status: LiveStatus
  lastFrame: LiveSnapshot | null
}

/**
 * Subscribes to `GET /ws/wells/{id}/live` and writes each snapshot into the query cache,
 * so any screen showing live numbers re-renders without polling.
 *
 * When a metric changes state (NORMAL → WATCH or ALARM) it raises a toast. Transitions are
 * tracked in a ref so a metric that simply stays in WATCH does not toast on every 2 s frame.
 */
export function useLive(wellId: string | undefined, enabled = true): UseLiveResult {
  const queryClient = useQueryClient()
  const { push } = useToasts()
  const [status, setStatus] = useState<LiveStatus>('connecting')
  const [lastFrame, setLastFrame] = useState<LiveSnapshot | null>(null)
  const previous = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    if (!wellId || !enabled) return
    let socket: WebSocket | null = null
    let retry: number | undefined
    let closed = false
    let attempt = 0

    const connect = () => {
      if (closed) return
      setStatus('connecting')
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      socket = new WebSocket(`${proto}://${window.location.host}/ws/wells/${wellId}/live`)

      socket.onopen = () => {
        attempt = 0
        setStatus('open')
      }

      socket.onmessage = (ev) => {
        let snap: LiveSnapshot
        try {
          const parsed = JSON.parse(ev.data as string) as { type?: string; data?: LiveSnapshot }
          if (parsed.type !== 'live' || !parsed.data) return
          snap = parsed.data
        } catch {
          return
        }

        for (const m of snap.primary) {
          const state = m.status ?? 'NORMAL'
          const before = previous.current.get(m.key)
          if (before !== undefined && before === 'NORMAL' && (state === 'WATCH' || state === 'ALARM')) {
            push({
              level: state === 'ALARM' ? 'ALARM' : 'WATCH',
              metric: m.label,
              text: `${m.label} ${m.value} ${m.unit}${m.note ? ` · ${m.note}` : ''}`,
            })
          }
          previous.current.set(m.key, state)
        }

        setLastFrame(snap)
        queryClient.setQueryData(qk.live(wellId), snap)
        // Keep the dashboard's embedded snapshot in step, so a page that only reads
        // /dashboard still shows live numbers.
        queryClient.setQueryData<{ live: LiveSnapshot }>(qk.dashboard(wellId), (old) =>
          old ? { ...old, live: snap } : old,
        )
      }

      socket.onclose = () => {
        setStatus('closed')
        if (closed) return
        // Back off, but stay responsive: the demo server may just be restarting.
        attempt += 1
        retry = window.setTimeout(connect, Math.min(8000, 500 * 2 ** attempt))
      }

      socket.onerror = () => socket?.close()
    }

    connect()
    return () => {
      closed = true
      if (retry) window.clearTimeout(retry)
      socket?.close()
    }
  }, [wellId, enabled, push, queryClient])

  return { status, lastFrame }
}
