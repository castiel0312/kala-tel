#!/usr/bin/env python3
"""Extract the FORGE 16B(78)-32 "alt layout" daily reports.

Two report families exist in 16B Daily Reports.zip:

  * 88 RIMBASE PDFs  -- handled by forge16b_ddr.py (Operations Summary table)
  * 131 alt reports  -- handled HERE:
        127 "DAILY MORNING/AFTERNOON REPORT" PDFs (narrative + lithology)
          4 "...REPORT_<date>.xls"  (BIFF, the final days of the well)

Both alt variants are born-digital. The PDFs are two-column forms whose text
layer emits labels and values out of reading order, so values are recovered
from word bounding boxes: for each label, take the nearest token to its right
that is not itself a label, allowing a few rows of vertical slack (several
fields wrap their value onto the adjacent row).

This layout is also the only DDR variant that prints RKB ELEVATION, and it
reports 5447.65 ft -- independently confirming the survey report's KB elevation
and contradicting the RIMBASE "RKB Elevation" cell, which actually holds the
report number and is therefore not parseable.

Field resolution is measured, not assumed: unresolved fields are left empty
and counted. Nothing is inferred to fill a gap.

Outputs (data/interim/forge16b_78_32/):
    alt_documents.csv     one row per alt report (pdf + xls)
    alt_lithology.csv     lithology description text with its depth
    alt_operations.csv    narrative operation summaries
    alt_field_resolution.csv  per-field parse-rate audit

Usage:
    python scripts/extract/forge16b_ddr_alt.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from nwis_lib import INTERIM, to_float, utc_now, write_csv  # noqa: E402

DDR_DIR = INTERIM / "forge16b_78_32" / "16B Daily Reports"
OUT_DIR = INTERIM / "forge16b_78_32"

# label -> output field. Longest labels are matched first so that
# "PREVIOUS MIDNIGHT DEPTH (FT MDRT)" wins over "MIDNIGHT DEPTH (FT MDRT)".
LABELS: dict[str, str] = {
    "PREVIOUS MIDNIGHT DEPTH (FT MDRT)": "prev_midnight_md_ft",
    "MIDNIGHT DEPTH (FT MDRT)": "midnight_md_ft",
    "Current Hole Depth (FT)": "current_hole_md_ft",
    "24 HRS PROGRESS (FT)": "progress_24h_ft",
    "LAST CASING SHOE (FT MDRT)": "last_casing_shoe_md_ft",
    "LAST CASING": "last_casing",
    "LAST SURVEY (MD/INC/AZI))": "last_survey",
    "RKB ELEVATION": "rkb_ft",
    "SPUD DATE": "spud_date",
    "MUD TYPE": "mud_type",
    "MW IN (PPG)": "mud_weight_in_ppg",
    "MW OUT (PPG)": "mud_weight_out_ppg",
    "ECD (PPG)": "ecd_ppg",
    "MUD PIT TEMPERATURE (deg C)": "mud_pit_temp_c",
    "FLOW LINE TEMPERATURE (deg C)": "flow_line_temp_c",
    "RIG / TYPE": "rig",
    "CUSTOMER": "customer",
    "REPORT NUMBER": "report_no",
    "COMPANY REPRESENTATIVES": "company_reps",
    "MUD LOGGERS": "mud_loggers",
    "SAMPLE CATCHERS": "sample_catchers",
    "WELL": "well",
}
NARRATIVE = {
    "LAST 24 HOURS OPERATION SUMMARY": "last_24h_ops",
    "NEXT 24 HOURS OPERATION": "next_24h_ops",
}
# Section headings that must never be swallowed as a value.
STOP_WORDS = {
    "LITHOLOGY", "DRILL EVENTS", "DRILLING PARAMETERS", "PREVIOUS DRILLING",
    "GENERAL INFORMATION", "GENERAL MUD INFORMATION", "FROM / TO DEPTH",
    "Description", "OPERATION SUMMARY", "PARAMETER", "DEPTH", "MAXIMUM",
    "AVERAGE", "DAILY MORNING REPORT", "DAILY AFTERNOON REPORT",
    "DAILY MORNING REPORT_", "SUMMARY", "SPP", "FLOW IN", "ROP",
    "First Sample On Tour", "12:00 Sample", "Last Sample Before Report",
    "Page", "WELL", "MW IN (PPG)", "MW OUT (PPG)",
}
NUMERIC = re.compile(r"^-?[\d,]+(?:\.\d+)?'?(?: ?MD)?$")
PLACEHOLDER = {"----", "-", "--", "N/A", "n/a", "NA"}


def buckets(page) -> dict:
    b: dict[int, list] = {}
    for w in page.get_text("words"):
        y = round((w[1] + w[3]) / 2, 0)
        b.setdefault(y, []).append((w[0], str(w[4])))
    for y in b:
        b[y].sort()
    return b


def label_at(toks, i):
    """If a known label starts at token i, return (label, n_tokens)."""
    for lab in sorted(LABELS, key=len, reverse=True):
        lt = lab.split()
        if [t for _, t in toks[i:i + len(lt)]] == lt:
            return lab, len(lt)
    for lab in sorted(NARRATIVE, key=len, reverse=True):
        lt = lab.split()
        if [t for _, t in toks[i:i + len(lt)]] == lt:
            return lab, len(lt)
    return None, 0


def is_label_token(t: str) -> bool:
    return t in STOP_WORDS or t in LABELS or t in NARRATIVE


def parse_fields(b: dict) -> dict:
    """Pair each label with the nearest non-label tokens to its right."""
    ys = sorted(b)
    out: dict = {}
    for yi, y in enumerate(ys):
        toks = b[y]
        i = 0
        while i < len(toks):
            lab, n = label_at(toks, i)
            if not lab:
                i += 1
                continue
            field = LABELS.get(lab) or NARRATIVE.get(lab)
            label_end_x = toks[i + n - 1][0]
            # Walk right on the same row for a value.
            val, j = [], i + n
            while j < len(toks) and not label_at(toks, j)[0] \
                    and toks[j][1] not in STOP_WORDS:
                val.append(toks[j][1])
                j += 1
            # Some fields wrap their value onto the next row in the same column.
            if not val and yi + 1 < len(ys):
                nxt = b[ys[yi + 1]]
                val = [t for x, t in nxt if x > label_end_x
                       and not is_label_token(t)][:4]
            if val and field:
                joined = " ".join(val).strip()
                if joined not in PLACEHOLDER:
                    out.setdefault(field, joined)
            i = max(j, i + 1)
    return out


def clean_depth(v: str) -> str:
    """'10947' MD' -> '10947'."""
    if not v:
        return ""
    m = re.match(r"^-?[\d,]+(?:\.\d+)?", v.strip())
    return m.group(0).replace(",", "") if m else ""


SAMPLE_MARKERS = ("First Sample On Tour", "12:00 Sample",
                  "Last Sample Before Report")


def parse_lithology(b: dict) -> list[dict]:
    """Lithology description blocks and their associated sample depths.

    The section is a two-column form: labels ("First Sample On Tour",
    "12:00 Sample", "Last Sample Before Report") sit in the left column with
    their depth stamp on the NEXT row at the same x, while the free-text
    description occupies the right column (x >= ~140) and wraps over rows.

    A flattened-text regex cannot recover this: it yields the literal header
    "FROM / TO DEPTH Description" as if it were a description and attaches no
    depth at all. Rows are therefore read structurally, and a description only
    receives a depth when a depth marker is genuinely adjacent to it.
    """
    ys = sorted(b)
    start = end = None
    for k, y in enumerate(ys):
        line = " ".join(t for _, t in b[y])
        if start is None and "LITHOLOGY" in line:
            start = k
        elif start is not None and ("DRILL EVENTS" in line
                                    or "LAST 24 HOURS" in line
                                    or "NEXT 24 HOURS" in line):
            end = k
            break
    if start is None:
        return []
    end = end if end is not None else len(ys)

    rows: list[dict] = []
    for k in range(start, end):
        y = ys[k]
        toks = b[y]
        line = " ".join(t for _, t in toks)
        marker = next((m for m in SAMPLE_MARKERS if m in line), None)
        if marker:
            depth = ""
            if k + 1 < end:
                nxt = [t for x, t in b[ys[k + 1]] if x < 160]
                m = re.match(r"^(\d{2,5})'", " ".join(nxt).strip())
                if m:
                    depth = m.group(1)
            rows.append({"sample_point": marker, "depth_ft": depth,
                         "description": ""})
            continue
        if any(m in line for m in SAMPLE_MARKERS):
            continue
        if line.strip() in ("", "FROM / TO DEPTH", "Description",
                            "FROM / TO DEPTH Description"):
            continue
        # Description text: right-hand column, substantive length.
        desc = " ".join(t for x, t in toks if x >= 130).strip()
        if len(desc) < 18 or not re.search(r"[A-Z]{3}", desc):
            continue
        if desc.upper().startswith(("DRILL EVENTS", "AVERAGE", "NO DRILLING")):
            continue
        if rows and not rows[-1]["description"]:
            rows[-1]["description"] = desc[:600]
        else:
            rows.append({"sample_point": "", "depth_ft": "",
                         "description": desc[:600]})
    return [r for r in rows if r["description"]]


def parse_lithology_rows_text(text: str) -> list[dict]:
    """Tab-separated variant of parse_lithology for the .xls reports."""
    b: dict[int, list] = {}
    for i, line in enumerate(text.splitlines()):
        toks = [(j * 10.0, t) for j, t in enumerate(line.split("\t")) if t]
        if toks:
            b[float(i)] = toks
    return parse_lithology(b)


def iso_from_name(name: str) -> str:
    """'..._5-15-23.pdf' -> '2023-05-15'. The name is M-D-YY, not D-M-YY."""
    m = re.search(r"_(\d{1,2})-(\d{1,2})-(\d{2})\.pdf$", name)
    if not m:
        return ""
    mo, da, yr = (int(g) for g in m.groups())
    if not (1 <= mo <= 12 and 1 <= da <= 31):
        return ""
    return f"20{yr:02d}-{mo:02d}-{da:02d}"


# Tokens belonging to the drilling-parameter tables that sit between the
# operation-summary label and its text. The PDF emits them interleaved with
# the narrative, so a naive slice yields "SPP First Sample On Tour 5540' 12:00
# Sample FLOW IN ROP MW OUT (PPG) 8.4" instead of the operations prose.
TABLE_TOKENS = (
    "SPP", "FLOW IN", "FLOW LINE TEMPERATURE", "MW IN", "MW OUT",
    "MUD PIT TEMPERATURE", "ECD", "AVERAGE", "MAXIMUM", "PARAMETER",
    "DRILLING PARAMETERS", "PREVIOUS DRILLING", "First Sample On Tour",
    "12:00 Sample", "Last Sample Before Report", "WOB", "ROP",
    "DRILL EVENTS", "NEXT 24 HOURS", "LAST 24 HOURS", "LITHOLOGY",
    "GENERAL MUD INFORMATION", "FROM / TO DEPTH", "Description",
)
OP_VERBS = (
    "DRIL", "TIH", "TOOH", "POOH", "REAM", "CASING", "CEMEN", "PUMP", "CIRC",
    "TRIP", "MIX", "SPUD", "RIG", "RUN", "COR", "LOG", "COND", "WASH",
    "HOLE", "BHA", "BIT", "KILL", "CHOK", "PACK", "STUCK", "TIGHT", "LOST",
    "ABANDON", "TEST", "SURVEY", "MOVE", "REAC", "FLOW", "DISPLAC",
)


def prose_only(text: str, min_len: int = 25) -> str:
    """Longest operation-prose segment, with parameter-table noise removed."""
    segs = re.split("|".join(re.escape(t) for t in TABLE_TOKENS), text)
    best = ""
    for s in segs:
        s = " ".join(s.split()).strip(" .:-")
        if len(s) < min_len:
            continue
        if not re.search(r"[a-z]{3}", s):
            continue
        if not re.search(r"[A-Z]{3}", s):
            continue
        if not any(v in s.upper() for v in OP_VERBS):
            continue
        if len(s) > len(best):
            best = s
    return best


def parse_narrative_ops(text: str) -> list[dict]:
    """Operation-summary prose blocks (time window + text)."""
    rows = []
    for m in re.finditer(
            r"(\d{4})\s*-\s*(\d{4})\s*OPERATION SUMMARY\s*(.{0,700}?)"
            r"(?=(?:NEXT 24 HOURS|LAST 24 HOURS|DRILL EVENTS|OPERATION SUMMARY)|$)",
            text, re.S):
        body = prose_only(m.group(3))
        if len(body) < 25:
            continue
        rows.append({"from_hhmm": m.group(1), "to_hhmm": m.group(2),
                     "summary": body[:600]})
    return rows


def read_xls(path: Path) -> tuple[dict, list[dict], list[dict], str]:
    """The 4 BIFF reports have clean label/value columns."""
    try:
        import xlrd
    except ImportError:
        return {}, [], [], "xlrd not installed"
    try:
        book = xlrd.open_workbook(str(path))
    except Exception as e:  # pragma: no cover
        return {}, [], [], f"unreadable: {e}"
    sheet = book.sheet_by_index(0)
    # Layout: label in col 0 -> value in col 4, and a second label in col 11 ->
    # value in col 16. A 1-3 column lookahead finds nothing; scan 6 ahead.
    out: dict = {}
    for r in range(sheet.nrows):
        for c in (0, 11):
            if c >= sheet.ncols:
                continue
            lab = str(sheet.cell_value(r, c)).strip()
            field = LABELS.get(lab)
            if not field or field in out:
                continue
            for cc in range(c + 1, min(c + 7, sheet.ncols)):
                raw = sheet.cell_value(r, cc)
                if raw != "" and str(raw).strip():
                    out[field] = str(raw).strip()
                    break
    out.pop("well", None)
    # Excel serial dates -> ISO.
    for key, fmt in (("spud_date", 0), ("report_no", 1)):
        if key in out:
            try:
                val = float(out[key])
            except ValueError:
                continue
            if key == "spud_date":
                out[key] = xlrd.xldate_as_datetime(val, 0).strftime("%Y-%m-%d")
            else:
                out[key] = str(int(val))
    text = "\n".join(
        "\t".join(str(sheet.cell_value(r, c)).strip()
                  for c in range(sheet.ncols))
        for r in range(sheet.nrows))
    return out, parse_lithology_rows_text(text), parse_narrative_ops(text), ""


def main() -> int:
    if not DDR_DIR.exists():
        print(f"NOT FOUND: {DDR_DIR}")
        return 1
    import fitz

    docs: list[dict] = []
    lith: list[dict] = []
    ops: list[dict] = []
    resolved: dict[str, int] = {}
    n_pdf = n_xls = 0

    pdfs = sorted(p for p in DDR_DIR.glob("*.pdf") if p.name.startswith("Utah Forge"))
    xls = sorted(DDR_DIR.glob("*.xls"))

    for p in pdfs:
        try:
            d = fitz.open(p)
        except Exception as e:
            print(f"  [SKIP] {p.name}: {e}")
            continue
        n_pdf += 1
        page = d[0]
        text = page.get_text()
        f = parse_fields(buckets(page))
        full = "\n".join(fitz.open(p)[i].get_text() for i in range(d.page_count))
        lith_rows = parse_lithology(buckets(page))
        op_rows = parse_narrative_ops(full)
        for k in f:
            resolved[k] = resolved.get(k, 0) + 1
        for r in lith_rows:
            lith.append({"file_name": p.name, **r})
        for r in op_rows:
            ops.append({"file_name": p.name, "source": "OPERATION SUMMARY", **r})
        m = re.search(r"DRILL EVENTS\s*(.{0,600}?)(?=FLOW LINE TEMPERATURE|"
                      r"DRILLING PARAMETERS|$)", full, re.S)
        if m:
            ev = prose_only(" ".join(m.group(1).split()), min_len=30)
            if len(ev) > 25:
                ops.append({"file_name": p.name, "source": "DRILL EVENTS",
                            "from_hhmm": "", "to_hhmm": "", "summary": ev[:600]})
        rkb_raw = f.get("rkb_ft", "")
        rkb_tok = re.match(r"^-?[\d,]+(?:\.\d+)?", rkb_raw.strip())
        docs.append({
            "file_name": p.name, "format": "pdf", "layout": "ALT",
            "page_count": str(d.page_count),
            "report_date": iso_from_name(p.name),
            "report_no": f.get("report_no", ""),
            "rkb_ft": rkb_tok.group(0).replace(",", "") if rkb_tok else "",
            "spud_date": f.get("spud_date", ""),
            "current_hole_md_ft": clean_depth(f.get("current_hole_md_ft", "")),
            "midnight_md_ft": clean_depth(f.get("midnight_md_ft", "")),
            "prev_midnight_md_ft": clean_depth(f.get("prev_midnight_md_ft", "")),
            "progress_24h_ft": clean_depth(f.get("progress_24h_ft", "")),
            "last_casing": f.get("last_casing", ""),
            "last_casing_shoe_md_ft": clean_depth(f.get("last_casing_shoe_md_ft", "")),
            "last_survey": f.get("last_survey", ""),
            "mud_type": f.get("mud_type", "").split()[0]
                        if f.get("mud_type") else "",
            "mud_weight_in_ppg": f.get("mud_weight_in_ppg", ""),
            "mud_weight_out_ppg": f.get("mud_weight_out_ppg", ""),
            "ecd_ppg": f.get("ecd_ppg", ""),
            "mud_pit_temp_c": f.get("mud_pit_temp_c", ""),
            "flow_line_temp_c": f.get("flow_line_temp_c", ""),
            "rig": f.get("rig", ""), "customer": f.get("customer", ""),
            "company_reps": f.get("company_reps", ""),
            "mud_loggers": f.get("mud_loggers", ""),
            "sample_catchers": f.get("sample_catchers", ""),
            "last_24h_ops": f.get("last_24h_ops", ""),
            "next_24h_ops": f.get("next_24h_ops", ""),
            "lithology_rows": str(len(lith_rows)),
            "op_rows": str(len(op_rows)),
        })
        d.close()

    for p in xls:
        n_xls += 1
        f, lith_rows, op_rows, err = read_xls(p)
        if err:
            print(f"  [WARN] {p.name}: {err}")
            continue
        for k in f:
            resolved[k] = resolved.get(k, 0) + 1
        for r in lith_rows:
            lith.append({"file_name": p.name, **r})
        for r in op_rows:
            ops.append({"file_name": p.name, "source": "OPERATION SUMMARY", **r})
        rkb_tok = re.match(r"^-?[\d,]+(?:\.\d+)?", f.get("rkb_ft", "").strip())
        docs.append({
            "file_name": p.name, "format": "xls", "layout": "ALT",
            "page_count": "", "report_date": p.stem.rsplit("_", 1)[-1],
            "report_no": f.get("report_no", ""),
            "rkb_ft": rkb_tok.group(0).replace(",", "") if rkb_tok else "", "spud_date": f.get("spud_date", ""),
            "current_hole_md_ft": clean_depth(f.get("current_hole_md_ft", "")),
            "midnight_md_ft": clean_depth(f.get("midnight_md_ft", "")),
            "prev_midnight_md_ft": clean_depth(f.get("prev_midnight_md_ft", "")),
            "progress_24h_ft": clean_depth(f.get("progress_24h_ft", "")),
            "last_casing": f.get("last_casing", ""),
            "last_casing_shoe_md_ft": clean_depth(f.get("last_casing_shoe_md_ft", "")),
            "last_survey": f.get("last_survey", ""),
            "mud_type": f.get("mud_type", "").split()[0]
                        if f.get("mud_type") else "",
            "mud_weight_in_ppg": f.get("mud_weight_in_ppg", ""),
            "mud_weight_out_ppg": f.get("mud_weight_out_ppg", ""),
            "ecd_ppg": f.get("ecd_ppg", ""),
            "mud_pit_temp_c": f.get("mud_pit_temp_c", ""),
            "flow_line_temp_c": f.get("flow_line_temp_c", ""),
            "rig": f.get("rig", ""), "customer": f.get("customer", ""),
            "company_reps": f.get("company_reps", ""),
            "mud_loggers": f.get("mud_loggers", ""),
            "sample_catchers": f.get("sample_catchers", ""),
            "last_24h_ops": "", "next_24h_ops": "",
            "lithology_rows": str(len(lith_rows)), "op_rows": str(len(op_rows)),
        })

    doc_cols = ["file_name", "format", "layout", "page_count", "report_date",
                "report_no", "rkb_ft", "spud_date", "current_hole_md_ft", "midnight_md_ft",
                "prev_midnight_md_ft", "progress_24h_ft", "last_casing",
                "last_casing_shoe_md_ft", "last_survey", "mud_type",
                "mud_weight_in_ppg", "mud_weight_out_ppg", "ecd_ppg",
                "mud_pit_temp_c", "flow_line_temp_c", "rig", "customer",
                "company_reps", "mud_loggers", "sample_catchers",
                "last_24h_ops", "next_24h_ops", "lithology_rows", "op_rows"]
    write_csv(OUT_DIR / "alt_documents.csv", docs, doc_cols)
    write_csv(OUT_DIR / "alt_lithology.csv", lith,
              ["file_name", "sample_point", "depth_ft", "description"])
    write_csv(OUT_DIR / "alt_operations.csv", ops,
              ["file_name", "source", "from_hhmm", "to_hhmm", "summary"])

    total = n_pdf + n_xls
    res_rows = [{"field": f, "resolved": str(resolved.get(f, 0)),
                 "of": str(total),
                 "rate_pct": f"{100.0 * resolved.get(f, 0) / total:.1f}"
                 if total else ""}
                for f in sorted(set(LABELS.values()) | set(NARRATIVE.values()))]
    write_csv(OUT_DIR / "alt_field_resolution.csv", res_rows,
              ["field", "resolved", "of", "rate_pct"])

    rkb = {d["rkb_ft"] for d in docs if d["rkb_ft"]}
    print(f"  alt reports       : {n_pdf} pdf + {n_xls} xls = {total}")
    print(f"  lithology rows    : {len(lith)}")
    print(f"  narrative op rows : {len(ops)}")
    print(f"  RKB elevation seen: {sorted(rkb) if rkb else 'none'}")
    print(f"  survey report KB  : 5447.65 ft (cross-check)")
    print("  field resolution  :")
    for r in res_rows:
        if int(r["resolved"]):
            print(f"      {r['field']:24s} {r['resolved']:>4s}/{r['of']}  "
                  f"{r['rate_pct']:>5s}%")
    unresolved = [r["field"] for r in res_rows if not int(r["resolved"])]
    if unresolved:
        print(f"  UNRESOLVED (left empty, not guessed): {unresolved}")
    print(f"  written           : {utc_now()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
