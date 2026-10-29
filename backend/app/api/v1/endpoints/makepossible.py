from fastapi import APIRouter
from app.schemas.makepossible import (
    MakePossibleEvaluationRequest,
    MakePossibleEvaluationResult,
)
from app.services.makepossible import evaluate_feasibility

router = APIRouter(prefix="/makepossible", tags=["MakePossible Feasibility Engine"])


@router.post(
    "/evaluate",
    response_model=MakePossibleEvaluationResult,
    summary="Evaluate custom-request feasibility against recorded collective capability",
)
async def evaluate_custom_request_feasibility(payload: MakePossibleEvaluationRequest):
    """
    MakePossible Feasibility Engine:
    - Evaluates custom requests against verified craft skills, inventory availability,
      material freshness timestamps, active collective workload, and delivery deadlines.
    - Deterministic code logic outputs structured assessment:
      { status: 'feasible' | 'uncertain' | 'not_feasible', evidence, missing_info, constraints, suggested_changes }.
    - AI Honesty Rule: Unknown or unrecorded operational data yields 'uncertain', NEVER 'feasible'.
    """
    return evaluate_feasibility(payload)
