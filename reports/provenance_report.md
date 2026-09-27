# Provenance Report: nwis-forge16b-v0.2

- **Generated:** 2026-09-26T13:02:58Z
- **Conversion rules:** `1.1.0`
- **All populated rows are:** `PUBLIC_REAL`

## Document corpus

- Documents resolved: **219**
- With checksum recorded: **219** (100.0%)
- With local file path: **219** (100.0%)
- With public URL: **219** (100.0%)
- Document types: {'DDR': 215, 'ALT': 4}
- Licences: {'CC-BY-4.0': 219}

## Event traceability

- Events: **44**
- Linked to a source document: **44**
- Linked to a source page: **44**

## Depth-indexed mud temperature

- Rows: **457,104**
- MD range: 315.2 - 3336.3 m
- Source LAS files: 54

Each row retains its originating LAS file and the file's declared
null code, so a value can be traced back to the exact log.

## Governance rules applied

- No value is invented to fill a gap.
- No irreversible unit conversion: original value and unit are kept.
- Interpolated depth is always flagged, never presented as measured.
- Empty source documents were not converted into empty-table records.
