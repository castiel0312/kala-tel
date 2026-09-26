#!/usr/bin/env python3
"""Extract FORGE 16B(78)-32 daily drilling reports to data/interim/.

The DDRs are born-digital PDFs (215 files, 310 pages, 100% text layer, no OCR).
They come in two layouts:

  * RIMBASE  (88 files)  - has a structured "Operations Summary" table with
    From / To / Elapsed / End MD(ft) / Code / Operations Description, plus
    Casing/Tubular Information and Mud Information tables. Primary event source.
  * ALT      (127 files) - "DAILY AFTERNOON REPORT" narrative layout with
    lithology-from/to blocks and an OPERATION SUMMARY in prose form.

PDF text is emitted in reading order, NOT table order, so the Operations Summary
must be recovered from word bounding boxes with column x-bands. A line-based
parse returns zero rows -- that was the first implementation and it silently
failed.

Outputs (all in data/interim/forge16b_78_32/, source units preserved):
    ddr_documents.csv    one row per PDF
    ddr_operations.csv   one row per Operations Summary row
    ddr_casings.csv      Casing/Tubular Information tables
    ddr_mud.csv          Mud Information tables
    ddr_bha.csv          BHA descriptions
    ddr_npt.csv          cumulative NPT to date

Usage:
    python scripts/extract/forge16b_ddr.py [--limit N]
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from nwis_lib import INTERIM, to_float, utc_now, write_csv  # noqa: E402

DDR_DIR = INTERIM / "forge16b_78_32" / "16B Daily Reports"
OUT_DIR = INTERIM / "forge16b_78_32"

# Column x-bands (points from the left margin) for the Operations Summary table.
BANDS = {"fr": (0, 85), "to": (85, 125), "el": (125, 166),
         "md": (166, 196), "cd": (196, 240)}
TIME_RE = re.compile(r"^\d{1,2}:\d{2}$")
NUM_RE = re.compile(r"^[\d,]+(?:\.\d+)?$")
CODE_RE = re.compile(r"^[A-Z][A-Z0-9]{1,6}$")
DATE_RE = re.compile(r"(\d{1,2}-[A-Z][a-z]{2}-\d{2})")

# Section boundaries in the vertical flow of a RIMBase DDR page.
STOP_MARKERS = ("Management Summary", "Comments", "Casing/Tubular Information",
                "Mud Information", "Miscellaneous Drilling Parameters",
                "Rig Information", "Solids Control", "Bulk Inventory",
                "Safety Information", "Printed:", "Fuel on hand")


def band_of(x: float):
    for k, (a, b) in BANDS.items():
        if a <= x < b:
            return k
    return "desc" if x >= 240 else None


def page_words(page):
    """Words bucketed into y-bands, ordered (y, x)."""
    buckets: dict[int, list] = {}
    for w in page.get_text("words"):
        y = round((w[1] + w[3]) / 2, 0)
        buckets.setdefault(y, []).append((w[0], str(w[4])))
    for y in buckets:
        buckets[y].sort()
    return buckets


def y_of(buckets: dict, needle: str):
    """Approximate y of the first line containing needle, or None."""
    for y in sorted(buckets):
        if needle in " ".join(t for _, t in buckets[y]):
            return y
    return None


def parse_operations(buckets: dict, start_y, end_y) -> list[dict]:
    """Recover the Operations Summary rows from word coordinates."""
    rows: list[dict] = []
    cur: dict | None = None
    for y in sorted(buckets):
        if start_y is not None and y < start_y:
            continue
        if end_y is not None and y > end_y:
            break
        for x, t in buckets[y]:
            b = band_of(x)
            if b is None:
                continue
            if b == "fr":
                if TIME_RE.match(t):
                    if cur is not None:
                        rows.append(cur)
                    cur = {"from_time": t, "to_time": "", "elapsed_hrs": "",
                           "end_md": "", "op_code": "", "description": []}
                continue
            if cur is None:
                continue
            if b == "desc":
                cur["description"].append(t)
            elif b == "to" and not cur["to_time"] and TIME_RE.match(t):
                cur["to_time"] = t
            elif b == "el" and not cur["elapsed_hrs"] and NUM_RE.match(t):
                cur["elapsed_hrs"] = t
            elif b == "md" and not cur["end_md"] and NUM_RE.match(t):
                cur["end_md"] = t
            elif b == "cd" and not cur["op_code"] and CODE_RE.match(t):
                cur["op_code"] = t
    if cur is not None:
        rows.append(cur)

    out = []
    for r in rows:
        desc = " ".join(r["description"]).strip()
        # Validation gate: a real row has a code, a description, an end MD and
        # a plausible elapsed time. Anything else is table bleed-through.
        if not (CODE_RE.match(r["op_code"] or "") and desc
                and NUM_RE.match(r["end_md"] or "")
                and to_float(r["elapsed_hrs"]) is not None):
            continue
        if len(desc) < 8:
            continue
        out.append({
            "from_time": r["from_time"],
            "to_time": r["to_time"],
            "elapsed_hrs": r["elapsed_hrs"],
            "end_md": r["end_md"],
            "op_code": r["op_code"],
            "description": desc,
        })
    return out


def parse_document_meta(page, text: str) -> dict:
    """Header fields that are reliably co-located on the line that states them."""
    meta: dict = {}
    m = re.search(r"^(\d+)\s*\nReport No:", text, re.M)
    if m:
        meta["report_no"] = m.group(1)
    m = re.search(r"Report For\s+(\d{1,2}:\d{2}\s+[AP]M)\s+(\S+)", text)
    if m:
        meta["report_time"] = m.group(1)
        meta["report_date"] = m.group(2)
    for key, pat in (
        ("well_name", r"Well Name:\s*(.+)"),
        ("field", r"^Field:\s*(.+)$"),
        ("location_ref", r"^Sect:\s*(.+)$"),
        ("operator", r"^Operator:\s*(.+)$"),
        ("current_operations", r"Current Operations:\s*\n(.+)"),
        ("planned_operations", r"Planned Operations:\s*\n(.+)"),
    ):
        mm = re.search(pat, text, re.M)
        if mm:
            meta[key] = " ".join(mm.group(1).split())
    m = re.search(r"Total NPT to date\s+([\d.]+)\s*HR", text)
    if m:
        meta["npt_to_date_hrs"] = m.group(1)
    m = re.search(r"^BHA\s*-\s*(.+)$", text, re.M)
    if m:
        meta["bha_description"] = " ".join(m.group(1).split())
    return meta


CASING_ROW = re.compile(
    r"(?P<ctype>FULL|OTHER|PARTIAL)\s+"
    r"(?P<size>\d+\.?\d*)\s+"
    r"(?P<depths>(?:-?[\d,]+(?:\.\d+)?\s+){2,4}?)"
    r"(?P<section>SURF|INT1|INT2|PROD|LINER)\s+"
    r"(?P<ohdiam>\d+\.?\d*)\s+"
    r"(?P<nomwgt>\d+\.?\d*)"
    r"(?:\s+(?P<grade>[A-Za-z]+(?:-\d+)?))?"
)


def parse_casings(text: str) -> list[dict]:
    """Casing/Tubular Information table.

    The PDF emits this table as a bare token stream, so the row shape is
    recovered with a regex anchored on the *hole section* token
    (SURF/INT1/INT2/PROD/LINER), which reliably terminates the depth block:

        FULL 16.000 4 1,136 1,135 SURF 22.000 84 J-55
        FULL 11.750 -3 3 4,837 4,837 INT1 14.750 65 OTHER

             size  <- top_md, top_tvd, bottom_md, bottom_tvd ->  <- section
                                                       oh_diam  nom_wgt  grade

    The single value after the hole-section token is the NOMINAL WEIGHT
    (lbs/ft), not the LOT mud density: 84 for 16" and 65 for 11.75" are the
    standard API weights for those sizes, whereas LOT would be 8-13 lbs/gal.
    Both DDRs leave the LOT column blank, so lot is recorded as empty rather
    than filled from the adjacent number.

    A naive fixed-arity walk of the numeric stream mis-assigns these columns
    (it produced size=16, top_tvd=1,136, bottom_md=1,135, bottom_tvd=22).
    Anchoring on the section token removes that failure mode.

    When only 3 depths are present, top_tvd is genuinely absent from the
    source, so it is left NULL and flagged rather than guessed. top_md is
    allowed to be negative: a casing shoe set 3 ft above kelly bushing is
    recorded by this operator as top_md=-3, top_tvd=3.
    """
    rows: list[dict] = []
    m = re.search(r"Casing/Tubular Information(.{0,3000}?)(?:Mud Information|$)",
                  text, re.S)
    if not m:
        return rows
    block = " ".join(m.group(1).split())
    for mm in CASING_ROW.finditer(block):
        depths = [d.replace(",", "") for d in mm.group("depths").split()]
        row = {
            "casing_type": mm.group("ctype"),
            "hole_section": mm.group("section"),
            "size_in": mm.group("size"),
            "grade": mm.group("grade") or "",
            "oh_diam_in": mm.group("ohdiam"),
            "nom_wgt_lbs_per_ft": mm.group("nomwgt"),
            "lot_lbs_per_gal": "",
            "raw_block": " ".join(block.split())[:400],
        }
        if len(depths) == 4:
            row["top_md_ft"], row["top_tvd_ft"] = depths[0], depths[1]
            row["bottom_md_ft"], row["bottom_tvd_ft"] = depths[2], depths[3]
            row["top_tvd_ambiguous"] = "no"
        elif len(depths) == 3:
            # Source printed only three depths: top_tvd is missing, not zero.
            row["top_md_ft"] = depths[0]
            row["top_tvd_ft"] = ""
            row["bottom_md_ft"], row["bottom_tvd_ft"] = depths[1], depths[2]
            row["top_tvd_ambiguous"] = "yes"
        else:
            continue
        # Plausibility gate: a shoe cannot be shallower than its top.
        b_md, t_md = to_float(row["bottom_md_ft"]), to_float(row["top_md_ft"])
        if b_md is None or t_md is None or not (0 <= b_md <= 20000):
            continue
        if t_md > b_md:
            continue
        rows.append(row)
    return rows


def parse_mud(text: str) -> list[dict]:
    """Mud Information block -- RELIABLE FIELDS ONLY.

    The DDR prints a 20+ column mud header (Dens. Vis PV YP Filt. Cake pH/ES
    Solids % Oil Water Sand LGS Cl Ca 10s 10m 30m In Out Loss Mud Temp Gels
    CaCl) but typically supplies only three bare values underneath, in an
    unspecified order. Assigning them positionally is unsafe: one report gives
    "27 / 100 / 70", and no consistent reading satisfies PV < YP. Rather than
    fabricate rheology, only the fields that are unambiguously labelled are
    captured and the raw block is retained for later OCR of the mud logs.

    Native, unambiguous mud data comes from the 54 CWLS LAS files instead
    (MTIA/MTOA mud temperature in/out) -- see forge16b_mudtemp_las.py.
    """
    rows: list[dict] = []
    m = re.search(r"Mud Information(.{0,600}?)(?:Mud Consumables|Engineering|"
                  r"Casing/Tubular|$)", text, re.S)
    if not m:
        return rows
    block = " ".join(m.group(1).split())
    row: dict = {"raw_block": block[:400], "props_mapped": "no"}
    mm = re.search(r"Mud Pits,\s*Type:\s*(.+?)\s*\d", block)
    if mm:
        row["mud_system"] = mm.group(1).strip()
    mm = re.search(r"at Depth\s+([\d,]+)\s*ft", block)
    if mm:
        row["depth_ft"] = mm.group(1)
    mm = re.search(r"(\d{1,2}-[A-Z][a-z]{2}-\d{2})\s+(\d{1,2}:\d{2})", block)
    if mm:
        row["sample_date"], row["sample_time"] = mm.group(1), mm.group(2)
    rows.append(row)
    return rows


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    if not DDR_DIR.exists():
        print(f"NOT FOUND: {DDR_DIR}")
        print("Run: make fetch && python scripts/ingest/extract_forge16b.py")
        return 1

    import fitz

    files = sorted(p for p in DDR_DIR.glob("*.pdf"))
    if args.limit:
        files = files[:args.limit]

    documents, operations, casings, muds, bhas, npts = [], [], [], [], [], []
    layout_counts: dict[str, int] = {}

    for p in files:
        try:
            doc = fitz.open(p)
        except Exception as e:
            print(f"  [SKIP] {p.name}: unreadable ({e})")
            continue
        full = "\n".join(doc[i].get_text() for i in range(doc.page_count))
        layout = "RIMBASE" if "RIMBase" in full else "ALT"
        layout_counts[layout] = layout_counts.get(layout, 0) + 1
        meta = parse_document_meta(doc[0], full)

        documents.append({
            "file_name": p.name,
            "document_type": "DDR",
            "layout": layout,
            "page_count": str(doc.page_count),
            "report_no": meta.get("report_no", ""),
            "report_date": meta.get("report_date", ""),
            "report_time": meta.get("report_time", ""),
            "well_name": meta.get("well_name", "FORGE 16B(78)-32"),
            "field": meta.get("field", ""),
            "location_ref": meta.get("location_ref", ""),
            "operator": meta.get("operator", ""),
            "current_operations": meta.get("current_operations", ""),
            "planned_operations": meta.get("planned_operations", ""),
            "has_operations_table": "yes" if "Operations Summary" in full else "no",
            "has_casing_table": "yes" if "Casing/Tubular Information" in full else "no",
            "has_mud_table": "yes" if "Mud Information" in full else "no",
            "extracted_at": utc_now(),
        })

        if meta.get("npt_to_date_hrs"):
            npts.append({"file_name": p.name,
                         "npt_to_date_hrs": meta["npt_to_date_hrs"]})
        if meta.get("bha_description"):
            bhas.append({"file_name": p.name,
                         "bha_description": meta["bha_description"]})

        if layout == "RIMBASE":
            for pi in range(doc.page_count):
                page = doc[pi]
                pt = page.get_text()
                if "Operations Summary" not in pt:
                    continue
                buckets = page_words(page)
                start = y_of(buckets, "End MD(ft)")
                end = None
                for mk in STOP_MARKERS:
                    yy = y_of(buckets, mk)
                    if yy is not None and (end is None or yy < end):
                        end = yy
                for op in parse_operations(buckets, start, end):
                    operations.append({
                        "file_name": p.name, "page": str(pi + 1),
                        **op,
                    })
            for c in parse_casings(full):
                casings.append({"file_name": p.name, **c})
            for mrow in parse_mud(full):
                muds.append({"file_name": p.name, **mrow})
        doc.close()

    write_csv(OUT_DIR / "ddr_documents.csv", documents, list(documents[0].keys()))
    if operations:
        write_csv(OUT_DIR / "ddr_operations.csv", operations, list(operations[0].keys()))
    if casings:
        write_csv(OUT_DIR / "ddr_casings.csv", casings, list(casings[0].keys()))
    if muds:
        write_csv(OUT_DIR / "ddr_mud.csv", muds, list(muds[0].keys()))
    if bhas:
        write_csv(OUT_DIR / "ddr_bha.csv", bhas, list(bhas[0].keys()))
    if npts:
        write_csv(OUT_DIR / "ddr_npt.csv", npts, list(npts[0].keys()))

    print(f"  layouts            : {layout_counts}")
    print(f"  documents          : {len(documents)}")
    print(f"  operation rows     : {len(operations)}")
    print(f"  casing rows        : {len(casings)}")
    print(f"  mud property rows  : {len(muds)}")
    print(f"  BHA descriptions   : {len(bhas)}")
    print(f"  NPT-to-date records: {len(npts)}")
    print(f"  written            : {utc_now()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
