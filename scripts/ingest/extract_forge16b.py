#!/usr/bin/env python3
"""Safely extract FORGE 16B(78)-32 raw ZIP archives into data/interim/.

raw/ is never modified. Path traversal, absolute paths and symlink members are
rejected before anything is written to disk.

Usage:
    python scripts/ingest/extract_forge16b.py [--archive NAME] [--list-only]
"""
from __future__ import annotations

import argparse
import posixpath
import zipfile
from pathlib import Path, PurePosixPath

RAW_DIR = Path("data/raw/utah_forge")
INTERIM_DIR = Path("data/interim/forge16b_78_32")

# Large members are listed but not extracted by default: the Pason 10-second
# CSV alone is ~1.8 GB and is streamed by the normalizer instead.
DEFAULT_SKIP_PREFIXES = ("10 Second Data.csv",)
DEFAULT_SKIP_SUFFIXES = (".las",)


class UnsafeMember(Exception):
    """Raised when a zip member would write outside the target directory."""


def is_unsafe(name: str) -> str | None:
    """Return a reason string if the member is unsafe, else None."""
    if not name or name.endswith("/"):
        return None
    # Reject drive letters / UNC paths and any absolute path.
    if name.startswith("/") or name.startswith("\\"):
        return "absolute path"
    if len(name) > 1 and name[1] == ":":
        return "drive-letter path"
    # Normalise separators, then look for traversal after resolution.
    normalised = name.replace("\\", "/")
    parts = PurePosixPath(normalised).parts
    if ".." in parts:
        return "path traversal (..)"
    resolved = posixpath.normpath(normalised)
    if resolved.startswith("/") or resolved.startswith("../"):
        return "escapes target directory"
    return None


def safe_extract(zf: zipfile.ZipFile, target: Path, skip_prefixes, skip_suffixes,
                 list_only: bool) -> tuple[int, int, int]:
    """Extract members of zf into target. Returns (extracted, skipped, rejected)."""
    target.mkdir(parents=True, exist_ok=True)
    root = target.resolve()
    extracted = skipped = rejected = 0

    for info in zf.infolist():
        name = info.filename
        if info.is_dir():
            continue

        reason = is_unsafe(name)
        if reason is not None:
            print(f"  [REJECTED] {name} -> {reason}")
            rejected += 1
            continue

        if name.startswith(skip_prefixes) or name.lower().endswith(skip_suffixes):
            print(f"  [SKIP-LARGE] {name} ({info.file_size:,} bytes) - stream instead")
            skipped += 1
            continue

        if list_only:
            print(f"  [LIST] {info.file_size:>14,}  {name}")
            skipped += 1
            continue

        # Re-resolve and confirm containment (defence in depth).
        dest = (target / name).resolve()
        if root != dest and root not in dest.parents:
            print(f"  [REJECTED] {name} -> escapes target directory")
            rejected += 1
            continue

        dest.parent.mkdir(parents=True, exist_ok=True)
        with zf.open(info) as src, open(dest, "wb") as out:
            while chunk := src.read(1 << 20):
                out.write(chunk)
        extracted += 1

    return extracted, skipped, rejected


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--archive", help="Only extract this archive (default: all)")
    ap.add_argument("--list-only", action="store_true",
                    help="List members without writing anything")
    ap.add_argument("--include-large", action="store_true",
                    help="Also extract the Pason 10-second CSV and LAS files")
    args = ap.parse_args()

    if not RAW_DIR.exists():
        print(f"No raw archives found in {RAW_DIR.resolve()}")
        print("Run: make fetch   (or scripts/ingest/download_sources.sh)")
        return 1

    zips = sorted(RAW_DIR.glob("*.zip"))
    if args.archive:
        zips = [z for z in zips if args.archive.lower() in z.name.lower()]
    if not zips:
        print(f"No matching archives in {RAW_DIR.resolve()}")
        return 1

    skip_prefixes = () if args.include_large else DEFAULT_SKIP_PREFIXES
    skip_suffixes = () if args.include_large else DEFAULT_SKIP_SUFFIXES

    totals = [0, 0, 0]
    for zpath in zips:
        target = INTERIM_DIR / zpath.stem
        print(f"\n[ARCHIVE] {zpath.name}")
        with zipfile.ZipFile(zpath) as zf:
            bad = zf.testzip()
            if bad is not None:
                print(f"  [CORRUPT] first bad member: {bad}")
                return 2
            e, s, r = safe_extract(zf, target, skip_prefixes, skip_suffixes,
                                   args.list_only)
            print(f"  extracted={e} skipped={s} rejected={r} -> {target}")
            totals[0] += e
            totals[1] += s
            totals[2] += r

    print(f"\nTOTAL extracted={totals[0]} skipped={totals[1]} rejected={totals[2]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
