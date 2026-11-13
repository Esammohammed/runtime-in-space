from typing import Literal

from pydantic import BaseModel


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AskIn(BaseModel):
    crew_id: int
    question: str
    history: list[Message] = []


class AnalyzeImageIn(BaseModel):
    crew_id: int
    image_base64: str
    mime_type: str = "image/jpeg"
    note: str = ""


class PhotoReportIn(BaseModel):
    crew_id: int
    image_base64: str
    mime_type: str = "image/jpeg"
    note: str = ""
    analysis: dict
