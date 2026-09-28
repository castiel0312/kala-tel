import { useState } from 'react'
import { Chip, LiveIndicator, MetricBlock, MicroLabel, ProvenanceTag, Sparkline, StateStack } from '../../components/kit'
import type { Metric } from '../../api/types'
import { Section, Figure, Source } from '../Section'
import { ago, sectionNo } from '../hooks'
import { useNwis } from '../useNwis'
import { SEC } from '../sections'
import s from '../sections.module.css'

const sec = SEC.live

/** Depth is the one number the whole page is about, so it gets the space. */
const SUPPORTING = ['rop', 'torque', 'ecd', 'flowOut', 'pitVolume', 'mudWeight']
const SECONDARY = ['wob', 'rpm', 'spp', 'hookload']

/**
 * 02 · Live drilling snapshot.
 *
 * The whole page reads one WebSocket, opened once in the provider, so this section is a
 * pure read of the latest frame. Depth dominates; the rest of the drilling parameters
 * support it, and every metric keeps the state the rig system reported.
 */
export function LiveSection() {
  const { frame, liveStatus, now, well, goTo } = useNwis()
  const [showAll, setShowAll] = useState(false)
  const w = well.data

  const depth = frame?.primary.find((m) => m.key === 'depth')
  const all = [...(frame?.primary ?? []), ...(frame?.more ?? [])]
  const byKey = (k: string) => all.find((m) => m.key === k)
  const supporting = SUPPORTING.map(byKey).filter(Boolean) as Metric[]
  const secondary = SECONDARY.map(byKey).filter(Boolean) as Metric[]
  const sparks = frame?.sparklines12pt
  const live = liveStatus === 'open'
  const next = w?.nextFormation

  return (
    <Section
      id={sec.id}
      no={sec.no}
      eyebrow={sec.eyebrow}
      title={sec.title}
      lede={sec.lede}
      tone={sec.tone}
      actions={
        <>
          <LiveIndicator state={live ? 'live' : liveStatus === 'connecting' ? 'connecting' : 'warn'} label={live ? 'Streaming' : 'Reconnecting'} />
          <Chip tone="outline">{frame ? `updated ${ago(frame.timestamp, now.getTime())}` : 'awaiting first frame'}</Chip>
        </>
      }
    >
      <div className={s.liveGrid}>
        <div className={s.liveDominant}>
          <Figure
            label="Current depth"
            value={depth ? depth.value.toLocaleString() : '—'}
            unit={depth?.unit}
            note={
              <>
                {depth?.note ?? '—'}
                {w ? ` · ${w.bit.tvdssM.toLocaleString()} m TVDSS · ${w.bit.mdMinusTvdssM} m of deviation` : ''}
              </>
            }
            tone="signal"
          />
          <div className={s.liveWellLine}>
            <MicroLabel>{w?.id ?? '—'}</MicroLabel>
            <span>{w?.holeSection}</span>
            <span className={s.dotSep} aria-hidden />
            <span>{w?.currentFormation}</span>
            <span className={s.dotSep} aria-hidden />
            <span>{w?.rigState}</span>
          </div>
          <Source kind={frame?.source ?? 'eRTMAC'}>
            {frame ? `WITSML snapshot · ${frame.latencySeconds} s feed latency` : 'connecting to the rig feed'}
          </Source>
        </div>

        <div className={s.liveSupport}>
          {supporting.length === 0
            ? Array.from({ length: 6 }, (_, i) => <div key={i} className={s.metricSlot} />)
            : supporting.map((m) => (
                <MetricBlock
                  key={m.key}
                  d={{
                    key: m.key,
                    label: m.label,
                    value: m.value,
                    unit: m.unit,
                    note: m.note,
                    tone: m.status === 'ALARM' ? 'danger' : m.status === 'WATCH' ? 'signal' : 'plain',
                    size: 'md',
                  }}
                />
              ))}
        </div>

        <div className={s.liveAside}>
          <div className={s.miniHead}>
            <MicroLabel>Next formation</MicroLabel>
            {next && <Chip tone="yellow">{next.etaHours} h</Chip>}
          </div>
          <p className={[s.nextName, 'display'].join(' ')}>{next?.name ?? '—'}</p>
          <dl className={s.kv}>
            <div>
              <dt>top</dt>
              <dd className="mono">{next ? `${next.topMdM.toLocaleString()} m MD` : '—'}</dd>
            </div>
            <div>
              <dt>distance</dt>
              <dd className="mono">{next ? `${next.distanceM} m below the bit` : '—'}</dd>
            </div>
            <div>
              <dt>top uncertainty</dt>
              <dd className="mono">{next ? `± ${next.uncertaintyM} m` : '—'}</dd>
            </div>
            <div>
              <dt>hole</dt>
              <dd className="mono">
                {w?.holeSection} · {w?.design.bit}
              </dd>
            </div>
          </dl>
          <button type="button" className={s.linkBtn} onClick={() => goTo('corridor')}>
            See the depth corridor <span aria-hidden>→</span>
          </button>
        </div>
      </div>

      <div className={s.liveStrip}>
        <div className={s.stripBlock}>
          <MicroLabel>Metric trend · last hour</MicroLabel>
          <div className={s.sparkRow}>
            {(['rop', 'torque', 'ecd', 'flowOut', 'pitVolume'] as const).map((k) => {
              const series = sparks?.[k]
              const metric = byKey(k)
              if (!Array.isArray(series) || series.length < 2) return null
              return (
                <figure key={k} className={s.sparkCell}>
                  <figcaption>
                    {metric?.label ?? k}
                    <b className="mono">
                      {metric?.value}
                      {metric?.unit}
                    </b>
                  </figcaption>
                  <Sparkline
                    points={series as number[]}
                    width={148}
                    height={34}
                    color={metric?.status === 'ALARM' ? 'var(--nw-red)' : metric?.status === 'WATCH' ? 'var(--nw-yellow-deep)' : 'var(--nw-text-2)'}
                    limit={typeof metric?.limit === 'number' ? metric.limit : undefined}
                  />
                </figure>
              )
            })}
          </div>
        </div>

        <div className={s.stripBlock}>
          <MicroLabel>Rig state · last 2 hours</MicroLabel>
          <StateStack states={(w?.rigStateLast2h ?? []).map((r) => ({ state: r.state, pct: r.pct }))} />
        </div>

        <div className={s.stripBlock}>
          <div className={s.miniHead}>
            <MicroLabel>Hydraulic &amp; mechanical</MicroLabel>
            <button type="button" className={s.linkBtnSm} onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
              {showAll ? 'Fewer' : 'All channels'}
            </button>
          </div>
          <div className={s.chanGrid}>
            {(showAll ? [...supporting, ...secondary] : secondary).map((m) => (
              <MetricBlock
                key={m.key}
                d={{
                  key: m.key,
                  label: m.label,
                  value: m.value,
                  unit: m.unit,
                  note: m.note,
                  tone: m.status === 'ALARM' ? 'danger' : m.status === 'WATCH' ? 'signal' : 'plain',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <p className={s.finePrint}>
        <ProvenanceTag kind="LIVE" label="eRTMAC / WITSML" /> Frames arrive on a single WebSocket and are written
        straight into the query cache, so every number on this page is the same frame. Section {sectionNo(2)} of 12.
      </p>
    </Section>
  )
}
