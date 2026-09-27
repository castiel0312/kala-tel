"""
build_manifest.py
-----------------
Write MANIFEST.json: a file inventory with sizes and SHA-256 checksums, plus
the verified environment and model configuration.

    python scripts/build_manifest.py
"""

from __future__ import annotations

import hashlib
import json
import platform
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "MANIFEST.json"

SKIP = {".git", "__pycache__", ".ipynb_checkpoints"}
DESCRIBE = {
    "README.md": "Quick start, layout, measured-vs-claimed summary",
    "MODEL_CARD.md": "Data, features, model, metrics, limitations, intended use",
    "LICENSE": "MIT for code; CC-BY-4.0 for the bundled data and derived model",
    "requirements.txt": "Pinned dependency versions",
    "docs/ARCHITECTURE.md": "Pipeline diagram and rationale",
    "kickdet/detector.py": "KickDetector: load, score, DetectorReport",
    "kickdet/features.py": "The 35 causal features",
    "kickdet/columns.py": "Channel registry, banned and dead channels",
    "kickdet/ensemble.py": "MeanEnsemble: equal-weight mean of the three members",
    "kickdet/episodes.py": "Operator-visible alarm-episode accounting",
    "kickdet/onset.py": "Physical-influx onset detection",
    "kickdet/stress.py": "240-event synthetic grid; false-alarm counting",
    "scripts/predict.py": "Command-line inference",
    "scripts/verify.py": "Self-contained verification checks",
    "scripts/retrain.py": "Full reproduction from the raw CSV",
    "scripts/finalize_bundle.py": "One-time artifact finaliser (research repo only)",
    "scripts/build_manifest.py": "This script",
    "examples/example_run.py": "Worked example",
    "data/Kick_Detection.csv": "DataDRILL source data, 2337 rows, CC-BY-4.0",
    "data/PROVENANCE.json": "Data origin, DOI, licence",
    "model/kick_detector_35f.joblib": "The model artifact",
}


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    sys.path.insert(0, str(ROOT))
    from kickdet import KickDetector

    det = KickDetector.load(ROOT / "model" / "kick_detector_35f.joblib")

    files = []
    for p in sorted(ROOT.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(ROOT)
        if any(s in rel.parts for s in SKIP) or rel.name == "MANIFEST.json":
            continue
        key = rel.as_posix()
        files.append({
            "path": key,
            "bytes": p.stat().st_size,
            "sha256": sha256(p),
            "description": DESCRIBE.get(key, ""),
        })

    manifest = {
        "bundle": "kickdet",
        "version": "1.0.0",
        "generated_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "model": {
            "artifact": "model/kick_detector_35f.joblib",
            "n_features": len(det.feature_names),
            "alarm_threshold": det.threshold,
            "warmup": det.warmup,
            "seconds_per_sample": det.seconds_per_sample(),
            "feature_config": det.feature_config,
            "feature_names": det.feature_names,
        },
        "environment": {
            "python": platform.python_version(),
            "platform": platform.platform(),
            "packages": {m: __import__(m).__version__ for m in
                         ("numpy", "pandas", "sklearn", "joblib",
                          "catboost", "lightgbm")},
        },
        "data": {
            "file": "data/Kick_Detection.csv",
            "rows": 2337,
            "columns": 28,
            "note": "row 0 is a startup artifact and is excluded; the feature "
                    "builder additionally drops a 60-sample warm-up, leaving "
                    "2276 scored samples",
            "licence": "CC-BY-4.0",
        },
        "n_files": len(files),
        "total_bytes": sum(f["bytes"] for f in files),
        "files": files,
    }

    OUT.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT.parent)}")
    print(f"  {len(files)} files, {manifest['total_bytes'] / 1024:.1f} KB total")
    print(f"  model: {len(det.feature_names)} features, threshold {det.threshold}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
