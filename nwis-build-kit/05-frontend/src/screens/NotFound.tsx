import { Link } from 'react-router-dom'
import { Screen } from '../components/Screen'
import { Panel } from '../components/kit'
import { Icon } from '../components/kit/icons'
import s from './NotFound.module.css'

/* ============================================================================
   Not Found. Most old routes are not 404s any more — they are sections of the
   experience — so this page says which section took over, and lists the
   workbenches that really do have their own URL.
   ========================================================================== */

const INSTEAD = [
  { to: '/', k: '01', label: 'The experience, from the top' },
  { to: '/#live', k: '02', label: 'Live drilling snapshot' },
  { to: '/#map', k: '03', label: '3D offset map' },
  { to: '/#wells', k: '04', label: 'Nearby wells' },
  { to: '/#corridor', k: '05', label: 'Depth corridor' },
  { to: '/#risk', k: '06', label: 'Predictive risk' },
  { to: '/#alerts', k: '07', label: 'Live alerts' },
  { to: '/#memory', k: '08', label: 'Knowledge repository' },
  { to: '/#graph', k: '09', label: 'Knowledge graph' },
  { to: '/#documents', k: '10', label: 'Document intelligence' },
  { to: '/#analytics', k: '11', label: 'Historical analytics' },
  { to: '/#assistant', k: '12', label: 'Grounded assistant' },
]

const WORKBENCHES = [
  { to: '/compare', k: 'W1', label: 'Parameter compare' },
  { to: '/graph', k: 'W2', label: 'Whole-store graph' },
  { to: '/documents/W-067_WCR_2019.pdf/47', k: 'W3', label: 'Verification workspace' },
  { to: '/rig', k: 'W4', label: 'Rig-site handset' },
]

export function NotFound() {
  return (
    <Screen num="—" section="Not found" title="That route is a section now" sub="NWIS is one continuous page; the old per-screen routes were folded into it.">
      <div className={s.body}>
        <Panel title="Read it as a section" tone="black" signal="ok" flush>
          <div className={s.routes}>
            {INSTEAD.map((r) => (
              <Link className={s.route} to={r.to} key={r.to}>
                <span className={s.routeK}>{r.k}</span>
                <span className={s.routeL}>{r.label}</span>
                <Icon name="arrowRight" size={12} />
              </Link>
            ))}
          </div>
        </Panel>
        <Panel title="Workbenches that keep their own URL" tone="paper" flush>
          <div className={s.routes}>
            {WORKBENCHES.map((r) => (
              <Link className={s.route} to={r.to} key={r.to}>
                <span className={s.routeK}>{r.k}</span>
                <span className={s.routeL}>{r.label}</span>
                <Icon name="arrowRight" size={12} />
              </Link>
            ))}
          </div>
        </Panel>
        <div className={s.note}>
          <p>
            If a link inside the platform sent you here, the route it points at is wrong rather than the data. The
            experience at <span className="mono">/</span> is the fastest way back to the active well.
          </p>
        </div>
      </div>
    </Screen>
  )
}
