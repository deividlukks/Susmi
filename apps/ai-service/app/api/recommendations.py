from fastapi import APIRouter
from typing import List
from app.models.schemas import RecommendationRequest, Recommendation
from app.services.recommendation_service import RecommendationService

router = APIRouter()
recommendation_service = RecommendationService()


@router.post("/generate", response_model=List[Recommendation])
async def generate_recommendations(request: RecommendationRequest):
    """
    Gera recomendações inteligentes baseadas nas tarefas e eventos do usuário
    """
    recommendations = recommendation_service.generate_recommendations(
        tasks=request.tasks, events=request.events
    )
    return recommendations
