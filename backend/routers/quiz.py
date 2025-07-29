from fastapi import APIRouter, HTTPException
from backend.models.schemas import (
    QuizRequest,
    QuizResponse,
)
from backend.services.llm_service import evaluate_quiz_answer
from backend.services.supabase_service import supabase
import logging

router = APIRouter(prefix="/quiz", tags=["Quiz"])
logger = logging.getLogger("uvicorn.error")


@router.post("/evaluate", response_model=QuizResponse)
async def evaluate(request: QuizRequest):
    try:
        logger.info(f"[quiz] Evaluating answer for question: {request.question[:60]}...")
        feedback = await evaluate_quiz_answer(
            question=request.question,
            options=request.options,
            answer=request.answer,
        )
        return QuizResponse(feedback=feedback)
    except Exception as e:
        logger.exception("[quiz] Error during lesson quiz evaluation")
        raise HTTPException(status_code=500, detail=str(e))
