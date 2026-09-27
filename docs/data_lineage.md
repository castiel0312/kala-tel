# NWIS Data Lineage

Every value that ends up in `data/processed/` must be traceable back to its origin. The chain is:

```
Well → Event/Record → Source Document → Page (if applicable) → Raw File → Download Log Entry
```

## How lineage is captured at each stage

1. **Download (Hour 4):** `scripts/ingest/download_sources.sh` appends one row per file to
   `data/raw/download_log.csv` (direct HTTPS sources) with: source, well, url, file_name,
   file_type, download_date, checksum. GitHub sources are logged separately to
   `data/raw/git_clone_log.csv` (source, url, clone_path, clone_date), since a repo clone isn't
   a single-file checksum event. Kaggle/Hugging Face pulls (Tier 3, auth-required) should be
   logged manually to the same `download_log.csv` after the fact if used.
2. **Inspection (Hour 5):** `scripts/ingest/inspect_source.py` profiles raw files without
   modifying them — read-only pass, no lineage impact.
3. **Normalization (Hour 6-7):** any script in `scripts/normalize/` that writes to
   `data/processed/*.csv` must populate the `source` (and where relevant `source_document`,
   `source_page`) columns defined in the canonical schemas — see `docs/data_dictionary.md`
   and the eight processed-table schemas in `data/processed/`.
4. **Documents table:** `data/processed/documents.csv` is the join point between a
   `document_id` and its `file_path`, `checksum`, `url`, and `download_date` — this is what
   lets an engineer click from an event back to the exact scanned page it came from.

## Non-negotiable rule

If a value's source cannot be identified with confidence, it is **not written** to
`data/processed/`. A missing value is preferable to an unattributed one — see the
"Broken provenance" check in `scripts/validate/dataset_validation.py`.
