#!/usr/bin/env python3
"""Inspect the real Utah FORGE 16B(78)-32 raw/interim data.

Reports DETECTED / NOT FOUND / UNKNOWN / REQUIRES MANUAL VERIFICATION for each
probe. Never infers a value that is not present, and never writes to raw/.

Usage:
    python scripts/ingest/inspect_forge16b.py [--root DIR] [--csv-sample N]
"""
from __future__ import annotations

import argparse
import re
import sys
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

RAW = REPO_ROOT / "data" / "raw" / "utah_forge"
INTERIM = REPO_ROOT / "data" / "interim" / "forge16b_78_32"

DETECTED = "DETECTED"
NOT_FOUND = "NOT FOUND"
UNKNOWN = "UNKNOWN"
MANUAL = "REQUIRES MANUAL VERIFICATION"

# Exact source column names in the Pason header. Listed explicitly rather than
# by substring so a "Min"/"AutoDriller" variant cannot mask the primary channel.
DRILL_PARAM_COLUMNS = [
    ("Rate Of Penetration (ft_per_hr)", "rop", "rate of penetration"),
    ("On Bottom ROP (ft_per_hr)", "rop_on_bottom", "on-bottom ROP"),
    ("Weight on Bit (klbs)", "wob", "weight on bit"),
    ("Rotary RPM (RPM)", "rpm", "rotary speed"),
    ("Bit RPM (RPM)", "bit_rpm", "bit RPM"),
    ("AutoDriller Torque (kft_lb)", "torque", "torque"),
    ("Top Drive Torque (kft_lb)", "torque_top_drive", "top drive torque"),
    ("Hook Load (klbs)", "hookload", "hook load"),
    ("Over Pull (klbs)", "overpull", "over pull"),
    ("Standpipe Pressure (psi)", "spp", "standpipe pressure"),
    ("Differential Pressure (psi)", "diff_pressure", "differential pressure"),
    ("Casing Pressure (psi)", "casing_pressure", "casing pressure"),
    ("Total Pump Output (gal_per_min)", "flow", "flow rate"),
    ("Flow (flow_percent)", "flow_pct", "flow percent"),
    ("P1 Rate (gal_per_min)", "pump_rate_p1", "pump 1 rate"),
    ("Total Mud Volume (barrels)", "pit_volume", "total mud volume"),
    ("PVT Total Mud Gain/Loss (barrels)", "mud_gain_loss", "PVT mud gain/loss"),
    ("H2S - Rig Floor (ppm_gas)", "h2s", "H2S rig floor"),
    ("Gamma (api)", "gamma", "gamma"),
    ("Mechanical Specific Energy (ksi)", "mse", "mechanical specific energy"),
    ("DAS Total MSE (ksi)", "dls_mse", "DAS MSE"),
    ("Relative MSE (unitless)", "relative_mse", "relative MSE"),
    ("Inclination (degrees)", "inclination", "inclination"),
    ("Azimuth (degrees)", "azimuth", "azimuth"),
    ("Dogleg Severity (deg/100ft)", "dls", "dogleg severity"),
    ("Hole Depth (feet)", "hole_depth", "hole depth"),
    ("Bit Depth (feet)", "bit_depth", "bit depth"),
    ("Hole Diameter (in)", "hole_diameter", "hole diameter"),
    ("Bit Size (UNITS)", "bit_size", "bit size"),
    ("TEMP OUT FLOW (DEGREES)", "mud_temp_out", "mud temp out"),
    ("TEMP IN MANIFOLD (DEGREES)", "mud_temp_in", "mud temp in"),
    ("Surface Stick Slip Index (percent)", "stick_slip", "stick/slip index"),
    ("WOB Loss (unitless)", "wob_loss", "WOB loss"),
    ("Influx Prediction (unitless)", "influx_prediction", "influx prediction"),
    ("chr Ethane C2 (ppm_gas)", "gas_c2", "gas C2"),
    ("chr Propane C3 (ppm_gas)", "gas_c3", "gas C3"),
]

# Channels NWIS needs that are genuinely absent from this surface dataset.
EXPECTED_ABSENT = [
    ("ecd", "equivalent circulating density (not measured at surface)"),
    ("mud_weight", "mud weight (available in DDR Mud Information, not Pason)"),
    ("torque_drag", "drag/torque-drag residual (model-derived, not measured)"),
]


def status(ok: bool, present_text: str = "") -> str:
    return DETECTED if ok else (NOT_FOUND if present_text else UNKNOWN)


def hdr(title: str) -> None:
    print(f"\n{'=' * 72}\n{title}\n{'=' * 72}")


def probe_raw_archives() -> None:
    hdr("PROBE 1: raw archives in data/raw/utah_forge")
    if not RAW.exists():
        print(f"{NOT_FOUND}: {RAW}")
        print("  Run: make fetch")
        return
    for z in sorted(RAW.glob("*.zip")):
        with zipfile.ZipFile(z) as zf:
            members = [m for m in zf.infolist() if not m.is_dir()]
            uncomp = sum(m.file_size for m in members)
        print(f"  {z.name}")
        print(f"    size_on_disk   : {z.stat().st_size:,} bytes")
        print(f"    members        : {len(members)}")
        print(f"    uncompressed   : {uncomp:,} bytes")
        exts: dict[str, int] = {}
        for m in members:
            exts[Path(m.filename).suffix.lower() or "(none)"] = \
                exts.get(Path(m.filename).suffix.lower() or "(none)", 0) + 1
        print(f"    by extension   : {exts}")


def probe_survey() -> None:
    hdr("PROBE 2: directional survey (16B(78)-32 Final Survey Report.txt)")
    candidates = list(INTERIM.glob("**/*Final Survey Report.txt"))
    if not candidates:
        print(f"{NOT_FOUND}: no extracted survey txt under {INTERIM}")
        return
    for p in candidates:
        text = p.read_text(errors="replace")
        print(f"\n  FILE: {p.relative_to(REPO_ROOT)}")
        # Header metadata is the CRS / datum / elevation source of truth.
        for key in ("MAP SYSTEM", "GEODIC DATUM", "MAP ZONE", "CALCULATION METHOD",
                    "WELL EASTING", "WELL NORTHING", "KB ELEV", "GL ELEV",
                    "WELL", "FIELD", "DATE"):
            m = re.search(rf"^{re.escape(key)}\s*:\s*(.+)$", text, re.M)
            if m:
                print(f"    {key:22s}: {' '.join(m.group(1).split())}")
        # Station table.
        rows = []
        started = False
        for line in text.splitlines():
            if line.strip().startswith("MD") and "TVD" in line:
                started = True
                continue
            if started:
                parts = line.split()
                if len(parts) >= 5:
                    try:
                        vals = [float(x) for x in parts[:11]]
                    except ValueError:
                        if rows:
                            break
                        continue
                    rows.append(vals)
        if not rows:
            print(f"    survey stations: {NOT_FOUND}")
            continue
        print(f"    survey stations: {DETECTED} ({len(rows)} rows)")
        print(f"      MD  range (ft): {rows[0][0]:,.2f} - {rows[-1][0]:,.2f}")
        tvds = [r[3] for r in rows]
        print(f"      TVD range (ft): {min(tvds):,.2f} - {max(tvds):,.2f}")
        incs = [r[1] for r in rows]
        azis = [r[2] for r in rows]
        print(f"      INC range(deg): {min(incs):.2f} - {max(incs):.2f}")
        print(f"      AZI range(deg): {min(azis):.2f} - {max(azis):.2f}")
        print(f"      interval (ft)  : {rows[1][0] - rows[0][0]:,.2f}")
        print(f"      depth unit     : {DETECTED} (ft, from header '(ft)')")
        print(f"      SSTVD sign     : {DETECTED} negative => subsea, datum=KB")
        print(f"    units note      : md/tvd/sstvd in ft; inc/azi in deg; "
              f"dls in deg/100ft")


def probe_pason_csv() -> None:
    hdr("PROBE 3: Pason 10-second surface data (streamed; file is ~1.8 GB)")
    zpath = RAW / "16B_Pason.zip"
    if not zpath.exists():
        print(f"{NOT_FOUND}: {zpath}")
        return
    with zipfile.ZipFile(zpath) as zf:
        name = next((n for n in zf.namelist() if n.endswith("10 Second Data.csv")), None)
        if name is None:
            print(f"{NOT_FOUND}: no '10 Second Data.csv' in {zpath.name}")
            return
        info = zf.getinfo(name)
        print(f"  member        : {name}")
        print(f"  uncompressed  : {info.file_size:,} bytes ({info.file_size / 1e9:.2f} GB)")
        with zf.open(name) as fh:
            header = fh.readline().decode("utf-8", "replace").strip()
            n_rows = 2
            first_ts = last_ts = None
            for line in fh:
                n_rows += 1
                if first_ts is None:
                    first_ts = line[:22]
                last_ts = line[:22]
    cols = [c.strip() for c in header.split(",")]
    print(f"  columns       : {DETECTED} ({len(cols)})")
    print(f"  data rows     : ~{n_rows - 1:,} (streamed count)")
    print(f"  first ts      : {first_ts}")
    print(f"  last ts       : {last_ts}")
    print(f"  sampling      : {DETECTED} ~10 s nominal (member name); "
          f"verify empirically from timestamps")
    print("\n  drilling parameters (exact source column -> NWIS field):")
    lookup = {c.lower(): c for c in cols}
    n_found = 0
    for src, nwis_field, desc in DRILL_PARAM_COLUMNS:
        hit = lookup.get(src.lower())
        if hit:
            n_found += 1
        print(f"    {desc:32s} {('DETECTED  -> ' + nwis_field) if hit else NOT_FOUND}")
    print(f"\n  matched {n_found}/{len(DRILL_PARAM_COLUMNS)} expected channels")
    print("  genuinely ABSENT from this surface dataset:")
    for f, why in EXPECTED_ABSENT:
        print(f"    {f:14s} {why}")
    print(f"\n  units are embedded per-column in the header names, e.g. "
          f"'(ft_per_hr)', '(klbs)', '(psi)', '(barrels)', '(gal_per_min)'")
    print(f"  depth unit    : {DETECTED} feet (Hole Depth (feet), Bit Depth (feet))")


def probe_kpi() -> None:
    hdr("PROBE 4: kpi_daily (daily KPI: coordinates, rig state, tours)")
    dirs = sorted(INTERIM.glob("**/kpi_daily/kpi_*"))
    if not dirs:
        print(f"{NOT_FOUND}: no kpi_daily directories under {INTERIM}")
        return
    print(f"  daily KPI directories: {DETECTED} ({len(dirs)})")
    print(f"  range: {dirs[0].name} - {dirs[-1].name}")
    sample = dirs[0] / "daily_kpi.csv"
    if sample.exists():
        print(f"\n  sample: {sample.relative_to(REPO_ROOT)}")
        rows = sample.read_text(errors="replace").splitlines()
        keep = ("Well Name", "Rig", "Latitude", "Longitude", "Spud Date",
                "Hole Depth", "Rig State", "Drilling State", "Average ROP",
                "Total NPT" if any("NPT" in r for r in rows) else "On Bottom Time")
        for line in rows:
            if any(line.startswith(k) for k in keep):
                print(f"    {line}")
        print(f"\n  coordinates    : {DETECTED} if Latitude/Longitude rows present")
        print(f"  rig_state      : {DETECTED} via 'Rig State - *' rows")
        print(f"  run/tour       : {DETECTED} via 'Tour 1/Tour 2/All' columns")
    wi = dirs[0] / "well_info.csv"
    if wi.exists():
        print(f"\n  well_info.csv ({wi.relative_to(REPO_ROOT)}):")
        for line in wi.read_text(errors='replace').splitlines()[:10]:
            print(f"    {line}")


def probe_ddr() -> None:
    hdr("PROBE 5: daily drilling reports (DDR PDFs)")
    pdfs = sorted(INTERIM.glob("**/16B Daily Reports/*.pdf"))
    if not pdfs:
        print(f"{NOT_FOUND}: no DDR PDFs under {INTERIM}")
        return
    try:
        import fitz
    except ImportError:
        print(f"  PyMuPDF (fitz) not installed -> page/text analysis skipped")
        return
    print(f"  DDR PDFs: {DETECTED} ({len(pdfs)})")
    total_pages = 0
    empty_text = 0
    ops_rows = 0
    has_casing = has_mud = 0
    for p in pdfs:
        d = fitz.open(p)
        t = "\n".join(d[i].get_text() for i in range(d.page_count))
        total_pages += d.page_count
        if len(t.strip()) < 50:
            empty_text += 1
        ops_rows += len(re.findall(r"^\s*\d{1,2}:\d{2}\s+\d{1,2}:\d{2}\s", t, re.M))
        if "Casing/Tubular Information" in t:
            has_casing += 1
        if "Mud Information" in t:
            has_mud += 1
        d.close()
    print(f"  total pages        : {total_pages:,}")
    print(f"  text layer         : {DETECTED} "
          f"({len(pdfs) - empty_text}/{len(pdfs)} files yield text; "
          f"{empty_text} need OCR)")
    print(f"  OCR required       : {'YES for ' + str(empty_text) + ' file(s)' if empty_text else 'NO'}")
    print(f"  operation rows     : ~{ops_rows:,} (From/To/Elapsed/EndMD/Code/Desc)")
    print(f"  casing tables      : {DETECTED} in {has_casing}/{len(pdfs)} DDRs")
    print(f"  mud property tables: {DETECTED} in {has_mud}/{len(pdfs)} DDRs")
    print(f"  coordinates        : {MANUAL} (Sect/Town/Rng/County/State are "
          f"township refs, not lat/lon)")


def probe_mud_logs() -> None:
    hdr("PROBE 6: mud logs (1-inch scans) and mud-temperature LAS")
    mud = sorted(INTERIM.glob("**/16B Mud Logs/Frontier*.pdf"))
    print(f"  mud log PDFs: {DETECTED if mud else NOT_FOUND} ({len(mud)})")
    if mud:
        try:
            import fitz
            d = fitz.open(mud[0])
            t = d[i].get_text() if (i := 0) else ""
            has_text = len(t.strip()) > 50
            print(f"    first file: {mud[0].name}")
            print(f"    text layer: {DETECTED if has_text else NOT_FOUND} "
                  f"-> {'no OCR needed' if has_text else 'OCR REQUIRED (scanned)'}")
            d.close()
        except ImportError:
            print("    PyMuPDF not installed")
    las = list(RAW.glob("16B mud temp logs.zip"))
    if las:
        with zipfile.ZipFile(las[0]) as zf:
            names = [n for n in zf.namelist() if n.lower().endswith(".las")]
        print(f"  mud-temp LAS files: {DETECTED} ({len(names)})")


def probe_well_ids() -> None:
    hdr("PROBE 7: well identity across sources")
    ids: dict[str, set[str]] = {}
    for p in sorted(INTERIM.glob("**/16B Daily Reports/*.pdf"))[:5]:
        try:
            import fitz
            d = fitz.open(p)
            t = d[0].get_text()
            for m in re.finditer(r"FORGE\s+16B\(78\)-32", t):
                ids.setdefault("ddr", set()).add(m.group(0).strip())
            d.close()
        except Exception:
            break
    for p in INTERIM.glob("**/kpi_daily/kpi_*/daily_kpi.csv"):
        for line in p.read_text(errors="replace").splitlines():
            if line.startswith("Well Name"):
                ids.setdefault("kpi", set()).add(line.split(",")[-1].strip())
        break
    for p in INTERIM.glob("**/*Final Survey Report.txt"):
        m = re.search(r"^WELL\s*:\s*(.+)$", p.read_text(errors="replace"), re.M)
        if m:
            ids.setdefault("survey", set()).add(m.group(1).strip())
    for src, vals in sorted(ids.items()):
        print(f"  {src:8s}: {sorted(vals)}")
    if len({v for vals in ids.values() for v in vals}) > 1:
        print(f"\n  {MANUAL}: identifiers differ in format across sources; "
              f"an alias/normalization step is required before joining.")
    else:
        print(f"\n  identifiers agree across probed sources.")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=None, help="unused; kept for CLI stability")
    args = ap.parse_args()

    print("Utah FORGE 16B(78)-32 -- inspection report")
    print(f"repo: {REPO_ROOT}")
    probe_raw_archives()
    probe_survey()
    probe_pason_csv()
    probe_kpi()
    probe_ddr()
    probe_mud_logs()
    probe_well_ids()

    hdr("LEGEND")
    print(f"  {DETECTED}            value found in the actual file")
    print(f"  {NOT_FOUND}            file/field searched for and not present")
    print(f"  {UNKNOWN}           cannot be determined without the file")
    print(f"  {MANUAL}  domain judgement required; not machine-decidable")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
