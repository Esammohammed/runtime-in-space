from typing import Literal

from pydantic import BaseModel

Urgency = Literal["watch", "show_officer", "alert_ground"]


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AskIn(BaseModel):
    question: str
    history: list[Message] = []
    context: dict = {}


class Source(BaseModel):
    title: str
    snippet: str


class AskOut(BaseModel):
    answer: str
    sources: list[Source]
    model: str


class AnalyzeImageIn(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"
    note: str = ""


class SkinClassPrediction(BaseModel):
    label: str
    confidence: float


class SkinClassification(BaseModel):
    """Output of the local, vendored skin-condition classifier -- see
    app/services/skin_classifier.py. Independent of the vision LLM above:
    real numbers from a real (if experimental) model, never invented."""
    label: str
    confidence: float
    top3: list[SkinClassPrediction]
    disclaimer: str


class AnalyzeImageOut(BaseModel):
    description: str
    next_step: str
    urgency: Urgency
    model: str
    skin_model: SkinClassification | None = None


class PhotoReportIn(BaseModel):
    """Builds a PDF for an analysis the caller already has -- never re-runs the
    vision LLM or the skin classifier, just lays the given result out on a page."""
    image_base64: str
    mime_type: str = "image/jpeg"
    note: str = ""
    crew_name: str = ""
    analysis: AnalyzeImageOut


class ReportIn(BaseModel):
    context: dict
    days: int = 7


class ReportOut(BaseModel):
    report: str
    model: str
