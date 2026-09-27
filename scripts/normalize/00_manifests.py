#!/usr/bin/env python3
"""Rebuild the manifest CSVs with a real CSV writer.

Fixes the systematic column misalignment in source_registry.csv (the `well`
column held placeholder values like "selected" for 16 of 17 rows) by giving
every field a single unambiguous meaning, and gives download_log.csv a
provenance-grade schema.

Usage:
    python scripts/normalize/00_manifests.py --build     # rewrite manifests
    python scripts/normalize/00_manifests.py --verify    # check structure only
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from nwis_lib import DATA, PROCESSED, read_csv, utc_now, write_csv  # noqa: E402

SOURCE_REGISTRY_COLUMNS = [
    "source_id", "source", "source_type", "geography", "well_scope",
    "data_types", "ingestion_status", "access_method", "url", "license",
    "notes",
]

# ingestion_status is a controlled vocabulary -- no more prose overload.
ST_PLANNED = "PLANNED"
# Source bytes are present and pinned, and have been read end to end, but no
# dataset has been built from them. Distinct from INGESTED on purpose.
ST_INSPECTED = "INSPECTED"
ST_INGESTED = "INGESTED"
ST_PARTIAL = "PARTIALLY_INGESTED"
ST_BLOCKED = "BLOCKED_AUTH"
ST_BLOCKED_NET = "BLOCKED_NETWORK"
ST_BLOCKED_AUTH = "BLOCKED_AUTH"
ST_REJECTED = "REJECTED_OUT_OF_DOMAIN"
ST_REFERENCE = "REFERENCE_ONLY"

SOURCES = [
    # --- Utah FORGE: the corpus actually ingested in this session ----------
    dict(source_id="FORGE16B_DDR", source="Utah FORGE 16B(78)-32 Daily Drilling Reports",
         source_type="well", geography="USA (Utah, Beaver County)",
         well_scope="16B(78)-32", data_types="DDR PDF (215 files, 310 pages, text layer)",
         ingestion_status=ST_INGESTED,
         access_method="direct HTTPS from gdr.openei.org",
         url="https://gdr.openei.org/files/1516/16B%20Daily%20Reports.zip",
         license="CC-BY-4.0 (data.gov)",
         notes="checksum verified; primary DDR event source for NWIS"),
    dict(source_id="FORGE16B_SURVEY", source="Utah FORGE 16B(78)-32 Final Well Survey",
         source_type="well", geography="USA (Utah)", well_scope="16B(78)-32",
         data_types="survey TXT/XLSX/PDF: MD, TVD, SSTVD, INC, AZI, N/E, DLS",
         ingestion_status=ST_INGESTED, access_method="direct HTTPS",
         url="https://gdr.openei.org/files/1516/16B%2878%29-32%20Well%20Survey.zip",
         license="CC-BY-4.0 (data.gov)",
         notes="428 stations @25ft; CRS UTM 12N NAD83 Utah-HARN; KB elev 5447.65 ft"),
    dict(source_id="FORGE16B_PASON", source="Utah FORGE 16B(78)-32 Pason surface data",
         source_type="well", geography="USA (Utah)", well_scope="16B(78)-32",
         data_types="10-second CSV (412 cols, 746905 rows), KPI daily, LAS",
         ingestion_status=ST_INGESTED, access_method="direct HTTPS",
         url="https://gdr.openei.org/files/1516/16B_Pason.zip",
         license="CC-BY-4.0 (data.gov)",
         notes="1.82 GB uncompressed; 88 daily KPI dirs carry lat/lon and rig state"),
    dict(source_id="FORGE16B_MUDLOG", source="Utah FORGE 16B(78)-32 Mud Logs",
         source_type="well", geography="USA (Utah)", well_scope="16B(78)-32",
         data_types="mud log PDF (scanned, 87), mud temperature LAS (78)",
         ingestion_status=ST_PARTIAL, access_method="direct HTTPS",
         url="https://gdr.openei.org/files/1516/16B%20Mud%20Logs.zip",
         license="CC-BY-4.0 (data.gov)",
         notes="mud log PDFs are SCANNED -> OCR required; mud-temp LAS is native"),
    dict(source_id="FORGE16B_TEMPLAS", source="Utah FORGE 16B(78)-32 mud temperature logs",
         source_type="well", geography="USA (Utah)", well_scope="16B(78)-32",
         data_types="LAS (54 files)",
         ingestion_status=ST_INGESTED, access_method="direct HTTPS",
         url="https://gdr.openei.org/files/1516/16B%20mud%20temp%20logs.zip",
         license="CC-BY-4.0 (data.gov)", notes="native LAS, no OCR needed"),
    dict(source_id="FORGE78B", source="Utah FORGE 78B-32 Daily Drilling Reports",
         source_type="well", geography="USA (Utah)", well_scope="78B-32",
         data_types="DDR PDF (93 pages, text layer)",
         ingestion_status=ST_PLANNED,
         access_method="direct HTTPS (gdr.openei.org) - needs exact file ID",
         url="https://catalog.data.gov/dataset/utah-forge-well-78b-32-daily-drilling-reports-and-logs",
         license="CC-BY-4.0 (data.gov)",
         notes="checksum recorded in download_log but file not present in this repo"),
    dict(source_id="FORGE56_32", source="Utah FORGE Well 56-32",
         source_type="well", geography="USA (Utah)", well_scope="56-32",
         data_types="drilling data and logs", ingestion_status=ST_PLANNED,
         access_method="direct HTTPS (data.amerigeoss.org)",
         url="https://data.amerigeoss.org/dataset/utah-forge-well-56-32-drilling-data-and-logs-64155",
         license="CC-BY-4.0", notes="not yet fetched"),
    dict(source_id="FORGE58_32", source="Utah FORGE Well 58-32",
         source_type="well", geography="USA (Utah)", well_scope="58-32",
         data_types="1 Hz drilling data", ingestion_status=ST_PLANNED,
         access_method="direct HTTPS (gdr.openei.org)", url="https://gdr.openei.org",
         license="CC-BY-4.0", notes="not yet fetched"),

    # --- other public corpora -------------------------------------------
    dict(source_id="VOLVE", source="Equinor Volve field (official release)",
         source_type="field", geography="Norway (North Sea)", well_scope="multi-well",
         data_types="WITSML logs, daily drilling reports, real-time drilling",
         ingestion_status=ST_BLOCKED_AUTH,
         access_method="Databricks Marketplace (account required)",
         url="https://www.equinor.com/energy/volve-data-sharing",
         license="Equinor Open Data Licence",
         notes="NOT a direct download any more; budget human time"),
    dict(source_id="VOLVE_F9A_KAGGLE", source="Volve F-9A real-time drilling (Kaggle mirror)",
         source_type="derived", geography="Norway", well_scope="F-9A",
         data_types="depth-indexed + time-indexed drilling CSV (115 cols)",
         ingestion_status=ST_BLOCKED_NET, access_method="Kaggle API (token required)",
         url="https://www.kaggle.com/datasets/imranulhaquenoor/volve-dataset-well-f-9-a",
         license="Equinor Open Data Licence (mirror licence unverified)",
         notes="checksum recorded; not present in this repo"),
    dict(source_id="VOLVE_DDR_HF", source="Volve Daily Drilling Reports (HuggingFace)",
         source_type="derived", geography="Norway", well_scope="multi-well",
         data_types="DDR WITSML -> JSON (1759 files)",
         ingestion_status=ST_BLOCKED_AUTH,
         access_method="huggingface_hub datasets.load_dataset",
         url="https://huggingface.co/datasets/bengsoon/volve_daily_drilling_report",
         license="Equinor Open Data Licence",
         notes="best structured-document source: WITSML needs no OCR and no NER "
               "for numeric content"),
    dict(source_id="VOLVE_RT_UIS", source="Volve real-time CSV (UiS parsed)",
         source_type="derived", geography="Norway", well_scope="multi-well",
         data_types="parsed WITSML real-time", ingestion_status=ST_PLANNED,
         access_method="direct download", url="see NWIS dossier refs",
         license="CC BY-NC-SA 4.0 (NON-COMMERCIAL ONLY)",
         notes="licence is incompatible with commercial deployment by OIL; "
               "flag before any use"),
    dict(source_id="FORCE2020", source="FORCE 2020 lithology competition",
         source_type="competition", geography="Norway (NPD, Norwegian "
         "Continental Shelf)", well_scope="118 wells, well-disjoint across the "
         "three published splits",
         data_types="4 semicolon CSVs (1,429,694 labelled rows), 118 LAS logs, "
                    "20 log curves, NPD lithostratigraphic lithofacies labels",
         ingestion_status=ST_INSPECTED,
         access_method="partial git clone (blobless) + sparse checkout, pinned to "
                       "one commit",
         url="https://github.com/bolgebrygg/Force-2020-Machine-Learning-competition",
         license="CC-BY-4.0 (Zenodo deposit); upstream NPD logs NLOD 2.0",
         notes="INSPECTED ONLY, NOT INGESTED. No dataset built, no model trained. "
               "Own 12-class lithofacies vocabulary, kept separate from "
               "FORGE_UTAH_16B; never merged into data/processed/. "
               "reports/force2020_inspection.md + "
               "data/force2020_wells.csv record the findings"),
    dict(source_id="FORCE2020_KAGGLE", source="FORCE 2020 well logs (Kaggle mirror)",
         source_type="competition", geography="Norway",
         well_scope="15/9-14, 15/9-15, 16/1-2, 16/10-2, 25/11-19S, 25/11-24, "
                    "31/2-7, 33/9-17, 34/10-19, 35/11-10, 7/1-1",
         data_types="well-log CSV + lithofacies + X/Y/Z per depth sample",
         ingestion_status=ST_BLOCKED_NET, access_method="Kaggle API",
         url="https://www.kaggle.com", license="NLOD 2.0 / CC-BY-4.0",
         notes="checksum recorded; redundant with FORCE2020 git source"),
    dict(source_id="BSEE_WELL", source="BSEE Well database",
         source_type="national", geography="USA Gulf of Mexico", well_scope="regional",
         data_types="well header/spatial (~57500 records)", ingestion_status=ST_PLANNED,
         access_method="web UI / API (no bulk file link confirmed)",
         url="https://www.data.bsee.gov/Main/Well.aspx", license="US Gov Public Domain",
         notes="metadata/spatial only; no drilling parameters"),
    dict(source_id="BSEE_RAW", source="BSEE Raw Data",
         source_type="national", geography="USA Gulf of Mexico", well_scope="regional",
         data_types="delimited ASCII raw feeds", ingestion_status=ST_PLANNED,
         access_method="web UI (inspect for bulk export)",
         url="https://www.data.bsee.gov/Main/RawData.aspx", license="US Gov Public Domain",
         notes="not crawled; no blind scripting until checked by hand"),
    dict(source_id="NLOG", source="NLOG Boreholes",
         source_type="national", geography="Netherlands", well_scope="regional",
         data_types="deviation surveys, stratigraphy, logs, reports",
         ingestion_status=ST_PLANNED, access_method="web UI export",
         url="https://www.nlog.nl/en/boreholes", license="NLOG open data",
         notes="older reports are SCANNED -> the one genuine OCR case in the plan"),
    dict(source_id="NDR", source="DGH National Data Repository",
         source_type="national", geography="India", well_scope="national",
         data_types="well/log/drilling/reservoir/geological/E&P",
         ingestion_status=ST_BLOCKED_AUTH,
         access_method="requires institutional registration",
         url="https://www.ndrdgh.gov.in/NDR/", license="DGH terms (approval required)",
         notes="TARGET DOMAIN for OIL; approval is manual/institutional"),
    dict(source_id="OIL_INTERNAL", source="Oil India Limited internal systems",
         source_type="proprietary", geography="India (Assam)", well_scope="OIL wells",
         data_types="eRTMAC real-time drilling, DDRs, event history, reservoir",
         ingestion_status=ST_BLOCKED_AUTH, access_method="OIL internal / VPN",
         url="n/a", license="OIL proprietary",
         notes="NOT AVAILABLE. Nothing in this repository substitutes for it."),

    # --- tooling / standards --------------------------------------------
    dict(source_id="WITSML_ENERGISTICS", source="Energistics WITSML standard",
         source_type="standard", geography="n/a", well_scope="n/a",
         data_types="schema/spec only (not well data)", ingestion_status=ST_REFERENCE,
         access_method="spec download", url="https://energistics.org/witsml-developers-users",
         license="Energistics", notes="reference"),
    dict(source_id="WITSML_DRILLFLOW", source="DrillFlow WITSML API server",
         source_type="tooling", geography="n/a", well_scope="n/a",
         data_types="WITSML server implementation", ingestion_status=ST_PLANNED,
         access_method="git clone", url="https://github.com/hashmapinc/Drillflow",
         license="Apache-2.0",
         notes="candidate for the future eRTMAC/WITSML ingestion layer"),
    dict(source_id="WITSML_PDS", source="PDS WITSML/ETP documentation",
         source_type="tooling", geography="n/a", well_scope="n/a",
         data_types="WITSML/ETP dev docs", ingestion_status=ST_REFERENCE,
         access_method="docs only", url="https://witsml.pds.technology/docs/getting-started/",
         license="n/a", notes="reference"),
]

DOWNLOAD_LOG_COLUMNS = [
    "source", "url", "file_name", "file_type", "size_bytes", "download_date",
    "checksum", "checksum_algorithm", "resolved_commit_sha", "license",
    "access_status", "local_path", "notes",
]

# access_status: VERIFIED | PRESENT_UNVERIFIED | ABSENT | BLOCKED
DOWNLOADS = [
    dict(source="FORGE16B_DDR",
         url="https://gdr.openei.org/files/1516/16B%20Daily%20Reports.zip",
         file_name="16B Daily Reports.zip", file_type="zip", size_bytes=20857806,
         download_date="2026-09-26T16:04:00Z",
         checksum="2c2475d95be35a1f3103694e2673c0e0eeab034c9af1b4e99667724cd0cffdf3",
         checksum_algorithm="sha256", resolved_commit_sha="",
         license="CC-BY-4.0", access_status="VERIFIED",
         local_path="data/raw/utah_forge/16B Daily Reports.zip",
         notes="checksum matches the pre-existing v0.1 log entry"),
    dict(source="FORGE16B_MUDLOG",
         url="https://gdr.openei.org/files/1516/16B%20Mud%20Logs.zip",
         file_name="16B Mud Logs.zip", file_type="zip", size_bytes=180966430,
         download_date="2026-09-26T16:04:00Z",
         checksum="5979fd761d48a8e07f19089a545b514e85ef3d5ccbed38d4ed4bb561a070ddc7",
         checksum_algorithm="sha256", resolved_commit_sha="",
         license="CC-BY-4.0", access_status="VERIFIED",
         local_path="data/raw/utah_forge/16B Mud Logs.zip",
         notes="87 scanned mud-log PDFs (OCR required) + 78 LAS"),
    dict(source="FORGE16B_TEMPLAS",
         url="https://gdr.openei.org/files/1516/16B%20mud%20temp%20logs.zip",
         file_name="16B mud temp logs.zip", file_type="zip", size_bytes=3174163,
         download_date="2026-09-26T16:04:00Z",
         checksum="ecefb1fb69ecda06d9cf783120f5bb74a688597a42b4230745e6cd6e017de33b",
         checksum_algorithm="sha256", resolved_commit_sha="",
         license="CC-BY-4.0", access_status="VERIFIED",
         local_path="data/raw/utah_forge/16B mud temp logs.zip", notes="54 LAS files"),
    dict(source="FORGE16B_SURVEY",
         url="https://gdr.openei.org/files/1516/16B%2878%29-32%20Well%20Survey.zip",
         file_name="16B(78)-32 Well Survey.zip", file_type="zip", size_bytes=608878,
         download_date="2026-09-26T16:04:00Z",
         checksum="38c59c9452da709fa971448699eb46fb13f452d2aa8c08cbe88fe73f08ce5302",
         checksum_algorithm="sha256", resolved_commit_sha="",
         license="CC-BY-4.0", access_status="VERIFIED",
         local_path="data/raw/utah_forge/16B(78)-32 Well Survey.zip",
         notes="TXT + XLSX + 3 PDF"),
    dict(source="FORGE16B_PASON",
         url="https://gdr.openei.org/files/1516/16B_Pason.zip",
         file_name="16B_Pason.zip", file_type="zip", size_bytes=135676899,
         download_date="2026-09-26T16:04:00Z",
         checksum="858a6eaf56c2cb3cbf45b59f431e59f82fc0ef2502ced244608d4d7b76ac54a2",
         checksum_algorithm="sha256", resolved_commit_sha="",
         license="CC-BY-4.0", access_status="VERIFIED",
         local_path="data/raw/utah_forge/16B_Pason.zip",
         notes="10 Second Data.csv is 1.82 GB uncompressed; 412 cols x 746905 rows"),
    dict(source="FORGE78B",
         url="https://catalog.data.gov/dataset/utah-forge-well-78b-32-daily-drilling-reports-and-logs",
         file_name="78B-32-DailyDrillingReports-6-27thru7-31.pdf", file_type="pdf",
         size_bytes="", download_date="2026-09-26T07:06:13Z",
         checksum="e1424b3a73dc878a09e23698a03f3f40bf59e5817bc7847af0c58d1cf384964f",
         checksum_algorithm="sha256", resolved_commit_sha="",
         license="CC-BY-4.0", access_status="ABSENT",
         local_path="", notes="checksum carried over from the v0.1 log; file not in repo"),
    dict(source="FORCE2020_KAGGLE",
         url="https://www.kaggle.com (FORCE 2020 well logs mirror)",
         file_name="force2020_well_logs.zip", file_type="zip", size_bytes="",
         download_date="2026-09-26T07:06:26Z",
         checksum="16f23dc6e8c0eb4bd2e172273765a5a2a619b73cd47dd83beed793f40b624f0f",
         checksum_algorithm="sha256", resolved_commit_sha="",
         license="NLOD 2.0 / CC-BY-4.0", access_status="ABSENT",
         local_path="", notes="blocked on Kaggle auth; redundant with FORCE2020 git"),
    dict(source="FORCE2020", url="https://github.com/bolgebrygg/Force-2020-Machine-Learning-competition",
         file_name="force2020/", file_type="git", size_bytes="",
         download_date="2026-09-26", checksum="", checksum_algorithm="",
         resolved_commit_sha="c8d01ee92c1c8e1ecba36f96cca6ea7b689338a1",
         license="CC-BY-4.0 (Zenodo deposit); upstream NPD logs NLOD 2.0",
         access_status="VERIFIED", local_path="data/raw/force2020",
         notes="partial clone (--filter=blob:none) + sparse checkout: 4 CSVs, "
               "train.zip and 1 of 118 LAS fetched, the rest left unfetched. "
               "No checksum column value: file identity is the commit tree, and "
               "reports/force2020_inspection.json records the blob id of every "
               "source file. GitHub carries no dataset LICENSE; the licence above "
               "is Zenodo record 10.5281/zenodo.4351156. Inspected only, not "
               "ingested."),
    dict(source="KICK_3W_PETROBRAS", url="https://github.com/petrobras/3W",
         file_name="petrobras_3W/", file_type="git", size_bytes="",
         download_date="", checksum="", checksum_algorithm="",
         resolved_commit_sha="", license="see repo",
         access_status="ABSENT", local_path="",
         notes="largest labelled real-world event dataset; use to validate the "
               "NWIS event ontology. v0.1 trimmed it to 2 of 11 event classes"),
]

ML_TASK_COLUMNS = ["task_id", "task", "repo_or_dataset", "url", "access_method",
                   "relevance_to_nwis", "ingestion_status", "local_path"]

ML_TASKS = [
    dict(task_id="KICK_3W_PETROBRAS", task="labelled real drilling events (11 classes)",
         repo_or_dataset="Petrobras 3W", url="https://github.com/petrobras/3W",
         access_method="git clone",
         relevance_to_nwis="benchmark for event-ontology validation and event "
                           "classifier baselines",
         ingestion_status=ST_PLANNED, local_path=""),
    dict(task_id="KICK_DATADRILL", task="kick detection / formation pressure",
         repo_or_dataset="DataDRILL (Arifeen et al. 2024)",
         url="https://doi.org/10.5281/zenodo.12759014",
         access_method="Zenodo DOI",
         relevance_to_nwis="kick + overpressure risk fusion benchmark",
         ingestion_status=ST_PLANNED, local_path=""),
    dict(task_id="STUCKPIPE_1", task="stuck pipe prediction",
         repo_or_dataset="Drilling Stuck Pipe Prediction",
         url="https://github.com/HaythamElmousalami/Drilling-Stuck-Pipe-Prediction",
         access_method="git clone",
         relevance_to_nwis="stuck-pipe hazard baseline",
         ingestion_status=ST_PLANNED, local_path=""),
    dict(task_id="TORQUE_DRAG", task="torque and drag physics model",
         repo_or_dataset="pro-well-plan/torque_drag",
         url="https://github.com/pro-well-plan/torque_drag", access_method="git clone",
         relevance_to_nwis="torque-spike residual model; state -> residual pipeline",
         ingestion_status=ST_PLANNED, local_path=""),
    dict(task_id="ROP_APMONITOR", task="drilling case studies incl. ROP",
         repo_or_dataset="APMonitor/drilling", url="https://github.com/APMonitor/drilling",
         access_method="git clone", relevance_to_nwis="ROP modelling reference",
         ingestion_status=ST_PLANNED, local_path=""),
    dict(task_id="FORCE2020_LITHO", task="lithology prediction from well logs",
         repo_or_dataset="FORCE 2020", url="https://github.com/bolgebrygg/Force-2020-Machine-Learning-competition",
         access_method="partial git clone + sparse checkout, commit-pinned",
         relevance_to_nwis="largest public well population for geology + analogue "
                           "work. External dataset: its 12-class NPD "
                           "lithofacies vocabulary is NOT the FORGE_UTAH_16B "
                           "cuttings vocabulary and is not mapped to it",
         ingestion_status=ST_INSPECTED,
         local_path="data/raw/force2020 (gitignored, unfetched blobs on demand); "
                    "findings in reports/force2020_inspection.md"),
    dict(task_id="XAI_DRILLING", task="explainable ML on drilling data",
         repo_or_dataset="XAI Drilling Dataset", url="https://www.kaggle.com",
         access_method="Kaggle API",
         relevance_to_nwis="REJECTED - the dataset is CNC/metal-machining drill-bit "
                           "wear, not oil & gas well drilling",
         ingestion_status=ST_REJECTED, local_path=""),
    dict(task_id="NNFS_PROJECT", task="scope unclear - verify before use",
         repo_or_dataset="Ashu220805/NNFS_Project",
         url="https://github.com/Ashu220805/NNFS_Project", access_method="git clone",
         relevance_to_nwis="UNVERIFIED - do not rely on until inspected",
         ingestion_status=ST_PLANNED, local_path=""),
    dict(task_id="PRODUCTION_DATA", task="oil and gas production (not drilling)",
         repo_or_dataset="banlevan/oil-and-gas-production-data",
         url="https://www.kaggle.com/datasets/banlevan/oil-and-gas-production-data",
         access_method="Kaggle API",
         relevance_to_nwis="out of scope (production, not drilling)",
         ingestion_status=ST_PLANNED, local_path=""),
]


def build() -> None:
    write_csv(DATA / "source_registry.csv", SOURCES, SOURCE_REGISTRY_COLUMNS)
    write_csv(DATA / "raw" / "download_log.csv", DOWNLOADS, DOWNLOAD_LOG_COLUMNS)
    write_csv(DATA / "ml_task_registry.csv", ML_TASKS, ML_TASK_COLUMNS)
    print(f"  [WRITE] data/source_registry.csv    ({len(SOURCES)} sources, "
          f"{len(SOURCE_REGISTRY_COLUMNS)} cols)")
    print(f"  [WRITE] data/raw/download_log.csv  ({len(DOWNLOADS)} entries, "
          f"{len(DOWNLOAD_LOG_COLUMNS)} cols)")
    print(f"  [WRITE] data/ml_task_registry.csv  ({len(ML_TASKS)} tasks, "
          f"{len(ML_TASK_COLUMNS)} cols)")


def verify() -> int:
    """Structural check: no field may be overloaded, no row may be ragged."""
    problems = 0
    for path, cols, key in (
        (DATA / "source_registry.csv", SOURCE_REGISTRY_COLUMNS, "source_id"),
        (DATA / "raw" / "download_log.csv", DOWNLOAD_LOG_COLUMNS, "file_name"),
        (DATA / "ml_task_registry.csv", ML_TASK_COLUMNS, "task_id"),
    ):
        rows = read_csv(path)
        if not rows:
            print(f"  [FAIL] {path.name} is empty")
            problems += 1
            continue
        actual = list(rows[0].keys())
        if actual != cols:
            print(f"  [FAIL] {path.name} header mismatch")
            print(f"         expected: {cols}")
            print(f"         actual  : {actual}")
            problems += 1
        ids = [r[key] for r in rows]
        if len(set(ids)) != len(ids):
            print(f"  [FAIL] {path.name} has duplicate {key}")
            problems += 1
        for r in rows:
            for c in cols:
                if c not in r:
                    print(f"  [FAIL] {path.name} row {r.get(key)} missing {c}")
                    problems += 1
        print(f"  [OK]   {path.name}: {len(rows)} rows x {len(actual)} cols, "
              f"unique {key}")
    return problems


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--build", action="store_true")
    ap.add_argument("--verify", action="store_true")
    args = ap.parse_args()
    if args.build:
        build()
    if args.verify:
        p = verify()
        print(f"\nmanifest verification: {'PASS' if p == 0 else f'{p} PROBLEM(S)'}")
        return 0 if p == 0 else 1
    if not (args.build or args.verify):
        ap.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
