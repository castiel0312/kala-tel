import { useMemo, useState, type ReactNode } from 'react'
import s from './kit.module.css'
import { EmptyState } from './primitives'

/* ============================================================================
   Engineering tables. Real <table> semantics, sticky black head, mono cells,
   row selection with a yellow signal bar. No card chrome.
   ========================================================================== */

export interface Column<T> {
  key: string
  header: ReactNode
  /** right-aligned mono numeric column */
  num?: boolean
  width?: number | string
  cell: (row: T) => ReactNode
  /** plain-string value used for sorting; omit to make the column unsortable */
  sortValue?: (row: T) => string | number
  title?: string
  dim?: boolean
  id?: boolean
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  selectedKey,
  onSelect,
  onRowClick,
  caption,
  dense,
  emptyTitle,
  emptyBody,
  emptyActions,
  maxHeight,
  sort,
}: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  selectedKey?: string | null
  onSelect?: (row: T) => void
  onRowClick?: (row: T) => void
  caption?: ReactNode
  dense?: boolean
  emptyTitle?: string
  emptyBody?: string
  emptyActions?: ReactNode
  maxHeight?: number | string
  sort?: { key: string; dir: 'asc' | 'desc' } | null
}) {
  const [localSort, setLocalSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(sort ?? null)
  const activeSort = sort !== undefined ? sort : localSort

  const sorted = useMemo(() => {
    if (!activeSort) return rows
    const col = columns.find((c) => c.key === activeSort.key)
    if (!col?.sortValue) return rows
    const dir = activeSort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a)
      const bv = col.sortValue!(b)
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [rows, activeSort, columns])

  function toggleSort(key: string) {
    setLocalSort((prev) => {
      const p = prev ?? (sort === undefined ? null : sort)
      if (!p || p.key !== key) return { key, dir: 'desc' }
      if (p.dir === 'desc') return { key, dir: 'asc' }
      return null
    })
  }

  if (!rows.length) {
    return (
      <div style={{ padding: 'var(--nw-s3)' }}>
        <EmptyState title={emptyTitle ?? 'No data for current filter'} body={emptyBody} actions={emptyActions} />
      </div>
    )
  }

  return (
    <>
      <div className={s.tblWrap} style={{ maxHeight }}>
        <table className={[s.tbl, onRowClick && s['tbl--rowButton'], dense && s['tbl--dense']].filter(Boolean).join(' ')}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={[c.num && 'num', c.sortValue && 'sortable'].filter(Boolean).join(' ')}
                  style={{ width: c.width, textAlign: c.num ? 'right' : 'left' }}
                  title={c.title}
                  aria-sort={
                    activeSort?.key === c.key ? (activeSort.dir === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                  onClick={c.sortValue ? () => toggleSort(c.key) : undefined}
                >
                  {c.header}
                  {activeSort?.key === c.key && (activeSort.dir === 'asc' ? ' ▲' : ' ▼')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const k = rowKey(row)
              return (
                <tr
                  key={k}
                  aria-selected={selectedKey === k}
                  tabIndex={onRowClick || onSelect ? 0 : undefined}
                  onClick={() => (onRowClick ?? onSelect)?.(row)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      ;(onRowClick ?? onSelect)?.(row)
                    }
                  }}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={[c.num && 'num', c.id && 'id', c.dim && 'dim'].filter(Boolean).join(' ')}
                      style={{ textAlign: c.num ? 'right' : 'left' }}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {caption && <div className={s.tblCaption}>{caption}</div>}
    </>
  )
}

/* ---------------------------------------------------- key/value register -- */

export function EngineeringTable({
  rows,
  onBlack,
}: {
  rows: { k: ReactNode; v: ReactNode }[]
  onBlack?: boolean
}) {
  return (
    <table className={[s.eng, onBlack && s['eng--onBlack']].filter(Boolean).join(' ')}>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <th scope="row">{r.k}</th>
            <td>{r.v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
