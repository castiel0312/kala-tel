"""Generate the demo WCR PDF that Document Intelligence renders.

The API returns extraction fields for W-067_WCR_2019.pdf page 47 with `bbox.lineTops`
in PDF user space. This script writes a 112-page report whose page 47 narrative sits on
exactly those baselines, so the highlight overlay in the viewer lands on the real text
instead of approximately near it.

    python3 tools/make_demo_wcr.py
"""

import json
import pathlib

from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "docs" / "W-067_WCR_2019.pdf"

W, H = A4
BODY = "DejaVuSans"
BODY_B = "DejaVuSans-Bold"
MONO = "DejaVuSansMono"

# Page 47 content, verbatim from the API's pageText so the demo cannot drift from it.
NARRATIVE = [
    "Well W-067 was drilling the 8½-in hole below the",
    "9⅝-in shoe with KCl-polymer mud at 1.38 g/cm³.",
    "At 3,061 m MD (3,021 m TVDSS), 17 m into the",
    "Barail, partial losses of 45 bbl/hr were observed.",
    "Cuttings showed fractured, coarse-grained sand.",
    "Flow rate was reduced by 10% and a 40 ppb LCM",
    "pill was spotted across the loss zone.",
    "Losses cured after 3.5 hrs; total mud lost 12 m³.",
    "Drilling resumed at 13.1 m/hr.",
]

FIRST_BASELINE = 122.0
LEADING = 21.0
PAGE_NO = 47
PAGES = 112

INK = (0.04, 0.04, 0.04)
GREY = (0.45, 0.45, 0.45)
RULE = (0.72, 0.72, 0.68)
YELLOW = (0.95, 0.76, 0.0)


def register_fonts() -> None:
    import matplotlib

    ttf = pathlib.Path(matplotlib.__file__).parent / "mpl-data" / "fonts" / "ttf"
    pdfmetrics.registerFont(TTFont(BODY, str(ttf / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont(BODY_B, str(ttf / "DejaVuSans-Bold.ttf")))
    pdfmetrics.registerFont(TTFont(MONO, str(ttf / "DejaVuSansMono.ttf")))


def header(c: canvas.Canvas, page: int) -> None:
    """The masthead a 2019 WCR actually has: well, hole section, report identity."""
    c.setFillColorRGB(*INK)
    c.setFont(BODY_B, 13)
    c.drawString(56, H - 58, "OIL INDIA LIMITED")
    c.setFont(BODY, 8.5)
    c.setFillColorRGB(*GREY)
    c.drawString(56, H - 71, "GEOSCIENCE & DRILLING · ASSAM ASSET · WELL COMPLETION REPORT")
    c.setStrokeColorRGB(*INK)
    c.setLineWidth(1.1)
    c.line(56, H - 80, W - 56, H - 80)

    c.setFont(BODY_B, 10)
    c.setFillColorRGB(*INK)
    c.drawString(56, H - 98, "WELL W-067")
    c.setFont(BODY, 8.5)
    c.setFillColorRGB(*GREY)
    c.drawString(56, H - 111, "SITE: MAKUM · SPUD 12 MAR 2018 · TD 3,420 m MD · COMPLETION 04 NOV 2019")
    c.drawString(56, H - 123, "SECTION 8½ in · KCl-POLYMER 1.38 g/cm³ · TVDSS 3,380 m")

    c.setFont(MONO, 8)
    c.setFillColorRGB(*GREY)
    c.drawRightString(W - 56, H - 98, f"PAGE {page} OF {PAGES}")
    c.drawRightString(W - 56, H - 110, "DOC REF: AOC/WCR/2019/067")
    c.drawString(56, 44, "Demo document generated for the NWIS build kit. Not an Oil India record.")
    c.drawRightString(W - 56, 44, f"p.{page}")
    c.setStrokeColorRGB(*RULE)
    c.setLineWidth(0.6)
    c.line(56, 56, W - 56, 56)


def generic_page(c: canvas.Canvas, page: int) -> None:
    header(c, page)
    c.setFont(BODY_B, 10.5)
    c.setFillColorRGB(*INK)
    c.drawString(56, H - 150, f"{page}.1 DAILY DRILLING OPERATIONS")
    y = H - 172
    rows = [
        ("DEPTH AT MIDNIGHT", f"{2800 + (page % 9) * 60} m MD"),
        ("ROP, 24 h average", f"{11.4 + (page % 5) * 0.6:.1f} m/h"),
        ("MUD IN / OUT", f"{1.38:.2f} / 1.39 g/cm³"),
        ("RETURNS", "Stable, no losses"),
        ("BIT NO.", f"{1 + page % 3}"),
        ("HIGHLIGHT", "Barail mudstone at 3,061 m MD (17 m into the Barail)"),
    ]
    for k, v in rows:
        c.setFont(BODY_B, 8)
        c.setFillColorRGB(*GREY)
        c.drawString(56, y, k)
        c.setFont(MONO, 9)
        c.setFillColorRGB(*INK)
        c.drawString(220, y, v)
        c.setStrokeColorRGB(*RULE)
        c.setLineWidth(0.4)
        c.line(56, y - 5, W - 56, y - 5)
        y -= 20

    c.setFont(BODY, 9.5)
    c.setFillColorRGB(*INK)
    for i in range(6):
        c.drawString(
            56,
            y - 14 - i * 15,
            "Drilling proceeded in the 8½-in hole with the BHA unchanged and returns steady through the",
        )
    c.drawString(56, y - 14 - 5 * 15, "Barail sandstone; no mechanical problems were reported on this shift.")


def narrative_page(c: canvas.Canvas, page: int) -> None:
    """Page 47. Baselines are pinned to the API's bbox.lineTops so highlights line up."""
    header(c, PAGE_NO)

    c.setFont(BODY_B, 10.5)
    c.setFillColorRGB(*INK)
    c.drawString(56, 660, "47.3  MUD LOSS — BARAIL SANDSTONE (17 m BELOW TOP)")
    c.setFont(BODY, 8.5)
    c.setFillColorRGB(*GREY)
    c.drawString(56, 648, "Reported by: Driller · Reviewed by: Petrophysicist · Logged 04 NOV 2019")

    c.setStrokeColorRGB(*RULE)
    c.setLineWidth(0.6)
    c.line(56, 640, W - 56, 640)

    c.setFont(BODY, 10)
    c.setFillColorRGB(*INK)
    for i, line in enumerate(NARRATIVE):
        c.drawString(56, FIRST_BASELINE + i * LEADING, line)

    # A depth strip beside the narrative, drawn to the same scale as the narrative block.
    top, bottom = 100, 320
    c.setStrokeColorRGB(*RULE)
    c.setLineWidth(0.6)
    c.line(430, bottom, 430, top)
    for md in range(3000, 3201, 50):
        y = bottom + ((md - 3000) / 200.0) * (top - bottom)
        c.line(430, y, 437, y)
        c.setFont(MONO, 7.5)
        c.setFillColorRGB(*GREY)
        c.drawRightString(426, y - 2, f"{md:,}")
    c.setFillColorRGB(*INK)
    c.setFont(BODY_B, 8)
    c.drawString(444, top - 4, "DEPTH m MD")
    c.setFillColorRGB(*YELLOW)
    c.rect(444, bottom + ((3061 - 3000) / 200.0) * (top - bottom) - 3, 92, 6, stroke=0, fill=1)
    c.setFillColorRGB(*INK)
    c.setFont(BODY, 8)
    c.drawString(444, bottom + ((3061 - 3000) / 200.0) * (top - bottom) - 16, "loss zone, 3,061 m MD")

    c.setFont(BODY_B, 9)
    c.setFillColorRGB(*INK)
    c.drawString(56, 88, "REMEDIAL ACTION")
    c.setFont(BODY, 9)
    y = 74
    for line in (
        "LCM pill mixed at 40 ppb and spotted across the loss zone; flow rate reduced by 10 %.",
        "Losses cured after 3.5 hours. Total mud lost 12 m³. Drilling resumed at 13.1 m/h.",
        "Cuttings confirmed fractured, coarse-grained Barail sandstone; no change to programme.",
    ):
        c.drawString(56, y, line)
        y -= 14


def build() -> None:
    register_fonts()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=A4)
    c.setTitle("W-067 Well Completion Report 2019")
    c.setAuthor("Oil India Limited (demo document)")
    c.setSubject("Demo WCR for the NWIS build kit, page 47 extraction fixture")
    for page in range(1, PAGES + 1):
        if page == PAGE_NO:
            narrative_page(c, page)
        else:
            generic_page(c, page)
        c.showPage()
    c.save()
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} kB, {PAGES} pages, page {PAGE_NO} aligned)")


if __name__ == "__main__":
    build()
