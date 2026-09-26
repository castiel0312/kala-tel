import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, useApi } from "../api/client";
import type { WellEvent } from "../api/types";
import { Empty, ErrorBox, Loading, UnavailableNote } from "../components/Data";
import { WellNav } from "../components/WellNav";

type Sort = "time" | "depth" | "severity";

/** Stable reference so useMemo dependencies do not change every render. */
const NO_EVENTS: WellEvent[] = [];

const SEVERITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Depth interval as the source actually reports it.
 *
 * All 44 events carry an end depth but no start depth, so there is no interval
 * to show. This returns the honest partial statement rather than widening
 * end_md into a range.
 */
function depthCell(e: WellEvent) {
  if (e.start_md === null && e.end_md === null) {
    return <span className="unavailable">Event depth unavailable in source</span>;
  }
  return (
    <span>
      {e.start_md === null ? (
        <span className="unavailable" title="The source records only the end depth.">
          start unavailable
        </span>
      ) : (
        `${e.start_md.toFixed(1)} m`
      )}
      {" → "}
      {e.end_md === null ? (
        <span className="unavailable">end unavailable</span>
      ) : (
        `${e.end_md.toFixed(1)} m`
      )}
    </span>
  );
}

export function EventsPage() {
  const { wellId = "" } = useParams();
  const state = useApi((s) => api.events(wellId, s), [wellId]);
  const [sort, setSort] = useState<Sort>("time");
  const [filter, setFilter] = useState<string>("ALL");

  const events: WellEvent[] = state.status === "ready" ? state.data : NO_EVENTS;
  const types = useMemo(
    () => Array.from(new Set(events.map((e) => e.event_type))).sort(),
    [events],
  );

  const shown = useMemo(() => {
    const base = filter === "ALL" ? events : events.filter((e) => e.event_type === filter);
    const copy = [...base];
    if (sort === "depth") {
      copy.sort((a, b) => (b.end_md ?? -1) - (a.end_md ?? -1));
    } else if (sort === "severity") {
      copy.sort(
        (a, b) =>
          (SEVERITY_RANK[a.severity ?? ""] ?? 9) - (SEVERITY_RANK[b.severity ?? ""] ?? 9) ||
          (a.end_md ?? -1) - (b.end_md ?? -1),
      );
    } else {
      copy.sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));
    }
    return copy;
  }, [events, filter, sort]);

  if (state.status === "loading") return <Loading />;
  if (state.status === "error") return <ErrorBox error={state.error} />;
  if (events.length === 0) {
    return (
      <section>
        <WellNav wellId={wellId} />
        <Empty>No events are recorded for this well.</Empty>
      </section>
    );
  }

  const withInterval = events.filter((e) => e.start_md !== null).length;

  return (
    <section>
      <div className="page-head">
        <h1>Events</h1>
        <p className="muted">
          {events.length} verified events, each linked to a source document and
          page
        </p>
      </div>

      <WellNav wellId={wellId} />

      <div className="panel">
        <h3>Filter</h3>
        <div className="channel-picker">
          <button
            type="button"
            aria-pressed={filter === "ALL"}
            onClick={() => setFilter("ALL")}
          >
            All ({events.length})
          </button>
          {types.map((t) => {
            const n = events.filter((e) => e.event_type === t).length;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={filter === t}
                onClick={() => setFilter(t)}
              >
                {t.replaceAll("_", " ").toLowerCase()} ({n})
              </button>
            );
          })}
        </div>
        <h3>Sort</h3>
        <div className="channel-picker">
          {(["time", "depth", "severity"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sort === s}
              onClick={() => setSort(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {withInterval === 0 ? (
        <UnavailableNote>
          Event depth interval unavailable in source. The daily drilling reports
          record where an operation ended, not where it began, so all{" "}
          {events.length} events have an end depth and no start depth. No start
          depth is inferred.
        </UnavailableNote>
      ) : null}

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Start time</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Depth</th>
                <th>Formation</th>
                <th className="num">NPT (h)</th>
                <th>Source</th>
                <th>Origin</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.event_id}>
                  <td>
                    <Link to={`/events/${e.event_id}`}>
                      {e.start_time ?? (
                        <span className="unavailable">unavailable</span>
                      )}
                    </Link>
                  </td>
                  <td>{e.event_type.replaceAll("_", " ")}</td>
                  <td>
                    <span className="severity" data-sev={e.severity ?? "low"}>
                      {e.severity ?? "unknown"}
                    </span>
                  </td>
                  <td>{depthCell(e)}</td>
                  <td>
                    {e.formation ?? (
                      <span className="unavailable">no source intervals</span>
                    )}
                  </td>
                  <td className="num">{e.npt_hours?.toFixed(2) ?? "—"}</td>
                  <td>
                    <span className="muted">{e.source_document ?? "—"}</span>{" "}
                    <span className="muted">p{e.source_page ?? "?"}</span>
                  </td>
                  <td>
                    <span className="tag" data-origin={e.data_origin ?? undefined}>
                      {e.data_origin ?? "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
