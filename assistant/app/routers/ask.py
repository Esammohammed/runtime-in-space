from fastapi import APIRouter, HTTPException

from app.schemas.assistant import AskIn, AskOut
from app.services import prompts, rag
from app.services.llm import LLMError, get_llm

router = APIRouter(tags=["ask"])


@router.post("/ask", response_model=AskOut)
def ask(request: AskIn):
    """Retrieve passages from the NASA documents, then answer from them.
    Earlier turns of the same conversation are passed through so the model
    can hold a multi-turn chat; they are not stored anywhere."""
    sources = rag.search(request.question)
    llm = get_llm()
    history = [message.model_dump() for message in request.history]
    try:
        answer = llm.complete(prompts.SYSTEM, prompts.ask_prompt(request.question, request.context, sources),
                              history=history)
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=f"Language model error: {exc}") from exc
    return AskOut(answer=answer, sources=sources, model=llm.name)
