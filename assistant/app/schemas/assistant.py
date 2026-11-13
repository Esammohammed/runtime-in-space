from pydantic import BaseModel


class AskIn(BaseModel):
    question: str
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


class AnalyzeImageOut(BaseModel):
    description: str
    next_step: str
    model: str


class ReportIn(BaseModel):
    context: dict
    days: int = 7


class ReportOut(BaseModel):
    report: str
    model: str
