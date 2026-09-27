import type { ReactNode } from "react";

/**
 * Renders a value, or an explicit unavailable marker when the source has none.
 *
 * This is the central no-fabrication guard in the UI. A null value never
 * becomes 0, "-", or an empty cell that could read as "measured and zero";
 * it always becomes a labelled statement that the data is absent, with the
 * reason when one is known.
 */
export function Value({
  value,
  reason,
  format,
}: {
  value: number | string | null | undefined;
  reason?: string;
  format?: (v: number | string) => string;
}) {
  if (value === null || value === undefined || value === "") {
    return (
      <span className="unavailable" title={reason ?? "Not reported by the source"}>
        Unavailable
      </span>
    );
  }
  if (typeof value === "number") {
    return <span className="value">{format ? format(value) : value.toLocaleString()}</span>;
  }
  return <span className="value">{value}</span>;
}

export function UnavailableNote({ children }: { children: ReactNode }) {
  return (
    <p className="unavailable-note" role="note">
      {children}
    </p>
  );
}

export function Field({
  label,
  value,
  reason,
  format,
}: {
  label: string;
  value: number | string | null | undefined;
  reason?: string;
  format?: (v: number | string) => string;
}) {
  return (
    <div className="field">
      <dt>{label}</dt>
      <dd>
        <Value
          value={value}
          {...(reason !== undefined ? { reason } : {})}
          {...(format !== undefined ? { format } : {})}
        />
      </dd>
    </div>
  );
}

export function Loading() {
  return <p className="loading">Loading…</p>;
}

export function ErrorBox({ error }: { error: string }) {
  return (
    <p className="error" role="alert">
      {error}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}
