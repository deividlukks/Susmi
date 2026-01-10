from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class TaskPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class TaskStatus(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class TaskData(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: TaskStatus
    priority: TaskPriority
    dueDate: Optional[datetime] = None
    completedAt: Optional[datetime] = None
    createdAt: datetime
    estimatedTime: Optional[int] = None
    actualTime: Optional[int] = None
    tags: List[str] = []


class EventData(BaseModel):
    id: str
    title: str
    startDate: datetime
    endDate: datetime
    type: str
    isAllDay: bool = False


class UserProductivityData(BaseModel):
    userId: str
    tasks: List[TaskData]
    events: List[EventData]
    period: Dict[str, datetime]


class RecommendationRequest(BaseModel):
    userId: str
    tasks: List[TaskData]
    events: List[EventData]


class Recommendation(BaseModel):
    type: str
    title: str
    description: str
    priority: str
    actionable: bool
    metadata: Optional[Dict[str, Any]] = None


class InsightRequest(BaseModel):
    userId: str
    data: UserProductivityData


class Insight(BaseModel):
    category: str
    title: str
    description: str
    value: Any
    trend: Optional[str] = None


class PredictionRequest(BaseModel):
    userId: str
    tasks: List[TaskData]
    historicalData: Optional[Dict[str, Any]] = None


class TaskCompletionPrediction(BaseModel):
    taskId: str
    predictedCompletionDate: datetime
    confidence: float
    estimatedDuration: int
    factors: List[str]
