import type { IconName } from '../components/kit/icons'

/**
 * The information architecture, after the rewrite.
 *
 * There is one reading path — the continuous experience at `/` — and a small number of
 * workbenches that genuinely want their own URL and their own wide layout: the parameter
 * comparison, the whole-store graph, the verification workspace and the rig handset. The
 * rail and the command palette are the tools' chrome, so they list the experience plus the
 * tools, and nothing that no longer exists.
 */
export type NavKey = 'read' | 'compare' | 'graph' | 'docintel' | 'rig'

export interface NavItem {
  key: NavKey
  label: string
  short: string
  to: string
  icon: IconName
  section: string
  /** where to go back to when the item is the current route */
  back?: string
}

export interface NavGroup {
  title: string
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    title: 'The experience',
    items: [{ key: 'read', label: 'NWIS Experience', short: 'Read', to: '/', icon: 'command', section: 'The experience' }],
  },
  {
    title: 'Workbenches',
    items: [
      { key: 'compare', label: 'Parameter Compare', short: 'Compare', to: '/compare', icon: 'compare', section: 'Workbenches' },
      { key: 'graph', label: 'Whole-store Graph', short: 'Graph', to: '/graph', icon: 'graph', section: 'Workbenches' },
      {
        key: 'docintel',
        label: 'Verification Workspace',
        short: 'Verify',
        to: '/documents/W-067_WCR_2019.pdf/47',
        icon: 'docintel',
        section: 'Workbenches',
      },
    ],
  },
  {
    title: 'Field',
    items: [{ key: 'rig', label: 'Rig-site Handset', short: 'Rig', to: '/rig', icon: 'mobile', section: 'Field' }],
  },
]

export const NAV_ITEMS: NavItem[] = NAV.flatMap((g) => g.items)

export const ITEM_BY_KEY = Object.fromEntries(NAV_ITEMS.map((i) => [i.key, i])) as Record<NavKey, NavItem>

/** Which nav entry should read as active for a given pathname. */
export function navKeyForPath(pathname: string): NavKey {
  if (pathname.startsWith('/compare')) return 'compare'
  if (pathname.startsWith('/graph')) return 'graph'
  // a document route is the verification workspace
  if (/^\/documents\/.+/.test(pathname)) return 'docintel'
  if (pathname.startsWith('/rig')) return 'rig'
  return 'read'
}

/** Every route the command palette can jump to. Deep links carry the section hash. */
export const COMMAND_ROUTES: { to: string; label: string; hint: string; icon: IconName }[] = [
  { to: '/', label: 'NWIS Experience', hint: 'The whole operation on one page', icon: 'command' },
  { to: '/#live', label: 'Live drilling', hint: 'Bit, ROP, torque, mud weight', icon: 'command' },
  { to: '/#map', label: '3D offset map', hint: 'Mapbox terrain, wells, tracks', icon: 'pin' },
  { to: '/#wells', label: 'Nearby wells', hint: 'Similarity, distance, events', icon: 'nearby' },
  { to: '/#corridor', label: 'Depth corridor', hint: 'Side-by-side bores, look-ahead', icon: 'well' },
  { to: '/#risk', label: 'Predictive risk', hint: 'Dominant risk, reasons, evidence', icon: 'risk' },
  { to: '/#alerts', label: 'Live alerts', hint: 'Open, acknowledge, escalate', icon: 'alerts' },
  { to: '/#memory', label: 'Knowledge repository', hint: 'Search 4,812 extracted events', icon: 'knowledge' },
  { to: '/#documents', label: 'Document intelligence', hint: 'Extraction, fields, review', icon: 'documents' },
  { to: '/#analytics', label: 'Historical analytics', hint: 'ROP, ECD, loss frequency', icon: 'analytics' },
  { to: '/#assistant', label: 'Grounded assistant', hint: 'Ask with evidence', icon: 'assistant' },
  { to: '/compare', label: 'Parameter Compare', hint: 'Engineering parameter diff', icon: 'compare' },
  { to: '/graph', label: 'Whole-store Graph', hint: 'Wells, formations, events, documents', icon: 'graph' },
  {
    to: '/documents/W-067_WCR_2019.pdf/47',
    label: 'Verification Workspace',
    hint: 'Extraction on W-067 WCR p.47',
    icon: 'docintel',
  },
  { to: '/rig', label: 'Rig-site Handset', hint: 'Field layout', icon: 'mobile' },
]
