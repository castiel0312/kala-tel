import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, useApi } from "../api/client";
import type { WellEvent } from "../api/types";
import { Empty, ErrorBox, Field, Loading, UnavailableNote } from "../components/Data";

/** Stable reference so useMemo dependencies do not change every render. */
const NO_EVENTS: WellEvent[] = [];

/** Evidence viewer: the source document behind each event, and its provenance. */
export function DocumentsPage() {
  const wells = useApi((s) => api.wells(s), []);

  if (wells.status === "loading") return <Loading />;
  if (wells.status === "error") return <ErrorBox error={wells.error} />;

  const first = wells.data[0];
  if (first === undefined) return <Empty>No wells are present in this release.</Empty>;

  return <Evidence wellId={first.well_id} />;
}

function Evidence({ wellId }: { wellId: string }) {
  const [params, setParams] = useSearchParams();
  const selected = params.get("doc");
  const pageParam = Number(params.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1;
  const [filter, setFilter] = useState("ALL");

  const events = useApi((s) => api.events(wellId, s), [wellId]);
  const doc = useApi((s) => (selected ? api.document(selected, s) : Promise.resolve(null)), [selected]);
  const docPage = useApi(
    (s) => (selected ? api.documentPage(selected, page, s) : Promise.resolve(null)),
    [selected, page],
  );

  const list: WellEvent[] = events.status === "ready" ? events.data : NO_EVENTS;

  const byDocument = useMemo(() => {
    const map = new Map<string, WellEvent[]>();
    for (const e of list) {
      if (!e.source_document) continue;
      const bucket = map.get(e.source_document) ?? [];
      bucket.push(e);
      map.set(e.source_document, bucket);
    }
    return map;
  }, [list]);

  const types = useMemo(
    () => Array.from(new Set(list.map((e) => e.event_type))).sort(),
    [list],
  );

  const shown = useMemo(
    () => (filter === "ALL" ? list : list.filter((e) => e.event_type === filter)),
    [list, filter],
  );

  const select = (docId: string, at?: number) => {
    const next = new URLSearchParams(params);
    next.set("doc", docId);
    if (at !== undefined) next.set("page", String(at));
    setParams(next, { replace: true });
  };

  return (
    <section>
      <div className="page-head">
        <h1>Documents and evidence</h1>
        <p className="muted">
          {events.status === "ready"
            ? `${list.length} events, each linked to a public source document and page`
            : "Loading event evidence…"}
        </p>
      </div>

      <nav className="subnav">
        <Link to={`/wells/${wellId}`}>Overview</Link>
        <Link to={`/wells/${wellId}/events`}>Events</Link>
      </nav>

      {events.status === "error" ? <ErrorBox error={events.error} /> : null}

      <div className="panel">
        <h2>Event evidence index</h2>
        <div className="channel-picker">
          <button type="button" aria-pressed={filter === "ALL"} onClick={() => setFilter("ALL")}>
            All ({list.length})
          </button>
          {types.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={filter === t}
              onClick={() => setFilter(t)}
            >
              {t.replaceAll("_", " ")} ({list.filter((e) => e.event_type === t).length})
            </button>
          ))}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event</th>
                <th>Type</th>
                <th>Document</th>
                <th>Page</th>
                <th>Confidence</th>
                <th>Data origin</th>
                <th>Extraction</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr
                  key={e.event_id}
                  className={selected && e.source_document === selected ? "selected" : ""}
                >
                  <td>
                    <Link to={`/events/${e.event_id}`}>{e.event_id}</Link>
                  </td>
                  <td>{e.event_type.replaceAll("_", " ")}</td>
                  <td>
                    {e.source_document ? (
                      <button
                        type="button"
                        className="evidence-link"
                        onClick={() => select(e.source_document as string, Number(e.source_page) || 1)}
                      >
                        {e.source_document}
                      </button>
                    ) : (
                      <span className="unavailable">unavailable</span>
                    )}
                  </td>
                  <td>{e.source_page ?? "—"}</td>
                  <td>{e.confidence ?? "—"}</td>
                  <td>
                    <span className="tag" data-origin={e.data_origin ?? undefined}>
                      {e.data_origin ?? "—"}
                    </span>
                  </td>
                  <td className="muted">{e.extraction_method ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <UnavailableNote>
          <span className="tag" data-origin="PUBLIC_REAL">
            PUBLIC_REAL
          </span>{" "}
          means the record came from a public source document. FORGE 16B(78)-32 is a
          geothermal research well operated by the University of Utah. It is not
          oil-well data, and this release contains no oil-well proprietary records.
        </UnavailableNote>
      </div>

      <div className="panel">
        <h2>Source document</h2>
        {!selected ? (
          <Empty>
            Select a document from the index above, or open one from an event, to
            see its provenance.
          </Empty>
        ) : doc.status === "loading" ? (
          <Loading />
        ) : doc.status === "error" ? (
          <ErrorBox error={doc.error} />
        ) : doc.data ? (
          <>
            <dl className="fields">
              <Field label="Document ID" value={doc.data.document_id} />
              <Field label="Name" value={doc.data.document_name} />
              <Field label="Type" value={doc.data.document_type} />
              <Field label="Source" value={doc.data.source} />
              <Field label="Published" value={doc.data.publication_date} />
              <Field label="Downloaded" value={doc.data.download_date} />
              <Field label="License" value={doc.data.license} />
              <Field
                label="File size"
                value={doc.data.file_size_bytes}
                format={(v) => `${Number(v).toLocaleString()} bytes`}
              />
              <Field label="Pages" value={doc.data.page_count} />
              <Field label="Local path" value={doc.data.file_path} />
              <Field
                label={doc.data.checksum_algorithm ?? "checksum"}
                value={doc.data.checksum}
              />
              <Field label="Data origin" value={doc.data.data_origin} />
            </dl>

            {doc.data.url ? (
              <p>
                <a className="evidence-link" href={doc.data.url} rel="noreferrer">
                  Open the public source archive
                </a>
              </p>
            ) : null}

            <h3>Page reference</h3>
            {docPage.status === "loading" ? (
              <Loading />
            ) : docPage.status === "error" ? (
              <ErrorBox error={docPage.error} />
            ) : docPage.data ? (
              <>
                <div className="controls">
                  <button
                    type="button"
                    className="evidence-link"
                    disabled={page <= 1}
                    onClick={() => select(selected, page - 1)}
                  >
                    Previous
                  </button>
                  <span className="cursor-readout">
                    Page {docPage.data.page} of {docPage.data.page_count ?? "?"}
                  </span>
                  <button
                    type="button"
                    className="evidence-link"
                    disabled={
                      docPage.data.page_count !== null && page >= docPage.data.page_count
                    }
                    onClick={() => select(selected, page + 1)}
                  >
                    Next
                  </button>
                </div>
                <p className="chart-note">{docPage.data.note}</p>
                <p className="chart-note">
                  Local file present: {docPage.data.exists ? "yes" : "no"}. This
                  release serves no extracted page text or page image, so the
                  reader is pointed at the source document instead of being shown a
                  paraphrase of it.
                </p>
                <p className="chart-note">
                  This document backs{" "}
                  <strong>{(byDocument.get(selected) ?? []).length}</strong>{" "}
                  event{(byDocument.get(selected) ?? []).length === 1 ? "" : "s"}.
                </p>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
