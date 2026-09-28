import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

export interface Toast {
  id: number
  /** `WATCH`/`ALARM` come from the live feed; `ACK`/`DONE` confirm a user action. */
  level: 'WATCH' | 'ALARM' | 'ACK' | 'DONE'
  metric: string
  text: string
}

interface ToastApi {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastApi>({ toasts: [], push: () => {}, dismiss: () => {} })

export function useToasts(): ToastApi {
  return useContext(ToastContext)
}

/** Live-feed toasts. The WebSocket hook pushes here when a metric changes state. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = nextId.current++
      setToasts((cur) => [...cur.slice(-2), { ...t, id }])
      window.setTimeout(() => dismiss(id), 6000)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss])
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}
