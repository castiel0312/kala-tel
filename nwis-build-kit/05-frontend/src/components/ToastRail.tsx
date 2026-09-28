import { useToasts } from './ToastProvider'
import styles from './ToastRail.module.css'

/** Bottom-right stack of live-feed notifications. Announced politely to screen readers. */
export function ToastRail() {
  const { toasts, dismiss } = useToasts()
  if (!toasts.length) return null

  return (
    <div className={styles.rail} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={[styles.toast, t.level === 'ALARM' && styles.toastAlarm, (t.level === 'ACK' || t.level === 'DONE') && styles.toastOk].filter(Boolean).join(' ')}>
          <div className={styles.body}>
            <div
              className={[
                styles.metric,
                t.level === 'ALARM' && styles.alarmMetric,
                (t.level === 'ACK' || t.level === 'DONE') && styles.okMetric,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {t.level} · {t.metric}
            </div>
            <div className={styles.text}>{t.text}</div>
          </div>
          <button type="button" className={styles.close} onClick={() => dismiss(t.id)} aria-label={`Dismiss ${t.metric} alert`}>
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
