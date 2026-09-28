import type { OffsetWell, RiskSummary } from '../../api/types'
import { Bar, Chip, MicroLabel, ProvenanceTag, RiskChip, StatusChip } from '../../components/kit'
import { Icon } from '../../components/kit/icons'
import { fmtInt, fmtKM, fmtM } from '../../lib/format'
import { kmDistance } from '../../lib/geo'
import type { ScreenedCandidate } from '../../lib/planner'
import s from '../sections.module.css'

export interface CandidateInspectorProps {
  candidate: ScreenedCandidate | null
  offsets: OffsetWell[]
  risks: RiskSummary[]
  activeWellId: string
  onSelectWell: (id: string) => void
}

/**
 * Everything about one candidate, in the order a placement review actually reads it: what is
 * proposed, what the map measured, what it is standing on, how sure the model is and why, what
 * is expected to happen, how it would be drilled, and — last and not least — what could not be
 * established.
 *
 * The two blocks that are *not* the model's are labelled as measurements. Distance to the
 * nearest bore, the second-nearest bore, the shortfall against the deepest offset and the
 * similarity of every cited well are all recomputed here from the coordinates `/offsets`
 * returned, so a claim in the rationale can be checked against them.
 */
export function CandidateInspector({ candidate, offsets, risks, activeWellId, onSelectWell }: CandidateInspectorProps) {
  if (!candidate) {
    return (
      <div className={s.pwpInspectorEmpty}>
        <Icon name="target" size={22} />
        <p>Select a candidate on the plan to read its placement case.</p>
      </div>
    )
  }

  const cited = candidate.citedWells
  /** Risks on the active well that the proposal would inherit, worst first. */
  const inherited = [...risks].sort((a, b) => b.probability - a.probability).slice(0, 3)

  return (
    <div >
      <header className={s.pwpInspectorHead}>
        <div className={s.pwpInspectorTitleRow}>
          <h3 className={s.pwpInspectorName}>{candidate.name}</h3>
          <Chip tone="yellow">{candidate.wellType}</Chip>
          <StatusChip status="PLANNED" title="Not yet drilled — a proposal" />
        </div>
        <div className={s.pwpInspectorConf}>
          <Bar
            value={candidate.confidence}
            tone={candidate.confidence >= 70 ? 'yellow' : candidate.confidence >= 45 ? 'steel' : 'red'}
            height={7}
            ticks={5}
          />
          <span className="mono">{Math.round(candidate.confidence)}%</span>
          <span className={s.pwpInspectorConfLabel}>confidence</span>
        </div>
      </header>

      <section className={s.pwpBlock}>
        <MicroLabel>Definition</MicroLabel>
        <dl className={s.pwpKv}>
          <div>
            <dt>Target formation</dt>
            <dd>{candidate.targetFormation}</dd>
          </div>
          <div>
            <dt>Target TD</dt>
            <dd className="mono">{fmtM(candidate.targetTdM)}</dd>
          </div>
          <div>
            <dt>Position</dt>
            <dd className="mono">
              {candidate.eastKm.toFixed(2)} E · {candidate.northKm.toFixed(2)} N km
            </dd>
          </div>
          <div>
            <dt>From {activeWellId}</dt>
            <dd className="mono">{fmtKM(candidate.distanceFromActiveKm)}</dd>
          </div>
        </dl>
      </section>

      <section className={s.pwpBlock}>
        <MicroLabel meta="measured by NWIS from the coordinates">Spacing to existing bores</MicroLabel>
        {candidate.nearestWell ? (
          <>
            <div className={s.pwpSpacingHead}>
              <div>
                <span className={s.pwpSpacingId}>{candidate.nearestWell.id}</span>
                <span className={s.pwpSpacingDist}>{fmtKM(candidate.nearestWell.distanceKm)}</span>
              </div>
              <button type="button" className={s.pwpSpacingLink} onClick={() => onSelectWell(candidate.nearestWell!.id)}>
                {candidate.nearestWell.similarity}% similar
                {candidate.nearestWell.hasLossEvents ? ' · lost mud' : ' · clean'}
                <Icon name="arrowRight" size={11} />
              </button>
            </div>
            {candidate.secondNearestWell && (
              <p className={s.pwpSpacingSecond}>
                Second nearest <b className="mono">{candidate.secondNearestWell.id}</b> at{' '}
                <b className="mono">{fmtKM(candidate.secondNearestWell.distanceKm)}</b>
              </p>
            )}
          </>
        ) : (
          <p className={s.pwpNote}>No existing bore lies inside the search radius.</p>
        )}
        <p className={s.pwpNote}>
          {candidate.unconstrainedDepthM > 0 ? (
            <>
              The deepest offset in reach bottoms at{' '}
              <b className="mono">{fmtM(candidate.targetTdM + candidate.unconstrainedDepthM)}</b>, so{' '}
              <b className="mono">{fmtM(candidate.unconstrainedDepthM)}</b> below this target has no historical
              control.
            </>
          ) : (
            <>
              The target sits at the very bottom of the range the offsets already reached, so the
              interval has historical control.
            </>
          )}
        </p>
      </section>

      <section className={s.pwpBlock}>
        <MicroLabel meta={`${cited.length} cited`}>Evidence</MicroLabel>
        {candidate.uncitedClaims.length > 0 && (
          <p className={s.pwpClaimWarn}>
            <Icon name="risk" size={12} />
            Cited {candidate.uncitedClaims.join(', ')}, which is not in the offset set for this radius.
            Those claims are not counted below.
          </p>
        )}
        {cited.length === 0 ? (
          <p className={s.pwpNote}>No offset well was cited, so this proposal rests on formation data alone.</p>
        ) : (
          <ul className={s.pwpEvidence}>
            {cited.map((w) => {
              const measured = kmDistance([candidate.eastKm, candidate.northKm], w.surfaceKm)
              return (
                <li key={w.id}>
                  <div className={s.pwpEvidenceHead}>
                    <b>{w.id}</b>
                    <span className="mono">{fmtKM(measured)}</span>
                    <RiskChip level={w.risk} />
                    {w.hasLossEvents && <Chip tone="redGhost">loss</Chip>}
                  </div>
                  <div className={s.pwpEvidenceFactors}>
                    {(['stratigraphy', 'trajectory', 'mudSystem', 'proximity'] as const).map((k) => (
                      <span key={k}>
                        {k === 'mudSystem' ? 'mud' : k}
                        <b className="mono">{w.similarityFactors[k]}</b>
                      </span>
                    ))}
                  </div>
                  <p className={s.pwpEvidenceMeta}>
                    TD {fmtM(w.tdMdM)} · Barail top{' '}
                    {w.barailTopTvdssM === null ? 'not reported' : fmtM(w.barailTopTvdssM)} · spud {w.spud}
                  </p>
                  {w.lesson && <p className={s.pwpEvidenceLesson}>“{w.lesson}”</p>}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className={s.pwpBlock}>
        <MicroLabel>Why here</MicroLabel>
        <p className={s.pwpRationale}>{candidate.rationale || 'No rationale was given.'}</p>
      </section>

      {candidate.confidenceFactors.length > 0 && (
        <section className={s.pwpBlock}>
          <MicroLabel meta="weights as returned">Confidence breakdown</MicroLabel>
          <ul className={s.pwpFactors}>
            {candidate.confidenceFactors.map((f, i) => (
              // A model is free to name two factors the same thing, and React keys off the name
              // alone that produced a duplicate-key warning. The index keeps them distinct.
              <li key={`${f.factor}-${i}`}>
                <div className={s.pwpFactorHead}>
                  <span>{f.factor}</span>
                  <b className="mono">{Math.round(f.weight * 100)}%</b>
                </div>
                <Bar value={f.weight * 100} tone="yellow" height={4} ticks={0} />
                {f.note && <p className={s.pwpFactorNote}>{f.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={s.pwpBlock}>
        <MicroLabel>Expected risk</MicroLabel>
        <p className={s.pwpRationale}>{candidate.riskOutlook || 'No risk outlook was given.'}</p>
        {inherited.length > 0 && (
          <div className={s.pwpInherited}>
            <span className={s.pwpInheritedLabel}>Carried from {activeWellId}</span>
            {inherited.map((r) => (
              <div key={r.id} className={s.pwpInheritedRow}>
                <span>{r.name}</span>
                <RiskChip level={r.level} probability={r.probability} />
              </div>
            ))}
          </div>
        )}
      </section>

      {candidate.drillPlan.length > 0 && (
        <section className={s.pwpBlock}>
          <MicroLabel meta={`${candidate.drillPlan.length} steps`}>How to drill it</MicroLabel>
          <ol className={s.pwpDrill}>
            {candidate.drillPlan.map((step, i) => (
              <li key={`${step.step}-${i}`}>
                <span className={s.pwpDrillNo}>{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <b>{step.step}</b>
                  {step.detail && <p>{step.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className={s.pwpBlock}>
        <MicroLabel>What could not be established</MicroLabel>
        {candidate.caveats.length === 0 ? (
          <p className={s.pwpNote}>
            No caveats were recorded. That is not a clean bill of health — it means the archive
            did not constrain the answer enough for a gap to be named.
          </p>
        ) : (
          <ul className={s.pwpCaveats}>
            {candidate.caveats.map((c, i) => (
              <li key={i}>
                <Icon name="risk" size={11} />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className={s.pwpInspectorFoot}>
        <ProvenanceTag kind="SYNTHETIC" label="placement proposed for review" />
        <ProvenanceTag kind="DERIVED" label="distances measured from NWIS coordinates" />
        <span className="mono">{fmtInt(offsets.length)} bores checked</span>
      </footer>
    </div>
  )
}
