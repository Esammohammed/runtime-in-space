"""Builds a one-page PDF for a photo-check result. Presentation only: lays out
values it's given, never re-runs the vision LLM or the skin classifier and
never changes a number or a word they produced."""
import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Image as ReportImage
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.schemas.assistant import AnalyzeImageOut

NAVY = colors.HexColor("#15324B")
BODY_TEXT = colors.HexColor("#25313C")
ACCENT = colors.HexColor("#2477A8")
MUTED = colors.HexColor("#657482")
LINE = colors.HexColor("#D8E1E8")

URGENCY_COLORS = {
    "watch": colors.HexColor("#2D7D5B"),
    "show_officer": colors.HexColor("#B36A12"),
    "alert_ground": colors.HexColor("#A83B42"),
}
URGENCY_LABELS = {
    "watch": "Keep watching",
    "show_officer": "Show the crew medical officer",
    "alert_ground": "Send to flight surgeons",
}

BAR_WIDTH = 85 * mm


def _styles() -> dict[str, ParagraphStyle]:
    sample = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("RisTitle", parent=sample["Title"], fontName="Helvetica-Bold",
                                 fontSize=19, leading=23, textColor=NAVY, spaceAfter=0),
        "h2": ParagraphStyle("RisH2", parent=sample["Heading2"], fontName="Helvetica-Bold",
                              fontSize=12, leading=15, textColor=NAVY, spaceBefore=10, spaceAfter=4),
        "body": ParagraphStyle("RisBody", parent=sample["Normal"], fontName="Helvetica",
                                fontSize=10, leading=14, textColor=BODY_TEXT),
        "muted": ParagraphStyle("RisMuted", parent=sample["Normal"], fontName="Helvetica",
                                 fontSize=8.5, leading=12, textColor=MUTED),
    }


def _confidence_row(label: str, confidence: float, styles: dict) -> Table:
    filled_width = max(2, round(BAR_WIDTH * max(0.0, min(1.0, confidence))))
    bar = Table([[""]], colWidths=[filled_width], rowHeights=[4 * mm])
    bar.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), ACCENT)]))
    track = Table([[bar]], colWidths=[BAR_WIDTH], rowHeights=[4 * mm])
    track.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), LINE),
                                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                                ("TOPPADDING", (0, 0), (-1, -1), 0),
                                ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    row = Table([[Paragraph(label, styles["body"]), track, Paragraph(f"{confidence:.0%}", styles["body"])]],
                colWidths=[55 * mm, BAR_WIDTH, 15 * mm])
    row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (2, 0), (2, 0), "RIGHT")]))
    return row


def build_pdf(result: AnalyzeImageOut, note: str, image_bytes: bytes | None, crew_name: str) -> bytes:
    styles = _styles()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                             topMargin=16 * mm, bottomMargin=16 * mm)
    story = [Paragraph("Runtime in Space -- Photo check report", styles["title"])]
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    story.append(Paragraph(f"Crew: {crew_name or 'Unknown'} &nbsp;&middot;&nbsp; Generated {generated}",
                            styles["muted"]))
    story.append(Spacer(1, 6 * mm))

    if image_bytes:
        try:
            width, height = ImageReader(io.BytesIO(image_bytes)).getSize()
            display_width = 70 * mm
            story.append(ReportImage(io.BytesIO(image_bytes), width=display_width,
                                      height=display_width * height / width))
            story.append(Spacer(1, 4 * mm))
        except Exception:  # not a decodable image -- the report still has the rest
            pass

    if note:
        story.append(Paragraph("Note from the crew member", styles["h2"]))
        story.append(Paragraph(note, styles["body"]))

    story.append(Paragraph("Assistant finding", styles["h2"]))
    story.append(Paragraph(result.description, styles["body"]))
    story.append(Paragraph(f"<b>Next step:</b> {result.next_step}", styles["body"]))
    urgency_style = ParagraphStyle("RisUrgency", parent=styles["body"],
                                    textColor=URGENCY_COLORS.get(result.urgency, MUTED), fontName="Helvetica-Bold")
    story.append(Paragraph(f"Urgency: {URGENCY_LABELS.get(result.urgency, result.urgency)}", urgency_style))
    story.append(Paragraph(f"Model: {result.model}", styles["muted"]))

    if result.skin_model:
        story.append(Paragraph("Skin model (experimental)", styles["h2"]))
        for prediction in result.skin_model.top3:
            story.append(_confidence_row(prediction.label, prediction.confidence, styles))
            story.append(Spacer(1, 1.5 * mm))
        story.append(Spacer(1, 1.5 * mm))
        story.append(Paragraph(result.skin_model.disclaimer, styles["muted"]))

    doc.build(story)
    return buffer.getvalue()
