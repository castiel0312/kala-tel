import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, qk } from '../api/client'
import { useActiveWell } from '../hooks/useActiveWell'
import { useLive } from '../hooks/useLive'
import { Screen } from '../components/Screen'
import { HeaderTools } from '../components/PageHeader'
import { Button, Chip, LiveIndicator, Panel, ProvenanceTag, RiskChip, Skel, TrendChart } from '../components/kit'
import { Icon } from '../components/kit/icons'
import { fmtInt } from '../lib/format'
import s from './RigMobile.module.css'

/* ============================================================================
   Rig Mobile — screen 13.

   The rig-floor view: one column, big numbers, and only what a person standing
   at the driller's console can act on. Depth, the open alert, four tiles with
   their own limits, and the mitigations that already worked on an offset. Every
   other idea is a link to a desktop screen rather than a control, because a
   phone at the sh floor is a readout, not a workstation.
   ========================================================================== */

export function RigMobile() {
  const { data: well, isError, refetch } = useActiveWell()
  const wellId = well?.id ?? 'OIL-WELL-104'
  const live = useLive(well?.id, Boolean(well?.id))

  const alerts = useQuery({
    queryKey: qk.alerts(wellId, 'open'),
    queryFn: () => api.alerts(wellId, 'open'),
    enabled: Boolean(well?.id),
    refetchInterval: 30_000,
  })

  const risks = useQuery({
    queryKey: qk.risks(wellId),
    queryFn: () => api.risks(wellId),
    enabled: Boolean(well?.id),
    staleTime: 30_000,
  })

  const checklist = useQuery({ queryKey: qk.checklist, queryFn: api.checklist, staleTime: 120_000 })

  const frame = live.lastFrame
  const metric = (key: string) => frame?.primary.find((m) => m.key === key)
  const more = (key: string) => frame?.more.find((m) => m.key === key)
  const spark = (key: string) => {
    const s = frame?.sparklines12pt?.[key]
    return Array.isArray(s) ? s : []
  }

  const topRisk = (risks.data?.risks ?? []).find((r) => r.level === 'HIGH') ?? (risks.data?.risks ?? [])[0]
  const openAlert = (alerts.data?.alerts ?? [])[0]
  const next = risks.data?.nextZone
  const done = (checklist.data ?? []).filter((i) => i.done).length
  const td = well?.formationTopsTvdssM ? Object.keys(well.formationTopsTvdssM).length : 0

  if (isError) {
    return (
      <Screen num="13" section="Rig floor" title="Rig Floor" sub="The driller's view.">
        <Panel title="Offline">
          <p style={{ fontSize: 12, margin: 0 }}>The rig feed is not reachable.</p>
          <div style={{ marginTop: 8 }}>
            <Button size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        </Panel>
      </Screen>
    )
  }

  return (
    <Screen
      num="13"
      section="Rig floor"
      title="Rig Floor"
      signal={Boolean(openAlert)}
      sub={next ? `Next ${next.text} · ${fmtInt(next.metresAhead)} m ahead of the bit` : "The driller's view"}
      aside={
        <HeaderTools>
          <ProvenanceTag kind="LIVE" label="eRTMAC" />
          <LiveIndicator state={live.status === 'open' ? 'live' : live.status === 'connecting' ? 'warn' : 'off'} label={live.status} />
        </HeaderTools>
      }
    >
      <div className={s.body}>
        <div className={s.depth}>
          <div className={s.depthK}>Depth</div>
          <div className={s.depthV}>
            {well ? fmtInt(well.bit.mdM) : '—'}
            <span className={s.depthU}>m MD</span>
          </div>
          <div className={s.depthFoot}>
            <span className="mono">{well ? fmtInt(well.bit.tvdssM) : '—'} m TVDSS</span>
            <span className="mono">{well ? fmtInt(well.bit.mdMinusTvdssM) : '—'} m of inclination build</span>
            <span className="mono">
              {well?.currentFormation} · {well?.holeSection}
            </span>
          </div>
          <div className={s.depthBar}>
            <i style={{ width: `${Math.min(100, ((well?.bit.mdM ?? 0) / 3420) * 100)}%` }} />
            <span>{next ? `+${fmtInt(next.metresAhead)} m to the next top` : `${td} formations in the model`}</span>
          </div>
        </div>

        {openAlert ? (
          <Link className={s.alertCard} to="/#alerts">
            <span className={s.alertBar} data-sev={openAlert.severity} />
            <span className={s.alertBody}>
              <span className={s.alertK}>
                {openAlert.severity} · {openAlert.id} · {openAlert.time}
              </span>
              <span className={s.alertT}>{openAlert.title}</span>
              <span className={s.alertSub}>{openAlert.subtitle}</span>
            </span>
            <Icon name="arrowRight" size={16} />
          </Link>
        ) : (
          <div className={s.clearCard}>
            <Icon name="check" size={18} />
            <span>No open alerts. Feed is {live.status}.</span>
          </div>
        )}

        <div className={s.tiles}>
          <Tile label="ROP" unit="m/h" m={metric('rop')} spark={spark('rop')} />
          <Tile label="ECD" unit="g/cm³" m={metric('ecd')} spark={spark('ecd')} />
          <Tile label="Torque" unit="kN·m" m={metric('torque')} spark={spark('torque')} />
          <Tile label="SPP" unit="psi" m={more('spp')} spark={spark('spp')} />
          <Tile label="Flow out" unit="bbl/min" m={more('flowOut')} spark={spark('flowOut')} />
          <Tile label="Mud weight" unit="g/cm³" m={more('mudWeight')} spark={spark('mudWeight')} />
        </div>

        {topRisk && (
          <Link className={s.riskCard} to={`/risk/${topRisk.id}`}>
            <div className={s.riskTop}>
              <RiskChip level={topRisk.level} probability={topRisk.probability} />
              <span className={s.riskName}>{topRisk.name}</span>
              <span className="mono">
                {fmtInt(topRisk.windowMdM[0])}–{fmtInt(topRisk.windowMdM[1])} m
              </span>
            </div>
            <p className={s.riskWhy}>{topRisk.evidenceSummary}</p>
          </Link>
        )}

        <Panel title="Pre-spotted mitigations" tone="black" signal={topRisk ? 'signal' : undefined} meta={<span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-ink-3)' }}>from the offsets</span>}>
          <div className={s.mits}>
            <MitigationRow riskId="mud_loss" wellId={wellId} />
            <MitigationRow riskId="stuck_pipe" wellId={wellId} />
          </div>
        </Panel>

        <Panel
          title="Checklist"
          tone="paper"
          meta={
            <span className="mono" style={{ fontSize: 9.5, color: 'var(--nw-text-4)' }}>
              {done}/{(checklist.data ?? []).length} done
            </span>
          }
        >
          {checklist.isLoading ? (
            <Skel h={80} />
          ) : (
            <ul className={s.checks}>
              {(checklist.data ?? []).map((c) => (
                <li className={c.done ? s.checkDone : undefined} key={c.id}>
                  <span className={s.checkBox}>{c.done ? <Icon name="check" size={11} /> : ''}</span>
                  <span className={s.checkT}>{c.text}</span>
                  <span className={s.checkS}>{c.sub}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className={s.links}>
          <Link to="/">The experience</Link>
          <Link to="/#corridor">Depth corridor</Link>
          <Link to="/#wells">Nearby wells</Link>
          <Link to="/#assistant">Ask the assistant</Link>
        </div>
      </div>
    </Screen>
  )
}

function Tile({
  label,
  unit,
  m,
  spark,
}: {
  label: string
  unit: string
  m?: { value: number; note?: string; status?: string; limit?: number }
  spark: number[]
}) {
  const warn = m?.status === 'WATCH' || m?.status === 'ALARM'
  return (
    <div className={[s.tile, warn ? s['tile--warn'] : ''].filter(Boolean).join(' ')}>
      <span className={s.tileK}>{label}</span>
      <span className={s.tileV}>{m ? readout(m.value) : '—'}</span>
      <span className={s.tileU}>{unit}</span>
      {spark.length > 2 && (
        <TrendChart
          height={40}
          series={[{ key: label, label, color: warn ? 'var(--nw-yellow)' : 'var(--nw-ink-2)', points: spark, width: 1.4, area: true }]}
          showLegend={false}
          ariaLabel={`${label} trend`}
        />
      )}
      <span className={s.tileF}>{m?.note ?? '—'}</span>
    </div>
  )
}

/**
 * A rig readout is read at arm's length, so precision follows magnitude: pressures and depths are
 * whole numbers, mud weights and ECDs keep two decimals, and nothing shows three.
 */
function readout(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 100) return fmtInt(Math.round(n))
  if (abs >= 10) return n.toFixed(1)
  return n.toFixed(2)
}

function MitigationRow({ riskId, wellId }: { riskId: string; wellId: string }) {
  const q = useQuery({
    queryKey: qk.risk(wellId, riskId),
    queryFn: () => api.risk(wellId, riskId),
    staleTime: 60_000,
  })
  const worked = (q.data?.mitigations ?? []).find((m) => m.worked)
  const failed = (q.data?.mitigations ?? []).find((m) => !m.worked)
  if (q.isLoading) {
    return (
      <div className={s.mit}>
        <Skel h={22} ink />
      </div>
    )
  }
  return (
    <div className={s.mit}>
      {worked && (
        <div className={s.mitRow}>
          <Chip tone="green">WORKED</Chip>
          <span className={s.mitT}>{worked.text}</span>
        </div>
      )}
      {failed && (
        <div className={s.mitRow}>
          <Chip tone="red">FAILED</Chip>
          <span className={s.mitT}>{failed.text}</span>
        </div>
      )}
      {q.data?.recommendation && <div className={s.mitRec}>{q.data.recommendation}</div>}
    </div>
  )
}
