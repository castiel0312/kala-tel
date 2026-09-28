import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopOperationBar } from './TopOperationBar'
import { CommandPalette } from './CommandPalette'
import { useIsDesktop } from '../hooks/useViewport'
import s from './shell.module.css'

/**
 * App shell: operation bar on top, navigation rail on the left, page content
 * in the middle. The rail collapses to icons below 1200px and disappears below
 * 768px, where the rig layout takes over.
 */
export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const isDesktop = useIsDesktop()
  const { pathname } = useLocation()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.title = `NWIS · ${pathname === '/' ? 'Home' : pathname.split('/')[1] ?? ''}`.toUpperCase()
  }, [pathname])

  return (
    <div className={s.shell}>
      <TopOperationBar onOpenPalette={() => setPaletteOpen(true)} />
      <div className={s.shellBody}>
        <Sidebar collapsed={!isDesktop} />
        <main className={s.workspace} id="main">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
