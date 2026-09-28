# NWIS build kit (SIH26121, Oil India)

Everything you need to go from the finished designs to a working product.

```
nwis-build-kit/
├─ 01-frontend-design-source/     The designed screens, as source
│   ├─ screens/*.dc.html          Landing + 13 app screens (layout, styles, interactions, demo data)
│   ├─ components/                Shared sidebar and page header
│   └─ tokens.css                 Colours, fonts, spacing (the light industrial theme)
├─ 02-api/
│   ├─ openapi.yaml               API contract: one endpoint per thing a screen needs
│   └─ demo-data.json             Every number shown on every screen, as one consistent dataset
├─ 03-backend-starter/            FastAPI server that already serves the whole API from the demo data
│   ├─ app/main.py                Handlers, each with a "# REAL:" note for the production version
│   ├─ tests/test_api.py          Contract tests (prints ALL OK)
│   └─ README.md                  How to run it
└─ 04-prompts/
    ├─ BACKEND_MASTER_PROMPT.md   Paste into Claude Code / Cursor to build the real backend (7 milestones)
    └─ FRONTEND_TO_REACT_PROMPT.md Paste to turn the designs into a React + TypeScript app on this API
```

## Suggested order
1. **Run the starter** (`03-backend-starter/README.md`). You now have a working API at `localhost:8000/docs`.
2. **Frontend team:** use `FRONTEND_TO_REACT_PROMPT.md` to build the React app against the starter, one screen at a time.
3. **Backend team:** at the same time, use `BACKEND_MASTER_PROMPT.md` to replace the starter's handlers with real ones (database, OCR pipeline, depth maths, risk engine, live feed, assistant). The contract tests stop either team from breaking the other.
4. **Demo:** set `NWIS_DEMO=1` (or keep the starter) so the pitch never depends on a GPU or live feed.

## About the design files
The `.dc.html` files are the screens exactly as designed on the canvas. They're HTML with inline styles and a small script block holding each screen's data and interactions. They're a precise reference for building the React app, not something to deploy as-is. The canvas itself also has Share › Export if you want images or PDFs of the screens for the presentation.

All data is **demo data**: invented, but internally consistent. Replace it with real WCR, DDR and eRTMAC data from Oil India.
