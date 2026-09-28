import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { COMMAND_ROUTES } from '../lib/nav'
import { Icon } from './kit/icons'
import s from './shell.module.css'

/**
 * Global command palette. ⌘K / Ctrl-K from anywhere. Routes, wells, and the
 * questions the assistant already knows how to answer.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)
  const navigate = useNavigate()
  const listRef = useRef<HTMLDivElement>(null)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const base = COMMAND_ROUTES.map((r) => ({ ...r, group: 'Navigate' }))
    const wells = [
      { to: '/nearby?well=W-067', label: 'W-067', hint: '87% similar · 1.2 km · HIGH risk', icon: 'nearby' as const, group: 'Well' },
      { to: '/nearby?well=W-088', label: 'W-088', hint: 'Offset · 2.4 km', icon: 'nearby' as const, group: 'Well' },
      { to: '/compare/W-067', label: 'Compare with W-067', hint: 'Engineering parameter diff', icon: 'compare' as const, group: 'Well' },
      { to: '/documents/W-067_WCR_2019.pdf/47', label: 'W-067 WCR 2019 · p.47', hint: 'Mud loss 45 bbl/h', icon: 'file' as const, group: 'Well' },
    ]
    const all = [...base, ...wells]
    if (!needle) return all
    return all.filter(
      (r) => r.label.toLowerCase().includes(needle) || r.hint.toLowerCase().includes(needle) || r.to.includes(needle),
    )
  }, [q])

  useEffect(() => {
    if (open) {
      setQ('')
      setCursor(0)
    }
  }, [open])

  useEffect(() => {
    setCursor(0)
  }, [q])

  if (!open) return null

  function go(to: string) {
    onClose()
    navigate(to)
  }

  return createPortal(
    <div className={s.paletteWrap} onClick={onClose} role="presentation">
      <div
        className={s.palette}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setCursor((c) => Math.min(c + 1, rows.length - 1))
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setCursor((c) => Math.max(c - 1, 0))
          }
          if (e.key === 'Enter' && rows[cursor]) {
            e.preventDefault()
            go(rows[cursor].to)
          }
        }}
      >
        <div className={s.paletteInput}>
          <Icon name="search" size={17} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Go to a screen, a well, a document…"
            aria-label="Search"
            autoFocus
          />
          <span className={s.paletteRow__hint}>{rows.length} results</span>
        </div>
        <div className={s.paletteList} ref={listRef}>
          {rows.map((r, i) => (
            <button
              key={`${r.to}-${i}`}
              type="button"
              className={s.paletteRow}
              data-on={i === cursor}
              onMouseEnter={() => setCursor(i)}
              onClick={() => go(r.to)}
            >
              <Icon name={r.icon} size={15} />
              <span className={s.paletteRow__label}>{r.label}</span>
              <span className={s.paletteRow__hint}>{r.hint}</span>
            </button>
          ))}
          {!rows.length && (
            <div style={{ padding: '14px 12px', fontSize: 'var(--nw-fs-sm)', color: 'var(--nw-text-3)' }}>
              No screen or well matches “{q}”. Try <b>risk</b>, <b>W-067</b> or <b>documents</b>.
            </div>
          )}
        </div>
        <div className={s.paletteFoot}>
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
          <span style={{ marginLeft: 'auto' }}>NWIS command search</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
