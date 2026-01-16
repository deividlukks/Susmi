from fastapi import APIRouter
from typing import List
from app.models.schemas import InsightRequest, Insight
from app.services.insight_service import InsightService

router = APIRouter()
insight_service = InsightService()


@router.post("/generate", response_model=List[Insight])
async def generate_insights(request: InsightRequest):
    """
    Gera insights sobre a produtividade do usuário
    """
    insights = insight_service.generate_insights(data=request.data)
    return insights
