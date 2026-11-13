import base64
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, Response

from app.core.config import get_settings
from app.schemas.assistant import AnalyzeImageIn, AnalyzeImageOut, PhotoReportIn
from app.services import photo_report, prompts, skin_classifier
from app.services.llm import LLMError, get_llm

router = APIRouter(tags=["image"])

VALID_URGENCY = {"watch", "show_officer", "alert_ground"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}


@router.get("/sample-images")
def list_sample_images() -> list[str]:
    """Filenames of whatever demo photos have been dropped in content/sample-images."""
    folder = get_settings().content_dir / "sample-images"
    if not folder.exists():
        return []
    return sorted(p.name for p in folder.iterdir() if p.suffix.lower() in IMAGE_EXTENSIONS)


@router.get("/sample-images/{name}")
def get_sample_image(name: str):
    folder = (get_settings().content_dir / "sample-images").resolve()
    path = (folder / name).resolve()
    if path.parent != folder or not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
        raise HTTPException(status_code=404, detail="Sample image not found")
    return FileResponse(path)


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
        urgency = parsed.get("urgency")
        if urgency not in VALID_URGENCY:
            urgency = "show_officer"
    except (json.JSONDecodeError, KeyError, TypeError):
        description, next_step, urgency = raw, "Show this to the crew medical officer.", "show_officer"
    try:
        skin_model = skin_classifier.classify(base64.b64decode(request.image_base64))
    except Exception:  # malformed base64, e.g. -- classify() handles decode-able-but-bad images itself
        skin_model = None
    return AnalyzeImageOut(description=description, next_step=next_step, urgency=urgency, model=llm.name,
                            skin_model=skin_model)


@router.post("/analyze-image/report")
def analyze_image_report(request: PhotoReportIn):
    """PDF version of an analysis the caller already has -- does not call the
    LLM or the skin classifier again, just lays the given result out on a page."""
    try:
        image_bytes = base64.b64decode(request.image_base64)
    except Exception:
        image_bytes = None
    pdf_bytes = photo_report.build_pdf(request.analysis, request.note, image_bytes, request.crew_name)
    return Response(content=pdf_bytes, media_type="application/pdf",
                     headers={"Content-Disposition": "attachment; filename=photo-check-report.pdf"})
