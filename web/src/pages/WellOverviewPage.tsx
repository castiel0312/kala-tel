import { useParams } from "react-router-dom";
import { api, useApi } from "../api/client";
import { Empty, ErrorBox, Field, Loading, UnavailableNote } from "../components/Data";
import { WellNav } from "../components/WellNav";

const m = (v: number) => `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })} m`;

export function WellOverviewPage() {
  const { wellId = "" } = useParams();
  const state = useApi((s) => api.well(wellId, s), [wellId]);

  if (state.status === "loading") return <Loading />;
  if (state.status === "error") return <ErrorBox error={state.error} />;

  const w = state.data;
  const counts = w.row_counts;
  const bore = w.wellbores[0];

  const stats: { label: string; value: number | string }[] = [
    { label: "Survey stations", value: counts["trajectories"] ?? 0 },
    { label: "Drilling samples", value: counts["drilling_timeseries"] ?? 0 },
    { label: "Documents", value: counts["documents"] ?? 0 },
    { label: "Verified events", value: counts["events"] ?? 0 },
    { label: "Drilling runs", value: counts["drilling_runs"] ?? 0 },
    { label: "Depth-indexed mud temp.", value: counts["mud_temperature_depth"] ?? 0 },
  ];

  return (
    <section>
      <div className="page-head">
        <h1>{w.well_name ?? w.well_id}</h1>
        <p className="muted">
          {w.well_id} &middot; {w.operator ?? "Operator unavailable"} &middot;{" "}
          <span className="tag" data-origin={w.data_origin ?? undefined}>
            {w.data_origin ?? "origin unavailable"}
          </span>
        </p>
      </div>

      <WellNav wellId={w.well_id} />

      <div className="stats">
        <div className="stat">
          <span className="stat-label">Total depth</span>
          <span className="stat-value">
            {w.actual_td === null ? (
              <span className="unavailable">Unavailable</span>
            ) : (
              m(w.actual_td)
            )}
          </span>
        </div>
        {stats.map((s) => (
          <div className="stat" key={s.label}>
            <span className="stat-label">{s.label}</span>
            <span className="stat-value">
              {s.value === 0 ? <span className="unavailable">0</span> : s.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div className="panel-row">
        <div className="panel">
          <h2>Identity</h2>
          <dl className="fields">
            <Field label="Well ID" value={w.well_id} />
            <Field label="Well name" value={w.well_name} />
            <Field label="Operator" value={w.operator} />
            <Field label="Field" value={w.field} />
            <Field label="Basin" value={w.basin} />
            <Field label="Spud date" value={w.spud_date} />
            <Field label="Data origin" value={w.data_origin} />
            <Field label="Source" value={w.source} />
          </dl>
        </div>

        <div className="panel">
          <h2>Location</h2>
          <dl className="fields">
            <Field label="Latitude" value={w.latitude} format={(v) => `${Number(v)}°`} />
            <Field label="Longitude" value={w.longitude} format={(v) => `${Number(v)}°`} />
            <Field label="CRS" value={w.crs} />
            <Field
              label="EPSG"
              value={w.epsg}
              reason="The survey report names the CRS but publishes no EPSG code."
            />
            <Field label="KB elevation" value={w.kb_elevation} format={(v) => m(Number(v))} />
          </dl>
          {w.locations.length === 0 ? (
            <Empty>No separate location records exist for this well.</Empty>
          ) : (
            w.locations.map((loc) => (
              <dl className="fields" key={loc["location_id"]}>
                <Field label="Location type" value={loc["location_type"]} />
                <Field label="Confidence" value={loc["confidence"]} />
                <Field
                  label="X"
                  value={loc["x"]}
                  format={(v) => `${Number(v).toLocaleString()} ${loc["x_unit"] ?? ""}`}
                />
                <Field
                  label="Y"
                  value={loc["y"]}
                  format={(v) => `${Number(v).toLocaleString()} ${loc["y_unit"] ?? ""}`}
                />
              </dl>
            ))
          )}
        </div>

        <div className="panel">
          <h2>Wellbore</h2>
          {bore ? (
            <dl className="fields">
              <Field label="Wellbore ID" value={bore.wellbore_id} />
              <Field label="Name" value={bore.wellbore_name} />
              <Field label="Type" value={bore.wellbore_type} />
              <Field label="TD (MD)" value={bore.td_md} format={(v) => m(Number(v))} />
              <Field
                label="TD (TVD)"
                value={bore.td_tvd}
                reason="TVD is only defined down to the last survey station."
                format={(v) => m(Number(v))}
              />
              <Field label="Status" value={bore.status} />
            </dl>
          ) : (
            <Empty>No wellbore records exist for this well.</Empty>
          )}
        </div>
      </div>

      <div className="panel">
        <h2>Not available in this release</h2>
        <p className="muted">
          The following are canonical NWIS entities with no coverage in the
          current public source. They are shown as unavailable rather than
          estimated.
        </p>
        <table>
          <thead>
            <tr>
              <th>Entity</th>
              <th>Status</th>
              <th className="num">Rows</th>
            </tr>
          </thead>
          <tbody>
            {["formations", "bits", "cement_jobs", "reservoirs"].map((name) => (
              <tr key={name}>
                <td>
                  <code>{name}</code>
                </td>
                <td>
                  <span className="unavailable">SOURCE_NOT_AVAILABLE</span>
                </td>
                <td className="num">{(counts[name] ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <UnavailableNote>
          Formation correlation is not implemented because this dataset contains
          zero formation rows. When oil-well formation intervals arrive, the same
          trajectory and event views will carry them without change.
        </UnavailableNote>
      </div>
    </section>
  );
}
