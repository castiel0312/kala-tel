# India-specific data stack for NWIS

Per the NWIS dossier (§3.4, §3.3): India's NDR is the **only Indian source**, access is
**restricted**, and it should be requested via institutional/college registration — this is not
a Day-1 blocker, it's the India-specific expansion source once the Volve/FORGE/FORCE2020 pipeline
is proven.

| Requirement | Indian source | What you can use |
|---|---|---|
| Nearby wells / well map | DGH National Data Repository (NDR) | Indian well locations, well/log data, spatial data |
| Drilling / geological / reservoir data | NDR Data Repository | Drilling, reservoir, geological and other E&P data |
| Indian basin information | DGH Hydrocarbon Outlook | Assam Shelf, Assam-Arakan, KG, Cambay, Rajasthan, Mumbai Offshore, Cauvery, etc. |
| Government datasets | India Open Government Data | Public ONGC/oil & gas datasets and production statistics |
| OIL-specific information | Oil India Limited | OIL wells, drilling activities, operational information and annual reports |

**Portal:** https://www.ndrdgh.gov.in/NDR/

## Before building anything against NDR

1. Confirm exactly what is publicly downloadable vs. what requires DGH registration approval
   (the dossier flags this as an open question — don't assume API-style bulk access exists).
2. If access is granted, run it through the same `scripts/ingest/inspect_source.py` profiling
   step as every other source before writing a normalizer — Indian well/log formats will very
   likely need their own field-name mapping additions to `docs/data_dictionary.md`
   (the dossier notes Assam formations use OIL's own naming conventions: Tipam, Barail, Girujan,
   etc., which won't match the Volve/FORGE/FORCE2020 formation dictionary).
3. Treat OIL/DGH data as the ground-truth target domain, and Volve/FORGE/FORCE2020 as the
   source domain for any transfer-learning approach (see the kick-detection Transfer Forest paper
   already reviewed) — the same source→target domain gap applies here at the basin level, not
   just the well level.
