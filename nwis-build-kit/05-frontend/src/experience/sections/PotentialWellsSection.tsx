import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { HistoricalEvent, OffsetWell, RiskSummary } from '../../api/types'
import { api, qk } from '../../api/client'
import {
  Bar,
  Button,
  Chip,
  EmptyState,
  ErrorStrip,
  Field,
  MetricSkeleton,
  MetricStrip,
  MicroLabel,
  Panel,
  ProvenanceTag,
  Segmented,
  type MetricDatum,
} from '../../components/kit'
import { Icon } from '../../components/kit/icons'
import { fmtInt, fmtM } from '../../lib/format'
import { GroqError, activeGroqKey, groqKeyIsFromEnv, rememberGroqKey, runPlacement, type GroqRun } from '../../lib/groq'
import type { PlanningBrief, Rejection, ScreenedCandidate } from '../../lib/planner'
import { Section, Source } from '../Section'
import { useNwis } from '../useNwis'
import { SEC } from '../sections'
import { CandidateInspector } from './CandidateInspector'
import { PotentialWellMap } from './PotentialWellMap'
import s from '../sections.module.css'

const sec = SEC.potential

const RADII = [1.5, 3, 5, 8] as const
const SPACING = [0.4, 0.6, 1] as const
const COUNTS = [4, 6, 8] as const

type Phase = 'idle' | 'running' | 'done' | 'error'

const REASON_LABEL: Record<Rejection['reason'], string> = {
  OUTSIDE_RADIUS: 'outside radius',
  SPACING_CONFLICT: 'spacing conflict',
  TOO_SHALLOW: 'beyond offset control',
  UNPARSEABLE: 'no coordinates',
  DUPLICATE: 'duplicate ground',
}

/**
 * 13 · Potential future well planner.
 *
 * The question the rest of the page cannot answer: given everything the field already knows,
 * *where should the next well go?* The nearby-well section ranks what exists; this one proposes
 * what does not, and is built so the proposal can be argued with.
 *
 * The division of labour is the point. Groq is given the measured wellfield and asked for a
 * geological case — which ground is worth penetrating, which offsets support that reading, what it
 * expects to find, how it would be drilled, and what it could not establish. It is not trusted
 * with a single number: the returned coordinates are checked against the radius, against minimum
 * spacing to a bore that already exists, and against the deepest offset in reach, and every
 * distance on the page is then recomputed from the API's own coordinates. Proposals that fail
 * those checks are kept on the panel with the reason, because a refusal that is explained is more
 * useful than a shortlist that silently dropped the interesting one.
 */
export function PotentialWellsSection() {
  const { wellId, well, selectWell, goTo } = useNwis()

  const [radiusKm, setRadiusKm] = useState<number>(3)
  const [minSpacingKm, setMinSpacingKm] = useState<number>(0.6)
  const [candidateCount, setCandidateCount] = useState<number>(6)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [fault, setFault] = useState<{ message: string; hint: string } | null>(null)
  const [run, setRun] = useState<GroqRun | null>(null)
  const [keyDraft, setKeyDraft] = useState('')

  const hasKey = activeGroqKey().length > 0
  const keyFromEnv = groqKeyIsFromEnv()

  /**
   * The brief's evidence set. The radius is the reader's, not the section's, so changing it
   * re-reads the archive rather than re-filtering a cached page of it.
   */
  const offsets = useQuery({
    queryKey: qk.offsets(wellId ?? '', { radius_km: radiusKm, min_similarity: 0, sort: 'distance' }),
    queryFn: () => api.offsets(wellId as string, { radius_km: radiusKm, min_similarity: 0, sort: 'distance' }),
    enabled: Boolean(wellId),
    staleTime: 5 * 60_000,
  })

  const risks = useQuery({
    queryKey: qk.risks(wellId ?? ''),
    queryFn: () => api.risks(wellId as string),
    enabled: Boolean(wellId),
    staleTime: 5 * 60_000,
  })

  /** Mud loss across the field, which is the occurrence record the placement case leans on. */
  const losses = useQuery({
    queryKey: qk.events({ type: 'LOSS' }),
    queryFn: () => api.events({ type: 'LOSS' }),
    staleTime: 10 * 60_000,
  })

  const offsetWells: OffsetWell[] = useMemo(() => offsets.data?.wells ?? [], [offsets.data])
  const riskList: RiskSummary[] = useMemo(() => risks.data?.risks ?? [], [risks.data])
  const lossEvents: HistoricalEvent[] = useMemo(() => losses.data?.events ?? [], [losses.data])

  const brief: PlanningBrief | null = useMemo(() => {
    if (!well.data || !wellId) return null
    return {
      field: well.data.field,
      activeWellId: well.data.id,
      activeSurfaceKm: well.data.surfaceKm,
      activeTdMdM: well.data.bit.mdM,
      currentFormation: well.data.currentFormation,
      formationTopsTvdssM: well.data.formationTopsTvdssM,
      offsets: offsetWells,
      events: lossEvents,
      risks: riskList,
      radiusKm,
      minSpacingKm,
      candidateCount,
    }
  }, [well.data, wellId, offsetWells, lossEvents, riskList, radiusKm, minSpacingKm, candidateCount])

  const accepted: ScreenedCandidate[] = run?.screening.accepted ?? []
  const rejected: Rejection[] = run?.screening.rejected ?? []
  const selected = accepted.find((c) => c.id === selectedId) ?? null

  const placeNow = useCallback(async () => {
    if (!brief) return
    setPhase('running')
    setFault(null)
    try {
      const result = await runPlacement(brief)
      setRun(result)
      setPhase('done')
      setSelectedId(result.screening.accepted[0]?.id ?? null)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (err instanceof GroqError) setFault({ message: err.message, hint: err.hint })
      else setFault({ message: 'Placement run failed', hint: err instanceof Error ? err.message : String(err) })
      setPhase('error')
    }
  }, [brief])

  const onSaveKey = useCallback(() => {
    rememberGroqKey(keyDraft)
    setKeyDraft('')
  }, [keyDraft])

  /** The evidence the model was shown, stated on the page so the claims can be checked. */
  const grounding: MetricDatum[] = useMemo(() => {
    const clean = offsetWells.filter((w) => !w.hasLossEvents).length
    return [
      {
        key: 'field',
        label: 'Field',
        value: well.data?.field ?? '—',
        note: `${wellId ?? '—'} is the reference well`,
      },
      {
        key: 'offsets',
        label: 'Bores in radius',
        value: fmtInt(offsetWells.length),
        unit: 'wells',
        note: `${fmtInt(clean)} without mud loss`,
        tone: offsetWells.length > 0 ? 'plain' : 'danger',
      },
      {
        key: 'tops',
        label: 'Formation tops',
        value: fmtInt(Object.keys(well.data?.formationTopsTvdssM ?? {}).length),
        unit: 'on active well',
        note: 'TVDSS, from /wells/active',
      },
      {
        key: 'events',
        label: 'Loss events',
        value: fmtInt(lossEvents.length),
        unit: 'indexed',
        note: 'field-wide, in the brief',
        tone: lossEvents.length > 0 ? 'signal' : 'plain',
      },
      {
        key: 'spacing',
        label: 'Min spacing',
        value: minSpacingKm.toFixed(1),
        unit: 'km',
        note: 'NWIS rule, enforced before drawing',
      },
      {
        key: 'basis',
        label: 'Placement basis',
        value: run ? 'Well archive' : 'NWIS',
        note: run ? `${run.latencySeconds}s · ${run.proposed} proposed` : 'not yet run',
      },
    ]
  }, [well.data, wellId, offsetWells, lossEvents, minSpacingKm, run])

  if (!brief) {
    return (
      <Section id={sec.id} no={sec.no} eyebrow={sec.eyebrow} title={sec.title} lede={sec.lede} tone={sec.tone}>
        <MetricSkeleton n={6} height={56} />
      </Section>
    )
  }

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
          <Segmented
            value={String(radiusKm)}
            options={RADII.map((r) => ({ value: String(r), label: `${r} km` }))}
            onChange={(v) => {
              setRadiusKm(Number(v))
              setRun(null)
              setPhase('idle')
            }}
            ariaLabel="Search radius around the active well"
          />
          <Segmented
            value={String(minSpacingKm)}
            options={SPACING.map((v) => ({ value: String(v), label: `${v} km gap` }))}
            onChange={(v) => {
              setMinSpacingKm(Number(v))
              setRun(null)
              setPhase('idle')
            }}
            ariaLabel="Minimum spacing from an existing bore"
          />
          <Button variant="primary" onClick={placeNow} disabled={phase === 'running'}>
            <Icon name="target" size={12} />
            {phase === 'running' ? 'Placing…' : 'Run placement'}
          </Button>
        </>
      }
    >
      {/* ------------------------------------------------------- grounding --- */}
      <div className={s.pwpGrounding}>
        <MicroLabel meta="what the placement is grounded in">Evidence base</MicroLabel>
        <MetricStrip data={grounding} />
      </div>

      {/* --------------------------------------------------------- controls --- */}
      <div className={s.pwpControls}>
        <span className={s.pwpControlLabel}>Candidates to place</span>
        <Segmented
          value={String(candidateCount)}
          options={COUNTS.map((c) => ({ value: String(c), label: String(c) }))}
          onChange={(v) => {
            setCandidateCount(Number(v))
            setRun(null)
            setPhase('idle')
          }}
          ariaLabel="How many candidate wells to place"
        />
        <span className={s.pwpControlHint}>
          Placement is relative to {brief.activeWellId}. Change the radius to re-read the archive.
        </span>
      </div>

      {/* -------------------------------------------------------------- key --- */}
      {!hasKey && !keyFromEnv && (
        <div className={s.pwpKey}>
          <ErrorStrip
            title="Access key required"
            body="Placement needs an access key to run. Paste one to run it now — it is held in this tab only and is never written to disk."
          />
          <div className={s.pwpKeyRow}>
            <div className={s.pwpKeyField}>
              <Field
                value={keyDraft}
                onChange={setKeyDraft}
                placeholder="paste key"
                ariaLabel="Access key"
                icon={<Icon name="link" size={13} />}
              />
            </div>
            <Button onClick={onSaveKey} disabled={!keyDraft.trim()}>
              Use this key
            </Button>
          </div>
        </div>
      )}

      {phase === 'error' && fault && (
        <ErrorStrip title={fault.message} body={fault.hint} action="Try again" onAction={placeNow} />
      )}

      {/* ---------------------------------------------------------- results --- */}
      {phase === 'done' && run && (
        <>
          {accepted.length === 0 ? (
            <EmptyState
              title="No usable well could be placed"
              body={`${run.proposed} proposal${run.proposed === 1 ? '' : 's'} came back, and all of them failed NWIS screening. The reasons are listed below — widen the radius or relax the spacing rule and run it again.`}
              actions={
                <Button size="sm" onClick={() => goTo('wells')}>
                  Review the offsets
                </Button>
              }
            />
          ) : (
            <div className={s.pwpLayout}>
              <div className={s.pwpMapCol}>
                <Panel
                  title="Placement plan"
                  meta={
                    <span className="mono">
                      {accepted.length} of {run.proposed} proposed · {run.latencySeconds}s
                    </span>
                  }
                >
                  <PotentialWellMap
                    centreKm={brief.activeSurfaceKm}
                    radiusKm={radiusKm}
                    activeWellId={brief.activeWellId}
                    offsets={offsetWells}
                    candidates={accepted}
                    rejected={rejected}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                </Panel>

                <Panel
                  title="Shortlist"
                  meta={<span className="mono">ranked by confidence</span>}
                  flush
                >
                  <ol className={s.pwpShortlist}>
                    {accepted.map((c, i) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className={s.pwpShortlistRow}
                          aria-pressed={c.id === selectedId}
                          onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                        >
                          <span className={s.pwpShortlistRank}>{i + 1}</span>
                          <span className={s.pwpShortlistName}>{c.name}</span>
                          <span className={s.pwpShortlistMeta}>
                            {c.targetFormation} · {fmtM(c.targetTdM)}
                          </span>
                          <span className={s.pwpShortlistSpacing}>
                            <Icon name="nearby" size={11} />
                            {c.nearestWell ? `${c.nearestWell.distanceKm.toFixed(2)} km to ${c.nearestWell.id}` : 'no bore in range'}
                          </span>
                          <span className={s.pwpShortlistConf}>
                            <Bar value={c.confidence} tone="yellow" height={4} ticks={0} />
                            <b className="mono">{Math.round(c.confidence)}%</b>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </Panel>
              </div>

              <div className={s.pwpInspectorCol}>
                <Panel title="Placement case" meta={selected ? selected.name : 'nothing selected'}>
                  <CandidateInspector
                    candidate={selected}
                    offsets={offsetWells}
                    risks={riskList}
                    activeWellId={brief.activeWellId}
                    onSelectWell={selectWell}
                  />
                </Panel>
              </div>
            </div>
          )}

          {rejected.length > 0 && (
            <Panel
              title="Screened out"
              meta={<span className="mono">{rejected.length} proposals refused</span>}
              flush
              signal="danger"
            >
              <ul className={s.pwpRejected}>
                {rejected.map((r, i) => (
                  <li key={`${r.name}-${i}`}>
                    <Chip tone="outline">{REASON_LABEL[r.reason]}</Chip>
                    <b>{r.name}</b>
                    <span>{r.detail}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}

      {phase === 'idle' && (
        <EmptyState
          title="Placement not run yet"
          body={`The engine reads the ${offsetWells.length} bores within ${radiusKm} km of ${brief.activeWellId}, their tops, their mud-loss history and the risk zones ahead, then proposes candidate locations and shows its reasoning for each. Nothing is placed until you run it.`}
          actions={
            <Button size="sm" variant="primary" onClick={placeNow} disabled={!hasKey && !keyFromEnv}>
              <Icon name="target" size={12} /> Run placement
            </Button>
          }
        />
      )}

      {phase === 'running' && (
        <div className={s.pwpRunning} role="status">
          <span className={s.pwpRunningBar} aria-hidden />
          <p>Reading the wellfield and ranking candidate locations…</p>
        </div>
      )}

      <Source kind="API">
        /wells/{wellId}/offsets · /wells/{wellId}/risks · /events · distances recomputed from the
        coordinates NWIS returned · <ProvenanceTag kind="SYNTHETIC" label="locations proposed for review" />
      </Source>
    </Section>
  )
}
