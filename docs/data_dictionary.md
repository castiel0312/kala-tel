# NWIS Data Dictionary — Canonical Field Mapping

This maps every source-specific field name to its canonical NWIS name, unit,
and required transformation. Nothing enters `data/processed/` under a
non-canonical name.

| NWIS field     | Example source field(s)                  | Unit           | Transformation           |
|----------------|-------------------------------------------|----------------|--------------------------|
| `md`           | MD, Measure depth, HoleDepth              | m              | convert to m             |
| `tvd`          | TVD, True vertical depth                  | m              | convert to m             |
| `tvdss`        | TVDSS                                     | m              | tvd − datum elevation    |
| `rop`          | ROP, ROP_AVG, Average rate of penetration | m/hr           | convert from ft/hr if needed |
| `wob`          | WOB, Average weight on bit                | kN             | normalize (klbf → kN)    |
| `rpm`          | RPM, Rotary RPM, DSR                      | rpm            | none                     |
| `torque`       | Torque, TORQUE, Tor                       | kN·m           | normalize (klbf.ft → kN·m) |
| `flow_in`      | Inlet flow, Flow in, Q                    | L/min          | convert (gpm/L/s → L/min)|
| `flow_out`     | Outlet flow, Flow out                     | L/min          | convert                  |
| `standpipe_pressure` | SPP, Standpipe pressure, P_STANDPIPE | MPa            | convert (psi/bar → MPa)  |
| `hookload`     | HL, Hook weight, Hook load                | kN             | convert (klbf → kN)      |
| `mud_weight`   | MW, Mud weight, drilling fluid equivalent density | g/cm³ (SG) | convert (ppg → SG: SG = ppg ÷ 8.345) |
| `ecd`          | ECD                                        | g/cm³ (SG)     | convert                  |
| `pit_volume`   | total pit volume, Pit gain/loss           | m³             | convert                  |
| `formation`    | Formation, Formation_name, source lithostrat name | —      | map via formation alias dictionary |
| `lithology`    | Lithology, VCL, lithology_group           | —              | map to fixed lithology taxonomy |
| `timestamp`    | Time, Timestamp, Date                     | UTC ISO 8601   | convert to UTC           |
| `event_type`   | NPT code, activity code, free-text remark | fixed ontology | map to MUD_LOSS / STUCK_PIPE / KICK / OVERPRESSURE / TORQUE_SPIKE / WELLBORE_INSTABILITY / CEMENT_FAILURE / NPT |

## Rules

- **Units**: store SI internally; always retain the original value + unit string alongside the converted one (provenance).
- **Sentinel values**: reject `-999.25`, `-999.99`, and other known sentinel/null codes before any statistics are computed.
- **Formation names**: match OCR/free-text formation mentions only against the alias dictionary (`docs/formation_aliases.md`, to be built in a later step) with a small edit-distance tolerance — never invent a formation from noisy text.
- **No fabrication**: if a source doesn't report a field (e.g., BSEE has no real-time drilling params), leave it null in `drilling_timeseries.csv` — do not impute at ingestion time.
- **Depth types stay separate**: `md`, `tvd`, `tvdss` are three different columns, never collapsed into one generic `depth`.

## Per-source field coverage (fill in during Hour 5 inspection)

| Field group | Volve | Utah FORGE | FORCE 2020 | BSEE | NLOG |
|---|---|---|---|---|---|
| Trajectory (MD/TVD/survey) | ✓ | ✓ | ✓ (per-sample x,y,z) | partial | ✓ |
| Formation tops | ✓ (409 picks) | lithology only | ✓ | — | ✓ |
| Real-time drilling params | ✓ (WITSML) | ✓ (Pason 1s/10s) | ROP only | — | — |
| Narrative reports (DDR/WCR) | ✓ (1,759 DDR XML) | ✓ (daily reports) | — | — | ✓ (scanned, older wells) |
| Well metadata | ✓ | ✓ | ✓ | ✓ (~57,500 records) | ✓ |

*(Update this table as each source is actually profiled in Hour 5 — do not assume coverage before inspecting.)*
