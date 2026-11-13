from fastapi import APIRouter, HTTPException

from app.schemas.assistant import ReportIn, ReportOut
from app.services import prompts
from app.services.llm import LLMError, get_llm

router = APIRouter(tags=["report"])


@router.post("/report", response_model=ReportOut)
def report(request: ReportIn):
    """Summarise one crew member's recent data for flight surgeons."""
    llm = get_llm()
    try:
        text = llm.complete(prompts.REPORT_SYSTEM, prompts.report_prompt(request.context, request.days))
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=f"Language model error: {exc}") from exc
    return ReportOut(report=text, model=llm.name)
