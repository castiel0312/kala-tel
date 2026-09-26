import { Link, useParams } from "react-router-dom";
import { api, useApi } from "../api/client";
import { Empty, ErrorBox, Field, Loading, UnavailableNote } from "../components/Data";

export function EventDetailPage() {
  const { eventId = "" } = useParams();
  const state = useApi((s) => api.event(eventId, s), [eventId]);

  if (state.status === "loading") return <Loading />;
  if (state.status === "error") return <ErrorBox error={state.error} />;

  const e = state.data;
  const page = Number(e.source_page);

  return (
    <section>
      <div className="page-head">
        <h1>{e.event_type.replaceAll("_", " ")}</h1>
        <p className="muted">
          {e.event_id} &middot;{" "}
          <span className="severity" data-sev={e.severity ?? "low"}>
            {e.severity ?? "unknown severity"}
          </span>{" "}
          &middot;{" "}
          <span className="tag" data-origin={e.data_origin ?? undefined}>
            {e.data_origin ?? "origin unavailable"}
          </span>
        </p>
      </div>

      <nav className="subnav">
        {e.well_id ? (
          <>
            <Link to={`/wells/${e.well_id}/events`}>All events</Link>
            <Link to={`/wells/${e.well_id}`}>Well overview</Link>
          </>
        ) : (
          <span className="unavailable">
            This event is not linked to a well in the current dataset.
          </span>
        )}
      </nav>

      <div className="panel">
        <h2>Timing and depth</h2>
        <dl className="fields">
          <Field label="Event type" value={e.event_type} />
          <Field label="Subtype" value={e.event_subtype} />
          <Field
            label="Start time"
            value={e.start_time}
            reason="The source declares no timezone; this is naive local time."
          />
          <Field label="End time" value={e.end_time} />
          <Field
            label="Start MD"
            value={e.start_md}
            reason="Event depth interval unavailable in source: the daily report records only the end depth."
            format={(v) => `${Number(v).toFixed(2)} m`}
          />
          <Field
            label="End MD"
            value={e.end_md}
            format={(v) => `${Number(v).toFixed(2)} m`}
          />
          <Field
            label="Start TVD"
            value={e.start_tvd}
            reason="Not recorded, and never interpolated for an event."
            format={(v) => `${Number(v).toFixed(2)} m`}
          />
          <Field
            label="End TVD"
            value={e.end_tvd}
            reason="Not recorded, and never interpolated for an event."
            format={(v) => `${Number(v).toFixed(2)} m`}
          />
          <Field label="Formation" value={e.formation} reason="No source-backed formation intervals exist for this well." />
          <Field label="NPT hours" value={e.npt_hours} format={(v) => Number(v).toFixed(2)} />
          <Field label="Depth source" value={e.depth_source} />
        </dl>
        {e.start_md === null ? (
          <UnavailableNote>
            Event depth interval unavailable in source. Only the end depth is
            reported, so no interval is shown and no start depth is inferred.
          </UnavailableNote>
        ) : null}
      </div>

      <div className="panel">
        <h2>Operational detail</h2>
        <dl className="fields">
          <Field label="Cause" value={e.cause} />
          <Field label="Mitigation" value={e.mitigation} />
          <Field label="Outcome" value={e.outcome} />
        </dl>
      </div>

      <div className="panel">
        <h2>Source evidence</h2>
        <dl className="fields">
          <Field label="Source document" value={e.source_document} />
          <Field label="Source page" value={e.source_page} />
          <Field label="Source" value={e.source} />
          <Field label="Extraction confidence" value={e.confidence} />
          <Field label="Extraction method" value={e.extraction_method} />
          <Field label="Data origin" value={e.data_origin} />
        </dl>
        {e.source_document && Number.isFinite(page) ? (
          <>
            <Link
              className="evidence-link"
              to={`/documents/${e.source_document}?page=${page}`}
            >
              Open source document, page {page}
            </Link>
            <p className="chart-note">
              The event was extracted from this document. The page reference is a
              pointer into a public daily drilling report, not a restatement of it.
            </p>
          </>
        ) : (
          <Empty>This event has no resolvable source page.</Empty>
        )}
      </div>

      <div className="panel">
        <h2>What this event is not</h2>
        <p className="muted">
          This is a single public daily-report record. It is not a modelled
          prediction, not a risk score, and not oil-well data. Forty-four events
          are far too few to train a model on, and none are presented as such.
        </p>
      </div>
    </section>
  );
}
