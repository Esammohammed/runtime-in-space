from fastapi import APIRouter, HTTPException

from app.schemas.assistant import AskIn, AskOut
from app.services import prompts, rag
from app.services.llm import LLMError, get_llm

router = APIRouter(tags=["ask"])


@router.post("/ask", response_model=AskOut)
def ask(request: AskIn):
    """Retrieve passages from the NASA documents, then answer from them."""
    sources = rag.search(request.question)
    llm = get_llm()
    try:
        answer = llm.complete(prompts.SYSTEM, prompts.ask_prompt(request.question, request.context, sources))
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=f"Language model error: {exc}") from exc
    return AskOut(answer=answer, sources=sources, model=llm.name)
