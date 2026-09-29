import type { IntervalAssessment, RiskFactorId, RiskLevel } from './wellRisk'
import s from './WellRisk.module.css'

export interface IntervalAssessmentCardProps {
  assessment: IntervalAssessment
  onClear: () => void
}

const factorInfo: Array<{ id: RiskFactorId; label: string }> = [
  { id: 'depth', label: 'Depth exposure' },
  { id: 'incident', label: 'Incident history' },
  { id: 'geometry', label: 'Hole geometry' },
  { id: 'dynamics', label: 'Drilling dynamics' },
  { id: 'control', label: 'Well-control signals' },
]

const levelName = (level: RiskLevel): string => level.charAt(0).toUpperCase() + level.slice(1)
const format = (value: number | null, digits = 0): string =>
  value === null || !Number.isFinite(value)
    ? 'Unavailable'
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value)

export function IntervalAssessmentCard({ assessment, onClear }: IntervalAssessmentCardProps) {
  const averages: Array<[string, number | null]> = [
    ['ROP', assessment.averages.rop], ['WOB', assessment.averages.wob], ['RPM', assessment.averages.rpm],
    ['Hookload', assessment.averages.hookload], ['Pump rate', assessment.averages.pump_rate],
    ['Standpipe pressure', assessment.averages.standpipe_pressure],
  ]
  return (
    <section className={s.assessmentCard} aria-label='Level details'>
      <header className={s.assessmentHeader}>
        <div>
          <h2>Level details</h2>
          <span className={s.assessmentLevel}>
            <i className={assessment.level ? s[`level${assessment.level.charAt(0).toUpperCase()}${assessment.level.slice(1)}` as keyof typeof s] : s.levelLow} aria-hidden />
            {assessment.level ? levelName(assessment.level) : 'Unavailable'}
          </span>
        </div>
        <button className={s.assessmentClear} type='button' onClick={onClear}>Clear</button>
      </header>
      <p className={s.assessmentRange}>
        MD {format(assessment.mdFrom)}–{format(assessment.mdTo)} m
        <span> · </span>
        TVD {format(assessment.tvdFrom)}–{format(assessment.tvdTo)} m
      </p>
      <p className={s.assessmentScore}>
        Peak {format(assessment.peakScore)}%
        <span> · </span>
        Mean {format(assessment.meanScore)}%
      </p>
      <div className={s.assessmentFactors}>
        {factorInfo.map(({ id, label }) => {
          const score = assessment.factorScores[id]
          const levelKey = assessment.level ? `level${assessment.level.charAt(0).toUpperCase()}${assessment.level.slice(1)}` as keyof typeof s : 'levelLow' as keyof typeof s
          return (
            <div key={id} className={s.assessmentFactor}>
              <div>
                <span>{label}</span>
                <strong>{score === null ? 'Unavailable' : `${format(score)}%`}</strong>
              </div>
              <span className={s.assessmentTrack}>
                <i style={{ width: score === null ? '0%' : `${Math.max(0, Math.min(100, score))}%` }} className={s[levelKey]} />
              </span>
            </div>
          )
        })}
      </div>
      <div className={s.assessmentSection}>
        <h3>Events</h3>
        {assessment.events.length
          ? <ul>{assessment.events.map((event, index) => <li key={`${event.type}-${event.md}-${index}`}>{event.title} <span>{format(event.md)} m MD</span></li>)}</ul>
          : <p>No events in this interval.</p>}
      </div>
      <div className={s.assessmentSection}>
        <h3>Geometry</h3>
        <p>
          Inclination {format(assessment.inclination.min, 1)}–{format(assessment.inclination.max, 1)}°
          <span> · </span>
          Dogleg {format(assessment.doglegSeverity.min, 2)}–{format(assessment.doglegSeverity.max, 2)}
        </p>
      </div>
      <div className={s.assessmentSection}>
        <h3>Drilling averages</h3>
        <dl className={s.assessmentAverages}>
          {averages.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{format(value, 2)}</dd></div>
          ))}
        </dl>
      </div>
      <p className={s.assessmentUnscored}>
        Not scored: {assessment.notScored.length ? assessment.notScored.join(', ') : 'none'}
        {assessment.notScored.some((item) => item === 'Well-control signals') ? ' (no sensor data)' : ''}
      </p>
    </section>
  )
}
