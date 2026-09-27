#!/usr/bin/env python3
"""Extract the authoritative FORCE 2020 lithology penalty matrix from the source.

The FORCE 2020 competition did not score accuracy. It scored a geologically
motivated penalty matrix, and the competition's own code says so twice:

    lithology_competition/data/test_code.py
        A = np.load('penalty_matrix.npy')
        S -= A[y_true[i], y_pred[i]];  score = S / N

    lithology_competition/data/starter_notebook.ipynb
        markdown cell 48: "the value of the matrix A at row i and column j is
        the penalty given by guessing lithology number i when the correct label
        is lithology number j"
        code cell 49:    A = np.load('penalty_matrix.npy')

So a penalty score is only reportable against that exact matrix, and a
homemade substitute is worse than no number at all. This script makes the
authoritative matrix available to the repository without inventing it:

`penalty_matrix.npy` is NOT in the source tree -- it was distributed with the
competition archive, which this repository does not hold. The published values
*are* in the tree: the pinned starter notebook is a stored notebook, and the
output of its cell 50 (the bare expression `A`) is the 12x12 matrix, complete,
untruncated. This script reads those stored values verbatim, records exactly
where they came from, and refuses to proceed if anything about them is not
what the competition published.

Three properties are asserted rather than assumed, because each one silently
corrupts a penalty score if it is wrong:

  1. 12x12, finite, non-negative, zero on the diagonal. A matrix that is the
     wrong shape or has a non-zero diagonal cannot be the published one.
  2. The index order is the competition's own `lithology_numbers` (cell 31),
     which is NOT this repository's encoded target. A penalty score indexed by
     the wrong class order is a plausible-looking wrong number, so the mapping
     is extracted from the same notebook and stored alongside the matrix.
  3. The 12 codes in that mapping are exactly the 12 codes this repository
     already validated during source inspection, and the notebook's own name
     table (cell 12) agrees with it.

The scoring direction is taken from the source's code, not from its prose:
`A[y_true, y_pred]`. The notebook markdown describes the rows as the guess and
the columns as the truth, which is the transpose. The matrix is symmetric
(this script checks and records that), so the two conventions agree numerically
and the ambiguity is documented rather than resolved by assumption.

Deliberately NOT done here: any score, any model, any write under
data/processed/ or data/interim/. This script only records a constant.

Standard library only, for the same reason as the other ingest scripts: the base
install must not acquire a dependency it does not use.

Usage:
    python scripts/ingest/extract_force2020_penalty_matrix.py
    python scripts/ingest/extract_force2020_penalty_matrix.py --verify
    python scripts/ingest/extract_force2020_penalty_matrix.py --print-summary
"""
from __future__ import annotations

import argparse
import ast
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from inspect_force2020 import (  # noqa: E402
    DATA_SUBDIR,
    DEFAULT_SOURCE_ROOT,
    LITHOFACIES,
    REPO_URL,
    SOURCE_ID,
    SOURCE_NAME,
    ZENODO_DOI,
    file_facts,
    git_tree_index,
    resolved_commit,
)

MATRIX_ID = "force2020_lithology_penalty_matrix"
MATRIX_VERSION = "1"
OUT_JSON = REPO_ROOT / "ml" / "force2020_penalty_matrix.json"

NOTEBOOK_REL = f"{DATA_SUBDIR}/starter_notebook.ipynb"
SCORE_CELL = "test_code.py"

# Cell indices in the pinned notebook, 0-based, as committed.
NAMES_CELL_INDEX = 12
SCORE_MARKDOWN_CELL_INDEX = 48
LOAD_CELL_INDEX = 49
DISPLAY_CELL_INDEX = 50
MAPPING_CELL_INDEX = 31


# ---------------------------------------------------------------------------
# Reading the pinned notebook
# ---------------------------------------------------------------------------
def read_notebook(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))["cells"]


def cell_source(cells: list[dict], index: int) -> str:
    return "".join(cells[index].get("source", []))


def cell_output_text(cells: list[dict], index: int) -> str:
    outputs = cells[index].get("outputs", [])
    if not outputs:
        return ""
    return "".join(outputs[0].get("data", {}).get("text/plain", []))


def find_cell(cells: list[dict], needle: str, *, code: bool = True) -> int:
    """Index of the single cell whose source contains `needle`."""
    hits = [
        index
        for index, cell in enumerate(cells)
        if needle in "".join(cell.get("source", [])) and cell["cell_type"] == ("code" if code else "markdown")
    ]
    if len(hits) != 1:
        raise SystemExit(
            f"expected exactly one {'code' if code else 'markdown'} cell containing "
            f"{needle!r}, found {len(hits)}: {hits}. The notebook is not the one this "
            "script was written against; refusing to guess which cell is authoritative."
        )
    return hits[0]


def parse_literal_dict(source: str, name: str) -> dict:
    """Parse `name = {30000: 0, ...}` out of a notebook cell, stdlib only."""
    match = re.search(rf"^{re.escape(name)}\s*=\s*(\{{.*?\}})", source, re.DOTALL | re.MULTILINE)
    if match is None:
        raise SystemExit(f"cell does not define {name} = {{...}}")
    value = ast.literal_eval(match.group(1))
    if not isinstance(value, dict) or not value:
        raise SystemExit(f"{name} did not parse to a non-empty dict")
    return value


def parse_matrix(text: str) -> list[list[float]]:
    """Parse a stored `array([[...], ...])` repr into a list of float rows.

    `penalty_matrix.npy` is absent, so the values are recovered from the
    notebook's stored output. A truncated numpy repr contains an ellipsis, and a
    truncated matrix silently scores against the wrong numbers, so an ellipsis
    is a hard error rather than something to fill in.
    """
    stripped = text.strip()
    if not stripped.startswith("array(") or not stripped.endswith(")"):
        raise SystemExit(f"unexpected stored output shape: {stripped[:60]!r}")
    if "..." in stripped:
        raise SystemExit(
            "the stored output is truncated (numpy wrote an ellipsis). A partial "
            "matrix cannot be scored against; refusing to pad it."
        )
    rows = ast.literal_eval(stripped[len("array(") : -1])
    return [[float(cell) for cell in row] for row in rows]


# ---------------------------------------------------------------------------
# Assertions about the published matrix
# ---------------------------------------------------------------------------
def check_matrix(matrix: list[list[float]], codes: list[int]) -> None:
    if len(matrix) != len(codes) or any(len(row) != len(codes) for row in matrix):
        raise SystemExit(
            f"matrix is not {len(codes)}x{len(codes)}: "
            f"{len(matrix)} rows, row lengths {sorted({len(r) for r in matrix})}"
        )
    for i, row in enumerate(matrix):
        for j, value in enumerate(row):
            if not (value == value) or value in (float("inf"), float("-inf")):
                raise SystemExit(f"matrix[{i}][{j}] is not finite: {value}")
            if value < 0:
                raise SystemExit(f"matrix[{i}][{j}] is negative: {value}")
        if row[i] != 0.0:
            raise SystemExit(
                f"matrix diagonal is not zero at index {i} (code {codes[i]}): {row[i]}. "
                "The published matrix gives no penalty for a correct prediction."
            )


# ---------------------------------------------------------------------------
# The report
# ---------------------------------------------------------------------------
def build(source_root: Path) -> dict:
    notebook_path = source_root / NOTEBOOK_REL
    if not notebook_path.exists():
        raise SystemExit(f"pinned notebook is missing: {notebook_path}")

    commit = resolved_commit(source_root)
    tree = git_tree_index(source_root)
    facts = file_facts(notebook_path, source_root, tree)
    cells = read_notebook(notebook_path)

    # The cell indices above are asserted against the notebook's own text, so a
    # notebook that is not the one this script was written against fails loudly
    # instead of silently reading the wrong cell.
    for index, needle in (
        (NAMES_CELL_INDEX, "lithology_keys = {30000:"),
        (LOAD_CELL_INDEX, "A = np.load('penalty_matrix.npy')"),
        (DISPLAY_CELL_INDEX, "A"),
        (MAPPING_CELL_INDEX, "lithology_numbers = {30000:"),
    ):
        if needle not in cell_source(cells, index):
            raise SystemExit(
                f"notebook cell {index} does not contain {needle!r}. The pinned "
                "notebook differs from the one this script expects."
            )
    find_cell(cells, "the penalty function", code=False)
    find_cell(cells, "penalty_matrix.npy")

    execution_count = cells[DISPLAY_CELL_INDEX]["outputs"][0].get("execution_count")
    matrix = parse_matrix(cell_output_text(cells, DISPLAY_CELL_INDEX))

    numbers = parse_literal_dict(cell_source(cells, MAPPING_CELL_INDEX), "lithology_numbers")
    names = parse_literal_dict(cell_source(cells, NAMES_CELL_INDEX), "lithology_keys")
    codes = sorted(numbers)
    indices = sorted(numbers.values())
    if indices != list(range(len(indices))):
        raise SystemExit(f"competition index is not 0..n-1: {numbers}")
    check_matrix(matrix, codes)

    if codes != sorted(LITHOFACIES):
        raise SystemExit(
            "the notebook's class list differs from the 12 codes validated during "
            f"source inspection: {codes} vs {sorted(LITHOFACIES)}"
        )
    for code, class_name in names.items():
        if LITHOFACIES[int(code)] != class_name:
            raise SystemExit(
                f"notebook calls {code} {class_name!r}, inspection recorded "
                f"{LITHOFACIES[int(code)]!r}"
            )

    symmetric = all(matrix[i][j] == matrix[j][i] for i in range(len(codes)) for j in range(len(codes)))
    off_diagonal = [matrix[i][j] for i in range(len(codes)) for j in range(len(codes)) if i != j]
    npy_present = (source_root / DATA_SUBDIR / "penalty_matrix.npy").exists()

    return {
        "matrix_id": MATRIX_ID,
        "matrix_version": MATRIX_VERSION,
        "status": "authoritative",
        "authority": {
            "is_authoritative": True,
            "is_homemade": False,
            "statement": (
                "These are the FORCE 2020 competition's published penalty values, read "
                "verbatim from the pinned source. They are not estimated, rounded, "
                "inferred or reconstructed by this project."
            ),
        },
        "source": {
            "source_id": SOURCE_ID,
            "source_name": SOURCE_NAME,
            "repository": REPO_URL,
            "archive_doi": ZENODO_DOI,
            "resolved_commit_sha": commit,
            "notebook_path": facts["path"],
            "notebook_git_blob_oid": facts["git_blob_oid"],
            "notebook_size_bytes": facts["size_bytes"],
        },
        "extraction": {
            "method": "read the pinned notebook's stored cell output; no value was typed in by hand",
            "npy_file_in_checkout": npy_present,
            "npy_file_note": (
                "penalty_matrix.npy is not in the pinned checkout, so it could not be "
                "loaded directly. Its published values are present in the same "
                "repository as the stored output of the notebook cell that printed it, "
                "and that is what is recorded here."
            )
            if not npy_present
            else "penalty_matrix.npy is in the checkout and is the upstream of these values",
            "notebook_cell_indices_zero_based": {
                "class_names": NAMES_CELL_INDEX,
                "competition_index_to_code": MAPPING_CELL_INDEX,
                "score_formula_prose": SCORE_MARKDOWN_CELL_INDEX,
                "loads_the_npy": LOAD_CELL_INDEX,
                "prints_the_matrix": DISPLAY_CELL_INDEX,
            },
            "printed_matrix_cell_source": cell_source(cells, DISPLAY_CELL_INDEX).strip(),
            "printed_matrix_execution_count": execution_count,
            "notebook_truncated_output": False,
        },
        "scoring": {
            "formula": "S = -(1/N) * sum_i A[y_true_i, y_pred_i]",
            "source": f"{DATA_SUBDIR}/{SCORE_CELL}, the competition's own score()",
            "index_order": "row = true class, column = predicted class",
            "higher_is_better": True,
            "perfect_score": 0.0,
            "note": (
                "The score is the negated mean penalty, so a perfect prediction scores 0 "
                "and every wrong prediction lowers it. The notebook's prose describes the "
                "row as the guess and the column as the truth, which is the transpose of "
                "what the code does. The matrix is symmetric, so the two conventions give "
                "the same number; the code is treated as authoritative."
            ),
        },
        "index_order": {
            "warning": (
                "This index order is the COMPETITION's, not this repository's encoded "
                "target. Map to it through `encoded_to_competition_index` before indexing "
                "the matrix, or the score will be a plausible-looking wrong number."
            ),
            "competition_index_to_code": {str(numbers[code]): code for code in codes},
            "code_to_competition_index": {str(code): numbers[code] for code in codes},
            "code_to_class_name": {str(code): LITHOFACIES[code] for code in codes},
        },
        "shape": [len(matrix), len(matrix[0])],
        "properties": {
            "symmetric": symmetric,
            "diagonal_is_zero": True,
            "min_off_diagonal": min(off_diagonal),
            "max_off_diagonal": max(off_diagonal),
            "distinct_off_diagonal_values": sorted({v for v in off_diagonal}),
        },
        "matrix": matrix,
    }


def encoded_to_competition_index(report: dict, encoded_to_code: dict[int, int]) -> dict[int, int]:
    """Map this repository's encoded ids onto the matrix's index order."""
    code_to_index = {int(k): int(v) for k, v in report["index_order"]["code_to_competition_index"].items()}
    return {encoded_id: code_to_index[code] for encoded_id, code in sorted(encoded_to_code.items())}


def dump_json(report: dict) -> str:
    return json.dumps(report, indent=2, ensure_ascii=True) + "\n"


def summarise(report: dict) -> None:
    source = report["source"]
    properties = report["properties"]
    print("FORCE 2020 penalty matrix")
    print(f"  matrix id        : {report['matrix_id']} v{report['matrix_version']}")
    print(f"  status           : {report['status']} (homemade: {report['authority']['is_homemade']})")
    print(f"  pinned commit    : {source['resolved_commit_sha']}")
    print(f"  notebook blob    : {source['notebook_git_blob_oid']} ({source['notebook_path']})")
    print(f"  shape            : {report['shape'][0]}x{report['shape'][1]}")
    print(f"  symmetric        : {properties['symmetric']}")
    print(f"  off-diagonal     : {properties['min_off_diagonal']} .. {properties['max_off_diagonal']}")
    print(f"  score            : {report['scoring']['formula']}")
    print(f"  npy in checkout  : {report['extraction']['npy_file_in_checkout']}")


def verify(path: Path, expected: dict) -> int:
    if not path.exists():
        print(f"  {path.name}: MISSING {path}")
        return 1
    actual = json.loads(path.read_text(encoding="utf-8"))
    if actual == expected:
        print(f"  {path.name}: MATCH")
        return 0
    print(f"  {path.name}: MISMATCH {path}")
    for key in sorted(set(actual) | set(expected)):
        if actual.get(key) != expected.get(key):
            print(f"    field {key!r} differs")
            if key == "matrix":
                for i, (want, got) in enumerate(zip(expected[key], actual.get(key, []), strict=False)):
                    if want != got:
                        print(f"      row {i}: expected {want}")
                        print(f"      row {i}: on disk  {got}")
                        break
    return 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--source-root",
        default=str(DEFAULT_SOURCE_ROOT),
        help="FORCE 2020 checkout to read; nothing is downloaded",
    )
    parser.add_argument("--json", default=str(OUT_JSON), help="committed matrix record to write")
    parser.add_argument(
        "--verify", action="store_true", help="re-read the source and diff against the committed record"
    )
    parser.add_argument("--print-summary", action="store_true")
    args = parser.parse_args(argv)

    report = build(Path(args.source_root))
    out = Path(args.json)
    if args.verify:
        print(f"Verifying the penalty matrix against the pinned source:\n  commit {report['source']['resolved_commit_sha']}")
        return verify(out, report)

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(dump_json(report), encoding="utf-8")
    print(f"Wrote {out.relative_to(REPO_ROOT).as_posix()}")
    if args.print_summary:
        summarise(report)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
