from fastapi import APIRouter
from typing import List
from app.models.schemas import PredictionRequest, TaskCompletionPrediction
from app.services.prediction_service import PredictionService

router = APIRouter()
prediction_service = PredictionService()


@router.post("/task-completion", response_model=List[TaskCompletionPrediction])
async def predict_task_completion(request: PredictionRequest):
    """
    Prediz quando as tarefas pendentes serão concluídas
    """
    predictions = prediction_service.predict_task_completion(
        tasks=request.tasks, historical_data=request.historicalData
    )
    return predictions
