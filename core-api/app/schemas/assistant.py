from pydantic import BaseModel


class AskIn(BaseModel):
    crew_id: int
    question: str


class AnalyzeImageIn(BaseModel):
    crew_id: int
    image_base64: str
    mime_type: str = "image/jpeg"
    note: str = ""
