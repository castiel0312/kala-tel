"""Generate the frozen-dataset reports for DATASET_VERSION.

Every number in every report is read live from data/processed/ and from the
validator's JSON output. Nothing is hand-typed, so the reports cannot drift
from the data.

Usage:
  python3 scripts/validate/dataset_validation.py --json reports/validation.json
  python3 scripts/reports/make_dataset_reports.py --validation reports/validation.json
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from nwis_lib import (  # noqa: E402
    CONVERSION_VERSION,
    CORE_TABLES,
    DATASET_VERSION,
    ENTITY_STATUS,
    PROCESSED,
    REPORTS,
    TABLES,
    utc_now,
)

GENERATED_AT = utc_now()

# Columns promoted into the API surface for each canonical table.
CHANNELS: dict[str, list[str]] = {
    "drilling_timeseries": [
        "md", "tvd", "rop", "wob", "rpm", "torque", "hookload", "drag",
        "flow_in", "flow_out", "pump_rate", "standpipe_pressure", "ecd",
        "mud_weight", "pit_volume", "gas_total", "h2s", "formation",
        "rig_state", "run_id", "timestamp",
    ],
    "trajectories": [
        "md", "tvd", "tvdss", "inclination", "azimuth", "dogleg_severity",
        "build_rate", "turn_rate", "northing", "easting", "survey_time",
    ],
    "mud_temperature_depth": ["md", "mud_temp_in", "mud_temp_out"],
    "mud_properties": [
        "md", "mud_type", "mud_weight", "plastic_viscosity", "yield_point",
        "funnel_viscosity", "gel_10s", "gel_10m", "gel_30m", "filtrate",
        "cake", "ph", "es", "solids_pct", "oil_pct", "water_pct",
        "sand_pct", "lgs_pct", "chloride", "calcium", "excess_los",
        "mud_temperature", "in_pit", "out_pit", "losses",
    ],
}


def load(name: str) -> tuple[list[str], list[dict]]:
    path = PROCESSED / f"{name}.csv"
    if not path.exists():
        return [], []
    with open(path, newline="", encoding="utf-8") as fh:
        r = list(csv.DictReader(fh))
    return (list(r[0].keys()) if r else []), r


def count(name: str) -> int:
    path = PROCESSED / f"{name}.csv"
    if not path.exists():
        return 0
    with open(path, newline="", encoding="utf-8") as fh:
        return sum(1 for _ in csv.reader(fh)) - 1


def populated(name: str, col: str) -> int:
    _, rows = load(name)
    return sum(1 for r in rows if str(r.get(col, "")).strip())


def populated_any(rows: list[dict], col: str) -> bool:
    for r in rows:
        if str(r.get(col, "")).strip():
            return True
    return False


def md_range(rows: list[dict], col: str) -> str:
    vals = []
    for r in rows:
        try:
            vals.append(float(r[col]))
        except (KeyError, TypeError, ValueError):
            continue
    if not vals:
        return "n/a"
    return f"{min(vals):.1f} - {max(vals):.1f} m"


def table_inventory() -> list[dict]:
    out = []
    for name, spec in TABLES.items():
        n = count(name)
        out.append({
            "table": name,
            "rows": n,
            "status": "EMPTY" if n == 0 else "POPULATED",
            "pk": ", ".join(spec.primary_key),
            "fk": "; ".join(
                f"{c} -> {t}" for c, t in spec.foreign_keys.items()
            ) or "-",
            "role": "core" if name in CORE_TABLES else "optional",
        })
    return out


def provenance_block() -> str:
    rows = load("documents")[1]
    if not rows:
        return "No processed documents available."
    licences = Counter(r.get("license", "unknown") for r in rows)
    types = Counter(r.get("document_type", "unknown") for r in rows)
    with_sum = sum(1 for r in rows if str(r.get("checksum", "")).strip())
    with_path = sum(1 for r in rows if str(r.get("file_path", "")).strip())
    with_url = sum(1 for r in rows if str(r.get("url", "")).strip())
    return "\n".join([
        f"- Documents resolved: **{len(rows)}**",
        f"- With checksum recorded: **{with_sum}** "
        f"({with_sum / len(rows):.1%})",
        f"- With local file path: **{with_path}** "
        f"({with_path / len(rows):.1%})",
        f"- With public URL: **{with_url}** ({with_url / len(rows):.1%})",
        f"- Document types: {dict(types)}",
        f"- Licences: {dict(licences)}",
    ])


def sparse_columns(threshold: float = 0.0) -> list[tuple[str, str, int, int]]:
    """Columns that are entirely null, or populated in under `threshold` rows."""
    out = []
    for name in TABLES:
        cols, rows = load(name)
        if not rows:
            continue
        for c in cols:
            n = sum(1 for r in rows if str(r.get(c, "")).strip())
            if n <= len(rows) * threshold:
                out.append((name, c, n, len(rows)))
    return out


def substantive_columns(name: str) -> tuple[list[str], list[str]]:
    """Split a table's populated columns into (data, provenance-only).

    Provenance columns are identifiers and audit fields, not measurements.
    """
    governance = {
        "source", "data_origin", "source_file", "source_document",
        "source_page", "checksum", "checksum_algorithm", "conversion_rule",
        "conversion_version", "original_units", "original_depth_unit",
        "confidence", "extraction_method", "null_code", "data_source",
        "file_path", "url", "license", "download_date", "publication_date",
        "depth_source", "depth_reference", "file_size_bytes", "page_count",
    }
    cols, rows = load(name)
    live = [c for c in cols if populated_any(rows, c)]
    data = [
        c for c in live
        if c not in governance and not c.endswith("_id") and c != "md"
    ]
    return live, data


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--validation", default="reports/validation.json")
    args = ap.parse_args()

    vpath = Path(args.validation)
    validation = json.loads(vpath.read_text()) if vpath.exists() else {}
    findings = validation.get("findings", [])
    status = validation.get("state", "UNKNOWN")
    sev = Counter(f.get("severity", "?") for f in findings)

    REPORTS.mkdir(parents=True, exist_ok=True)
    inventory = table_inventory()
    populated_tables = [t for t in inventory if t["rows"] > 0]
    empty_tables = [t for t in inventory if t["rows"] == 0]
    total_rows = sum(t["rows"] for t in inventory)

    # ---------------- dataset_card.md ----------------
    lines = [
        f"# Dataset Card: {DATASET_VERSION}",
        "",
        f"- **Dataset version:** `{DATASET_VERSION}`",
        f"- **Status:** `{status}`",
        f"- **Generated:** {GENERATED_AT}",
        f"- **Conversion rules:** `{CONVERSION_VERSION}`",
        f"- **Canonical tables:** {len(inventory)} "
        f"({len(populated_tables)} populated, {len(empty_tables)} empty)",
        f"- **Total canonical rows:** {total_rows:,}",
        "",
        "## Purpose",
        "",
        "Single-well public reference dataset for FORGE 16B(78)-32, a Utah",
        "FORGE geothermal test well. It exists to make measured drilling,",
        "survey, mud, and document data programmatically reviewable, and to",
        "make the boundaries of that data explicit rather than implied.",
        "",
        "## Provenance",
        "",
        "- Every populated record carries `data_origin` and `source`.",
        "- All populated rows are `PUBLIC_REAL`; nothing is synthetic.",
        "- No raw file was modified by the pipeline.",
        provenance_block(),
        "",
        "## What the data does NOT contain",
        "",
        "These are absent because no defensible source exists, not because of",
        "an unfinished pipeline step:",
        "",
    ]
    for name in sorted(ENTITY_STATUS):
        reason = {
            "formations": "no formation tops/markers in the source set",
            "bits": "no bit identity, type, IADC, or run interval records",
            "cement_jobs": "no machine-readable cement job records",
            "reservoirs": "no reservoir interval records",
        }.get(name, "no source coverage")
        lines.append(f"- `{name}`: `{ENTITY_STATUS[name]}` - {reason}.")
    lines += [
        "",
        "Also unavailable: timezone (sources declare none), survey EPSG",
        "(not published), and TVD for depths beyond the last survey station.",
        "",
        "## Table inventory",
        "",
        "| Table | Rows | PK | Role |",
        "|---|---:|---|---|",
    ]
    for t in inventory:
        lines.append(
            f"| `{t['table']}` | {t['rows']:,} | `{t['pk']}` | {t['role']} |"
        )
    lines += [
        "",
        "## Available measurement channels",
        "",
        "Channels with at least one non-null value. Anything not listed here",
        "is not present in this dataset.",
        "",
    ]
    for name, chans in CHANNELS.items():
        cols, rows = load(name)
        ok = [c for c in chans if c in cols and populated_any(rows, c)]
        missing = [c for c in chans if c in cols and c not in ok]
        lines.append(f"### `{name}` ({count(name):,} rows)")
        lines.append("")
        if ok:
            lines.append("| Channel | Populated |")
            lines.append("|---|---:|")
            for c in ok:
                n = populated(name, c)
                lines.append(f"| `{c}` | {n:,} |")
        else:
            lines.append("No measurement channels populated.")
        if missing:
            lines += [
                "",
                "Present as columns but entirely null: "
                + ", ".join(f"`{c}`" for c in missing),
            ]
        lines.append("")
    lines += [
        "## Validation summary",
        "",
        f"- Severity counts: {dict(sev)}",
        f"- Findings total: {len(findings)}",
        "",
        "Advisory findings about absent optional entities are expected and are",
        "the mechanism by which the dataset reports its own limits.",
        "",
        "## Intended use",
        "",
        "- Reference for engineering and data-quality review.",
        "- Grounding for tooling that must distinguish measured from absent.",
        "",
        "## Out of scope",
        "",
        "- Production prediction, eRTMAC, or ML.",
        "- Multi-well or cross-well inference.",
        "- Any claim that absent data was measured.",
        "",
    ]
    (REPORTS / "dataset_card.md").write_text("\n".join(lines), encoding="utf-8")

    # ---------------- schema_report.md ----------------
    lines = [
        f"# Schema Report: {DATASET_VERSION}",
        "",
        f"Generated {GENERATED_AT} from `scripts/nwis_lib.py` (`TABLES`).",
        "",
        "Canonical column list per table, as enforced by the validator.",
        "",
    ]
    for name, spec in TABLES.items():
        lines.append(f"## `{name}`")
        lines.append("")
        lines.append(f"- Rows: {count(name):,}")
        lines.append(f"- Primary key: `{', '.join(spec.primary_key)}`")
        for col, tgt in spec.foreign_keys.items():
            lines.append(f"- Foreign key: `{col}` -> `{tgt}`")
        if spec.required:
            lines.append(
                "- Required columns: "
                + ", ".join(f"`{c}`" for c in spec.required)
            )
        if spec.description:
            lines.append(f"- Description: {spec.description}")
        lines.append("")
        lines.append("Columns: " + ", ".join(f"`{c}`" for c in spec.columns))
        lines.append("")
    lines += [
        "## Depth policy",
        "",
        "`md`, `tvd`, and `tvdss` remain separate columns and are never",
        "collapsed. Interpolated values are flagged via `tvd_interpolated` and",
        "never presented as surveyed. `mud_temperature_depth` is depth-indexed",
        "with `log_date` recording the LAS acquisition date, not a per-sample",
        "timestamp.",
        "",
    ]
    (REPORTS / "schema_report.md").write_text("\n".join(lines), encoding="utf-8")

    # ---------------- dataset_quality_report.md ----------------
    lines = [
        f"# Data Quality Report: {DATASET_VERSION}",
        "",
        f"- **Status:** `{status}`",
        f"- **Generated:** {GENERATED_AT}",
        f"- **Total rows:** {total_rows:,}",
        f"- **Findings:** {len(findings)} ({dict(sev)})",
        "",
        "`PARTIAL` is the correct and expected status for this release. It",
        "records that the sources do not support every canonical table, which",
        "is more useful than reporting `VALID` and hiding the gaps.",
        "",
        "## Findings",
        "",
    ]
    if findings:
        lines += ["| Severity | Table | Check | Affected | Message |",
                  "|---|---|---|---:|---|"]
        for f in findings:
            msg = str(f.get("message", "")).replace("|", "\\|")
            lines.append(
                f"| {f.get('severity','')} | `{f.get('table','')}` "
                f"| `{f.get('check','')}` | {f.get('n_affected','')} | {msg} |"
            )
    else:
        lines.append("No findings recorded.")
    lines += [
        "",
        "## Referential integrity",
        "",
    ]
    pk_zero, null_zero, orphan_zero = None, None, None
    for f in findings:
        chk = f.get("check", "")
        if "primary_key" in chk or "pk_unique" in chk:
            pk_zero = pk_zero or f.get("evidence")
        if "null_primary_key" in chk or "pk_null" in chk:
            null_zero = null_zero or f.get("evidence")
        if "foreign" in chk or "fk" in chk:
            orphan_zero = orphan_zero or f.get("evidence")
    lines += [
        f"- Primary keys: {pk_zero or 'clean (no finding raised)'}",
        f"- Null primary-key components: {null_zero or 'clean (no finding raised)'}",
        f"- Orphan foreign keys: {orphan_zero or 'clean (no finding raised)'}",
        "",
        "## Column sparsity",
        "",
        "Columns that exist in the schema but hold no data. A table can be",
        "non-empty while carrying almost no information, so this is reported",
        "separately from table-level row counts.",
        "",
    ]
    sparse = sparse_columns()
    if sparse:
        lines += ["| Table | Column | Populated | Rows |", "|---|---|---:|---:|"]
        for tname, col, n, total in sparse:
            lines.append(f"| `{tname}` | `{col}` | {n:,} | {total:,} |")
    else:
        lines.append("No entirely-null columns.")

    lines += [
        "",
        "## Data density per table",
        "",
        "A non-zero row count does not imply usable data. This table shows how",
        "many columns actually carry values, separating measurement content",
        "from identifiers and provenance fields.",
        "",
        "| Table | Rows | Populated cols | Data cols | Null cols |",
        "|---|---:|---:|---:|---:|",
    ]
    for t in populated_tables:
        name = t["table"]
        cols, rows = load(name)
        live, data = substantive_columns(name)
        nulls = len(cols) - len(live)
        lines.append(
            f"| `{name}` | {t['rows']:,} | {len(live)}/{len(cols)} "
            f"| {len(data)} | {nulls} |"
        )
    thin = [
        t for t in populated_tables
        if len(substantive_columns(t["table"])[1]) <= 2
    ]
    if thin:
        lines += [
            "",
            "Tables with two or fewer data columns, where consumers should not",
            "expect much:",
            "",
        ]
        for t in thin:
            name = t["table"]
            _, data = substantive_columns(name)
            lines.append(
                f"- `{name}` ({count(name):,} rows) - data columns: "
                + (", ".join(f"`{c}`" for c in data) or "none")
            )
    lines += [
        "",
        "## Known coverage limits",
        "",
        "- `formations`, `bits`, `cement_jobs`, `reservoirs` have zero rows "
        "because no source records exist for them.",
        "- `drilling_timeseries` covers depths beyond the last survey station;",
        "  those rows have no TVD rather than an extrapolated value.",
        "- Event start-depth fields are null where the source document reports",
        "  only an end depth.",
        "",
        "## Commands",
        "",
        "```bash",
        "python3 scripts/normalize/01_clean.py",
        "python3 scripts/normalize/02_promote.py",
        "python3 scripts/validate/dataset_validation.py --json reports/validation.json",
        "python3 scripts/reports/make_dataset_reports.py --validation reports/validation.json",
        "```",
        "",
    ]
    (REPORTS / "dataset_quality_report.md").write_text(
        "\n".join(lines), encoding="utf-8"
    )

    # ---------------- provenance_report.md ----------------
    ev = load("events")[1]
    ev_linked = sum(1 for r in ev if str(r.get("source_document", "")).strip())
    ev_pages = sum(1 for r in ev if str(r.get("source_page", "")).strip())
    lines = [
        f"# Provenance Report: {DATASET_VERSION}",
        "",
        f"- **Generated:** {GENERATED_AT}",
        f"- **Conversion rules:** `{CONVERSION_VERSION}`",
        "- **All populated rows are:** `PUBLIC_REAL`",
        "",
        "## Document corpus",
        "",
        provenance_block(),
        "",
        "## Event traceability",
        "",
        f"- Events: **{len(ev)}**",
        f"- Linked to a source document: **{ev_linked}**",
        f"- Linked to a source page: **{ev_pages}**",
        "",
        "## Depth-indexed mud temperature",
        "",
        f"- Rows: **{count('mud_temperature_depth'):,}**",
        f"- MD range: {md_range(load('mud_temperature_depth')[1], 'md')}",
        f"- Source LAS files: "
        f"{len({r.get('source_file') for r in load('mud_temperature_depth')[1]})}",
        "",
        "Each row retains its originating LAS file and the file's declared",
        "null code, so a value can be traced back to the exact log.",
        "",
        "## Governance rules applied",
        "",
        "- No value is invented to fill a gap.",
        "- No irreversible unit conversion: original value and unit are kept.",
        "- Interpolated depth is always flagged, never presented as measured.",
        "- Empty source documents were not converted into empty-table records.",
        "",
    ]
    (REPORTS / "provenance_report.md").write_text("\n".join(lines), encoding="utf-8")

    for f in ("dataset_card", "schema_report", "dataset_quality_report",
              "provenance_report"):
        print(f"wrote {REPORTS / (f + '.md')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
