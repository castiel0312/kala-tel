import { Link } from "react-router-dom";
import { api, useApi } from "../api/client";
import { Empty, ErrorBox, Field, Loading } from "../components/Data";

export function WellsPage() {
  const state = useApi((s) => api.wells(s), []);

  if (state.status === "loading") return <Loading />;
  if (state.status === "error") return <ErrorBox error={state.error} />;
  if (state.data.length === 0) {
    return <Empty>No wells are present in this release.</Empty>;
  }

  return (
    <section>
      <h1>Wells</h1>
      <div className="card-grid">
        {state.data.map((w) => (
          <article className="card" key={w.well_id}>
            <h2>
              <Link to={`/wells/${w.well_id}`}>{w.well_name ?? w.well_id}</Link>
            </h2>
            <p className="muted">
              {w.well_id} &middot; {w.data_origin}
            </p>
            <dl className="fields">
              <Field label="Operator" value={w.operator} />
              <Field label="Field" value={w.field} />
              <Field label="Spud date" value={w.spud_date} />
              <Field
                label="Total depth"
                value={w.actual_td}
                format={(v) => `${Number(v).toLocaleString()} m`}
              />
              <Field
                label="KB elevation"
                value={w.kb_elevation}
                format={(v) => `${Number(v).toLocaleString()} m`}
              />
            </dl>
            <nav className="card-links">
              <Link to={`/wells/${w.well_id}/trajectory`}>Trajectory</Link>
              <Link to={`/wells/${w.well_id}/timeline`}>Drilling timeline</Link>
              <Link to={`/wells/${w.well_id}/events`}>Events</Link>
              <Link to={`/wells/${w.well_id}/documents`}>Documents</Link>
            </nav>
          </article>
        ))}
      </div>
    </section>
  );
}
