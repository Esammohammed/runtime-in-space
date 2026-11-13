import json

from fastapi import APIRouter, HTTPException

from app.schemas.assistant import AnalyzeImageIn, AnalyzeImageOut
from app.services import prompts
from app.services.llm import LLMError, get_llm

router = APIRouter(tags=["image"])


@router.post("/analyze-image", response_model=AnalyzeImageOut)
def analyze_image(request: AnalyzeImageIn):
    """Describe a photo and suggest one next step. Needs a vision-capable model."""
    llm = get_llm()
    user = f"Note from the crew member: {request.note or 'none'}"
    try:
        raw = llm.complete(prompts.IMAGE_SYSTEM, user, image=(request.mime_type, request.image_base64))
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=f"Language model error: {exc}") from exc
    try:
        parsed = json.loads(raw.strip().removeprefix("```json").removesuffix("```").strip())
        description, next_step = parsed["description"], parsed["next_step"]
    except (json.JSONDecodeError, KeyError, TypeError):
        description, next_step = raw, "Show this to the crew medical officer."
    return AnalyzeImageOut(description=description, next_step=next_step, model=llm.name)
