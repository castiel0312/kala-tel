import { Link } from "react-router-dom";
import { api, useApi } from "../api/client";
import { ErrorBox, Loading, UnavailableNote } from "../components/Data";

const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

const SEVERITY_EXPLAINER: Record<string, string> = {
  CRITICAL: "Blocks the release. A critical finding means the data is unsafe to use.",
  HIGH: "Must be resolved before the dataset is relied upon for analysis.",
  MEDIUM: "Advisory. Data is usable; the limitation is documented rather than hidden.",
  LOW: "Advisory note. Recorded for traceability.",
};

export function DataQualityPage() {
  const state = useApi((s) => api.dataQuality(s), []);

  if (state.status === "loading") return <Loading />;
  if (state.status === "error") return <ErrorBox error={state.error} />;

  const dq = state.data;
  const advisory = dq.findings.filter((f) => !f.fatal);

  return (
    <section>
      <div className="page-head">
        <h1>Data quality</h1>
        <p className="muted">
          {dq.dataset_version} &middot; conversion {dq.conversion_version}
        </p>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat-label">Status</span>
          <span className="stat-value">
            <span className="pill" data-state={dq.state}>
              {dq.state}
            </span>
          </span>
        </div>
        {SEVERITIES.map((sev) => (
          <div className="stat" key={sev}>
            <span className="stat-label">{sev}</span>
            <span className="stat-value">{dq.severity_counts[sev] ?? 0}</span>
          </div>
        ))}
        <div className="stat">
          <span className="stat-label">Total rows</span>
          <span className="stat-value">{dq.total_rows.toLocaleString()}</span>
        </div>
      </div>

      <UnavailableNote>
        <strong>{dq.state} is not an error.</strong> The sources genuinely do not
        support every canonical table. The gaps below are reported rather than
        filled with invented values.
      </UnavailableNote>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2>Open findings ({advisory.length})</h2>
        {advisory.length === 0 ? (
          <p className="empty">No advisory findings are open.</p>
        ) : (
          <ul className="findings">
            {advisory.map((f) => (
              <li key={`${f.check}-${f.table}-${f.message}`}>
                <div className="finding-head">
                  <span className="severity" data-sev={f.severity.toLowerCase()}>
                    {f.severity}
                  </span>
                  <code>{f.check}</code>
                  <span className="muted">{f.table}</span>
                </div>
                <div className="finding-body">{f.message}</div>
                {f.evidence ? <div className="finding-body">{f.evidence}</div> : null}
              </li>
            ))}
          </ul>
        )}
        {dq.findings_source ? (
          <p className="chart-note">
            Findings are read from <code>{dq.findings_source}</code>, produced by{" "}
            <code>scripts/validate/dataset_validation.py</code>. The API does not
            re-derive them.
          </p>
        ) : (
          <p className="chart-note">
            No validator artifact found. Run{" "}
            <code>make validate</code> to regenerate{" "}
            <code>reports/validation.json</code>.
          </p>
        )}
      </div>

      <div className="panel">
        <h2>Severity meaning</h2>
        <dl className="fields">
          {SEVERITIES.map((sev) => (
            <div className="field" key={sev}>
              <dt>{sev}</dt>
              <dd>{SEVERITY_EXPLAINER[sev]}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="panel">
        <h2>Entities with no source coverage</h2>
        <p className="muted">
          These canonical tables are intentionally empty. They are never
          back-filled with inferred records.
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
            {Object.entries(dq.entities).map(([entity, status]) => (
              <tr key={entity}>
                <td>
                  <code>{entity}</code>
                </td>
                <td>
                  <span className="unavailable">{status}</span>
                </td>
                <td className="num">{(dq.row_counts[entity] ?? 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Row counts</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Table</th>
                <th className="num">Rows</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(dq.row_counts)
                .sort((a, b) => b[1] - a[1])
                .map(([name, n]) => (
                  <tr key={name}>
                    <td>
                      <code>{name}</code>
                    </td>
                    <td className="num">
                      {n === 0 ? <span className="unavailable">empty</span> : n.toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h2>Standing caveats</h2>
        <ul>
          {dq.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <p className="muted">
          No oil-well proprietary data is present in this release. See{" "}
          <Link to="/">Wells</Link> for what is available.
        </p>
      </div>
    </section>
  );
}
